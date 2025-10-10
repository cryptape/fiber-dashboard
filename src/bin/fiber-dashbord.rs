use std::{sync::LazyLock, vec};

use fiber_dashbord_backend::{
    RpcClient, create_pg_pool, get_pg_pool, init_db,
    pg_write::{
        ChannelInfoDBSchema, channel_states_monitor, daily_statistics, from_rpc_to_db_schema,
        init_global_cache, insert_batch,
    },
    types::{GraphChannelsParams, GraphNodesParams},
};

use reqwest::Url;
use sqlx::{Row, types::chrono::Utc};

fn main() {
    env_logger::init();
    std::panic::set_hook(Box::new(|info| {
        log::error!("Panic occurred: {:?}", info);
        std::process::exit(1);
    }));

    let rt = tokio::runtime::Runtime::new().unwrap();

    rt.block_on(async move {
        create_pg_pool().await;
        let pool = get_pg_pool();
        init_db(pool).await;
        init_global_cache(pool).await;
        tokio::spawn(daily_commit());
        tokio::spawn(timed_commit_states());

        http_server().await;
    });
}

async fn http_server() {
    use fiber_dashbord_backend::http_server::{
        analysis, analysis_hourly, channel_by_state, channel_info, channel_state,
        list_channels_hourly, list_channels_monthly, list_nodes_hourly, list_nodes_monthly,
        node_info, node_udt_infos, nodes_by_udt,
    };
    use salvo::{
        Listener, Router, Server, Service, conn::TcpListener, cors::AllowOrigin, cors::Cors,
    };

    use salvo::http::Method;
    let cors = Cors::new()
        .allow_origin(AllowOrigin::any())
        .allow_headers(vec!["content-type", "accept", "authorization"])
        .allow_methods(vec![Method::GET, Method::POST, Method::OPTIONS])
        .into_handler();
    let router = Router::new()
        .push(Router::with_path("nodes_hourly").get(list_nodes_hourly))
        .push(Router::with_path("channels_hourly").get(list_channels_hourly))
        .push(Router::with_path("node_udt_infos").get(node_udt_infos))
        .push(Router::with_path("nodes_by_udt").post(nodes_by_udt))
        .push(Router::with_path("nodes_nearly_monthly").get(list_nodes_monthly))
        .push(Router::with_path("channels_nearly_monthly").get(list_channels_monthly))
        .push(Router::with_path("analysis_hourly").get(analysis_hourly))
        .push(Router::with_path("analysis").post(analysis))
        .push(Router::with_path("channel_state").get(channel_state))
        .push(Router::with_path("group_channel_by_state").get(channel_by_state))
        .push(Router::with_path("channel_info").get(channel_info))
        .push(Router::with_path("node_info").get(node_info));

    let service = Service::new(router).hoop(cors);
    let http_port = std::env::var("HTTP_PORT").unwrap_or("8000".to_string());
    let listener = TcpListener::new(format!("0.0.0.0:{}", http_port))
        .bind()
        .await;
    log::info!("Starting HTTP server on port {}", http_port);
    Server::new(listener).serve(service).await;
}

static MAINNET_FIBER_RPC_URL: LazyLock<Option<Url>> = LazyLock::new(|| {
    std::env::var("FIBER_MAINNET_RPC_URL")
        .map(|url| Url::parse(&url).unwrap())
        .ok()
});
static TESTNET_FIBER_RPC_URL: LazyLock<Option<Url>> = LazyLock::new(|| {
    std::env::var("FIBER_TESTNET_RPC_URL")
        .map(|url| Url::parse(&url).unwrap())
        .ok()
});

static NETS: LazyLock<Vec<fiber_dashbord_backend::Network>> = LazyLock::new(|| {
    MAINNET_FIBER_RPC_URL
        .as_ref()
        .map(|_| fiber_dashbord_backend::Network::Mainnet)
        .into_iter()
        .chain(
            TESTNET_FIBER_RPC_URL
                .as_ref()
                .map(|_| fiber_dashbord_backend::Network::Testnet),
        )
        .collect::<Vec<_>>()
});

