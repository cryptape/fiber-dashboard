use fiber_dashbord_backend::{
    RpcClient, create_pg_pool, get_pg_pool, init_db,
    pg_write::{
        ChannelInfoDBSchema, daily_statistics, from_rpc_to_db_schema, init_global_cache,
        insert_batch,
    },
    types::{GraphChannelsParams, GraphNodesParams},
};

use sqlx::{Row, types::chrono::Utc};

fn main() {
    env_logger::init();

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
        analysis, analysis_hourly, list_channels_hourly, list_channels_monthly, list_nodes_hourly,
        list_nodes_monthly, node_udt_infos, nodes_by_udt,
    };
    use salvo::{Listener, Router, Server, Service, conn::TcpListener, cors::Cors};

    let cors = Cors::new().allow_origin("*").into_handler();
    let router = Router::new()
        .push(Router::with_path("nodes_hourly").get(list_nodes_hourly))
        .push(Router::with_path("channels_hourly").get(list_channels_hourly))
        .push(Router::with_path("node_udt_infos").get(node_udt_infos))
        .push(Router::with_path("nodes_by_udt").post(nodes_by_udt))
        .push(Router::with_path("nodes_nearly_monthly").get(list_nodes_monthly))
        .push(Router::with_path("channels_nearly_monthly").get(list_channels_monthly))
        .push(Router::with_path("analysis_hourly").get(analysis_hourly))
        .push(Router::with_path("analysis").post(analysis));

    let service = Service::new(router).hoop(cors);
    let http_port = std::env::var("HTTP_PORT").unwrap_or("8000".to_string());
    let listener = TcpListener::new(format!("0.0.0.0:{}", http_port))
        .bind()
        .await;
    log::info!("Starting HTTP server on port {}", http_port);
    Server::new(listener).serve(service).await;
}

async fn timed_commit_states() {
    let rpc_url =
        std::env::var("FIBER_RPC_URL").unwrap_or("http://18.163.221.211:8227".to_string());
    let rpc = RpcClient::new(&rpc_url);
    loop {
        let mut raw_nodes = Vec::new();
        let mut after_cursor = None;

        loop {
            let nodes = rpc
                .get_node_graph(GraphNodesParams {
                    limit: None,
                    after: after_cursor,
                })
                .await
                .expect("Failed to get node graph");

            let has_more = nodes.nodes.len() == 500;
            raw_nodes.extend(nodes.nodes);

            if !has_more {
                break;
            }

            after_cursor = Some(nodes.last_cursor);
        }

        let mut raw_channels = Vec::new();
        let mut after_cursor = None;

        loop {
            let channels = rpc
                .get_channel_graph(GraphChannelsParams {
                    limit: None,
                    after: after_cursor,
                })
                .await
                .expect("Failed to get channel graph");

            let has_more = channels.channels.len() == 500;
            raw_channels.extend(channels.channels);

            if !has_more {
                break;
            }

            after_cursor = Some(channels.last_cursor);
        }

        let mut node_schemas = Vec::with_capacity(raw_nodes.len());
        let mut udt_infos = Vec::new();
        let mut udt_dep_relations = Vec::new();
        let mut udt_node_relations = Vec::new();
        for node in raw_nodes {
            let (node_schema, udt_info, udt_dep_relation, udt_node_relation) =
                from_rpc_to_db_schema(node).await;
            node_schemas.push(node_schema);
            udt_infos.extend(udt_info);
            udt_dep_relations.extend(udt_dep_relation);
            udt_node_relations.extend(udt_node_relation);
        }

        let mut channel_schemas = Vec::with_capacity(raw_channels.len());
        for channel in raw_channels {
            let channel_schema: ChannelInfoDBSchema = channel.into();
            channel_schemas.push(channel_schema);
        }

        log::info!(
            "Fetched {} nodes and {} channels",
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
        )
        .await
        .expect("Failed to insert batch");
        let count = sqlx::query("SELECT COUNT(*) FROM online_nodes_hourly")
            .fetch_one(pool)
            .await
            .map(|row| row.get::<i64, _>(0))
            .expect("Failed to count rows");
        if count == 0 {
            sqlx::query("CALL refresh_continuous_aggregate('online_nodes_hourly', NULL, NULL)")
                .execute(pool)
                .await
                .expect("Failed to refresh continuous aggregate");
            sqlx::query("CALL refresh_continuous_aggregate('online_channels_hourly', NULL, NULL)")
                .execute(pool)
                .await
                .expect("Failed to refresh continuous aggregate");
        }
        tokio::time::sleep(tokio::time::Duration::from_secs(60 * 30)).await;
    }
}

async fn daily_commit() {
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(60 * 60 * 4)).await;
        let pool = get_pg_pool();
        daily_statistics(pool, Some(Utc::now() - chrono::Duration::days(20)))
            .await
            .unwrap();
        log::info!("Daily statistics committed");
    }
}