async fn timed_commit_states() {
    let rpc = RpcClient::new();
    let (tx, rx) = tokio::sync::mpsc::channel(8);

    tokio::spawn(channel_states_monitor(rpc.clone(), rx));
    let (mut testnet_init, mut mainnet_init) = (false, false);
    loop {
        for net in NETS.iter() {
            let url = match net {
                fiber_dashbord_backend::Network::Mainnet => MAINNET_FIBER_RPC_URL.clone().unwrap(),
                fiber_dashbord_backend::Network::Testnet => TESTNET_FIBER_RPC_URL.clone().unwrap(),
            };

            let mut raw_nodes = Vec::new();
            let mut after_cursor = None;

            loop {
                if let Ok(nodes) = rpc
                    .get_node_graph(
                        url.clone(),
                        GraphNodesParams {
                            limit: None,
                            after: after_cursor.clone(),
                        },
                    )
                    .await
                {
                    let has_more = nodes.nodes.len() == 500;
                    raw_nodes.extend(nodes.nodes);

                    if !has_more {
                        break;
                    }

                    after_cursor = Some(nodes.last_cursor);
                } else {
                    log::warn!("Failed to get {:?}'s node graph", net);
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                }
            }

            let mut raw_channels = Vec::new();
            let mut after_cursor = None;

            loop {
                if let Ok(channels) = rpc
                    .get_channel_graph(
                        url.clone(),
                        GraphChannelsParams {
                            limit: None,
                            after: after_cursor.clone(),
                        },
                    )
                    .await
                {
                    let has_more = channels.channels.len() == 500;
                    raw_channels.extend(channels.channels);

                    if !has_more {
                        break;
                    }

                    after_cursor = Some(channels.last_cursor);
                } else {
                    log::warn!("Failed to get {:?}'s channel graph", net);
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                }
            }

            let mut node_schemas = Vec::with_capacity(raw_nodes.len());
            let mut udt_infos = Vec::new();
            let mut udt_dep_relations = Vec::new();
            let mut udt_node_relations = Vec::new();
            for node in raw_nodes {
                let (node_schema, udt_info, udt_dep_relation, udt_node_relation) =
                    from_rpc_to_db_schema(node, *net).await;
                node_schemas.push(node_schema);
                udt_infos.extend(udt_info);
                udt_dep_relations.extend(udt_dep_relation);
                udt_node_relations.extend(udt_node_relation);
            }

            let mut channel_schemas = Vec::with_capacity(raw_channels.len());
            tx.send((
                *net,
                raw_channels
                    .iter()
                    .map(|c| c.channel_outpoint.clone())
                    .collect::<Vec<_>>(),
            ))
            .await
            .expect("Failed to send channel outpoints to monitor");
            for channel in raw_channels {
                let channel_schema: ChannelInfoDBSchema = (channel, *net).into();
                channel_schemas.push(channel_schema);
            }

            log::info!(
                "{:?} Fetched {} nodes and {} channels",
                net,
                node_schemas.len(),
                channel_schemas.len()
            );

            let now = Utc::now();

            let pool = get_pg_pool();
            insert_batch(
                pool,
                &udt_infos,
                &udt_dep_relations,
                &udt_node_relations,
                &node_schemas,
                &channel_schemas,
                &now,
                *net,
            )
            .await
            .expect("Failed to insert batch");
            if match net {
                fiber_dashbord_backend::Network::Mainnet => !mainnet_init,
                fiber_dashbord_backend::Network::Testnet => !testnet_init,
            } {
                let sql = format!("SELECT COUNT(*) FROM {}", net.online_nodes_hourly());
                let count = sqlx::query(&sql)
                    .fetch_one(pool)
                    .await
                    .map(|row| row.get::<i64, _>(0))
                    .expect("Failed to count rows");
                if count == 0 {
                    let flush_nodes_sql = format!(
                        "CALL refresh_continuous_aggregate('{}', NULL, NULL)",
                        net.online_nodes_hourly()
                    );
                    let flush_channels_sql = format!(
                        "CALL refresh_continuous_aggregate('{}', NULL, NULL)",
                        net.online_channels_hourly()
                    );
                    sqlx::query(&flush_nodes_sql)
                        .execute(pool)
                        .await
                        .expect("Failed to refresh continuous aggregate");
                    sqlx::query(&flush_channels_sql)
                        .execute(pool)
                        .await
                        .expect("Failed to refresh continuous aggregate");
                }
                match net {
                    fiber_dashbord_backend::Network::Mainnet => mainnet_init = true,
                    fiber_dashbord_backend::Network::Testnet => testnet_init = true,
                }
            }
        }
        tokio::time::sleep(tokio::time::Duration::from_secs(60 * 30)).await;
    }
}

async fn daily_commit() {
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(60 * 60 * 4)).await;
        let pool = get_pg_pool();
        daily_statistics(
            pool,
            Some(Utc::now() - chrono::Duration::days(20)),
            NETS.iter(),
        )
        .await
        .unwrap();
        log::info!("Daily statistics committed");
    }
}
