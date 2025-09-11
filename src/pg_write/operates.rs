use crate::{
    ip_location::lookup_ipinfo,
    pg_write::{
        ChannelInfoDBSchema, Network, NodeInfoDBSchema, RelationCache, UdtInfos, UdtNodeRelation,
        UdtdepRelation, global_cache, global_cache_testnet,
    },
    types::NodeInfo,
};

use chrono::Duration;
use ckb_jsonrpc_types::DepType;
use faster_hex::hex_string;
use multiaddr::{Multiaddr, Protocol};
use sqlx::{
    Pool, Postgres,
    types::chrono::{DateTime, Utc},
};

use std::{collections::HashSet, net::SocketAddr, sync::Arc};

pub async fn from_rpc_to_db_schema(
    node_info: NodeInfo,
    net: Network,
) -> (
    NodeInfoDBSchema,
    Vec<UdtInfos>,
    Vec<UdtdepRelation>,
    Vec<UdtNodeRelation>,
) {
    let node_id = String::from_utf8(node_info.node_id.to_vec()).unwrap();
    let announce_timestamp = DateTime::from_timestamp_millis(node_info.timestamp as i64).unwrap();
    let auto_accept_min_ckb_funding_amount =
        hex_string(&node_info.auto_accept_min_ckb_funding_amount.to_le_bytes());

    let mut udt_infos = vec![];
    let mut udt_dep_relations = vec![];
    let mut udt_node_relations = vec![];

    let global = match net {
        Network::Mainnet => global_cache().load(),
        Network::Testnet => global_cache_testnet().load(),
    };
    let mut new_udt_infos = RelationCache {
        udt: global.udt.clone(),
        udt_node: global.udt_node.clone(),
    };

    let mut need_update_global = false;

    for udt_cfg in node_info.udt_cfg_infos.0 {
        let len = new_udt_infos.udt.len() as i32;
        let udt_info_id = *new_udt_infos
            .udt
            .entry(udt_cfg.script.clone())
            .or_insert_with(|| len + 1);

        if len != new_udt_infos.udt.len() as i32 {
            need_update_global = true;
            let udt_info = UdtInfos {
                id: udt_info_id,
                name: udt_cfg.name,
                code_hash: hex_string(udt_cfg.script.code_hash.as_bytes()),
                hash_type: udt_cfg.script.hash_type.to_string(),
                args: hex_string(udt_cfg.script.args.as_bytes()),
                auto_accept_amount: udt_cfg
                    .auto_accept_amount
                    .map_or("NULL".to_string(), |v| hex_string(&v.to_le_bytes())),
            };
            udt_infos.push(udt_info);
            for dep in udt_cfg.cell_deps {
                if let Some(cell_dep) = dep.cell_dep {
                    let relation = UdtdepRelation {
                        outpoint_tx_hash: Some(hex_string(cell_dep.out_point.tx_hash.as_bytes())),
                        outpoint_index: Some(hex_string(
                            &cell_dep.out_point.index.value().to_le_bytes(),
                        )),
                        dep_type: Some({
                            match cell_dep.dep_type {
                                DepType::Code => "code".to_string(),
                                DepType::DepGroup => "dep_group".to_string(),
                            }
                        }),
                        code_hash: None,
                        hash_type: None,
                        args: None,
                        udt_info_id: udt_info_id,
                    };
                    udt_dep_relations.push(relation);
                }
                if let Some(type_id) = dep.type_id {
                    let relation = UdtdepRelation {
                        outpoint_tx_hash: None,
                        outpoint_index: None,
                        dep_type: None,
                        code_hash: Some(hex_string(type_id.code_hash.as_bytes())),
                        hash_type: Some(type_id.hash_type.to_string()),
                        args: Some(hex_string(type_id.args.as_bytes())),
                        udt_info_id: udt_info_id,
                    };
                    udt_dep_relations.push(relation);
                }
            }
        }

        match new_udt_infos.udt_node.entry(node_info.node_id.clone()) {
            std::collections::hash_map::Entry::Occupied(mut entry) => {
                if entry.get_mut().insert(udt_info_id) {
                    need_update_global = true;
                    let relation = UdtNodeRelation {
                        node_id: node_id.clone(),
                        udt_info_id: udt_info_id,
                    };
                    udt_node_relations.push(relation);
                }
            }
            std::collections::hash_map::Entry::Vacant(entry) => {
                entry.insert(HashSet::from([udt_info_id]));
                need_update_global = true;
                let relation = UdtNodeRelation {
                    node_id: node_id.clone(),
                    udt_info_id: udt_info_id,
                };
                udt_node_relations.push(relation);
            }
        }
    }

    let mut node_schema = NodeInfoDBSchema {
        node_name: node_info.node_name,
        addresses: serde_json::to_string(&node_info.addresses).unwrap(),
        node_id: String::from_utf8(node_info.node_id.to_vec()).unwrap(),
        announce_timestamp: announce_timestamp,
        chain_hash: hex_string(node_info.chain_hash.as_bytes()),
        auto_accept_min_ckb_funding_amount: auto_accept_min_ckb_funding_amount,
        country: Default::default(),
        city: Default::default(),
        region: Default::default(),
        loc: Default::default(),
    };

    for addr in node_info
        .addresses
        .iter()
        .filter_map(multiaddr_to_socketaddr)
    {
        if let Some(ip_details) = lookup_ipinfo(&addr.ip().to_string()).await.ok() {
            node_schema.country = ip_details.country;
            node_schema.city = ip_details.city;
            node_schema.region = ip_details.region;
            node_schema.loc = ip_details.loc;
            break;
        }
    }
    // Update the global cache if there are new UDT infos or relations
    if need_update_global {
        match net {
            Network::Mainnet => global_cache().store(Arc::new(new_udt_infos)),
            Network::Testnet => global_cache_testnet().store(Arc::new(new_udt_infos)),
        }
    }
    (
        node_schema,
        udt_infos,
        udt_dep_relations,
        udt_node_relations,
    )
}

pub async fn insert_batch(
    pool: &Pool<Postgres>,
    udt_infos: &[UdtInfos],
    udt_dep_relations: &[UdtdepRelation],
    udt_node_relations: &[UdtNodeRelation],
    node_schemas: &[NodeInfoDBSchema],
    channel_schemas: &[ChannelInfoDBSchema],
    time: &DateTime<Utc>,
    net: Network,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    UdtInfos::insert_batch(&mut tx, udt_infos, net).await?;
    UdtdepRelation::use_sqlx(&mut tx, udt_dep_relations, net).await?;
    UdtNodeRelation::use_sqlx(&mut tx, udt_node_relations, net).await?;
    NodeInfoDBSchema::use_sqlx(&mut tx, node_schemas, time, net).await?;
    ChannelInfoDBSchema::use_sqlx(&mut tx, channel_schemas, time, net).await?;
    tx.commit().await?;
    Ok(())
}

pub async fn daily_statistics(
    pool: &Pool<Postgres>,
    start_time: Option<DateTime<Utc>>,
    nets: impl Iterator<Item = &Network>,
) -> Result<(), sqlx::Error> {
    use sqlx::Row;

    let now = Utc::now();

    let end_time = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc();
    let start_time = start_time.unwrap_or(end_time - Duration::days(1));

    for net in nets {
        let nodes_count_sql = format!(
            "
    SELECT
        time_bucket('1 day', bucket) AS day_bucket,
        COUNT(DISTINCT node_id) AS nodes_count
    FROM {}
    WHERE bucket < $1::timestamp and bucket >= $2::timestamp
    GROUP BY day_bucket
    ORDER BY day_bucket DESC
    ",
            net.online_nodes_hourly()
        );
        let channels_data_sql = format!(
            "
    SELECT DISTINCT ON (time_bucket('1 day', bucket), channel_outpoint)
        time_bucket('1 day', bucket) AS day_bucket,
        channel_outpoint,
        capacity
    FROM {}
    WHERE bucket < $1::timestamp and bucket >= $2::timestamp
    ORDER BY time_bucket('1 day', bucket), channel_outpoint, bucket DESC
    ",
            net.online_channels_hourly()
        );
        let nodes_count: Vec<(DateTime<Utc>, i64)> = sqlx::query(&nodes_count_sql)
            .bind(end_time)
            .bind(start_time)
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(|row| {
                let day_bucket: DateTime<Utc> = row.get("day_bucket");
                let nodes_count: i64 = row.get("nodes_count");
                (day_bucket, nodes_count)
            })
            .collect();
        let channels_data: Vec<(DateTime<Utc>, u128)> = sqlx::query(&channels_data_sql)
            .bind(end_time)
            .bind(start_time)
            .fetch_all(pool)
            .await?
            .into_iter()
            .map(|row| {
                let day_bucket: DateTime<Utc> = row.get("day_bucket");
                let capacity: u128 = {
                    let raw: String = row.get("capacity");
                    let mut buf = [0u8; 16];
                    faster_hex::hex_decode(raw.as_bytes(), &mut buf).unwrap();
                    u128::from_le_bytes(buf)
                };
                (day_bucket, capacity)
            })
            .collect();

        let summarized_data = summarize_data(channels_data, nodes_count);
        if summarized_data.is_empty() {
            continue;
        }
        let insert_sql = format!(
            "Insert into {} (day, channels_count, sum_capacity, avg_capacity, min_capacity, max_capacity, median_capacity, nodes_count) ",
            net.daily_summarized_data()
        );
        let mut query_builder: sqlx::QueryBuilder<'_, sqlx::Postgres> =
            sqlx::QueryBuilder::new(&insert_sql);

        query_builder.push_values(summarized_data.iter().take(65535 / 6), |mut b, sd| {
            b.push_bind(sd.date)
                .push_bind(sd.channels_count)
                .push_bind(&sd.capacity_sum)
                .push_bind(&sd.capacity_average)
                .push_bind(&sd.capacity_min)
                .push_bind(&sd.capacity_max)
                .push_bind(&sd.capacity_median)
                .push_bind(sd.nodes_count);
        });

        query_builder.push(" On Conflict (day) Do Nothing");
        query_builder.build().execute(pool).await?;
    }

    Ok(())
}

#[derive(Debug)]
pub struct DailySummary {
    pub date: DateTime<Utc>,
    pub channels_count: i64,
    pub capacity_average: String,
    pub capacity_min: String,
    pub capacity_max: String,
    pub capacity_median: String,
    pub capacity_sum: String, // hex encoded
    pub nodes_count: i64,
}

fn summarize_data(
    channels_data: Vec<(DateTime<Utc>, u128)>,
    nodes_data: Vec<(DateTime<Utc>, i64)>,
) -> Vec<DailySummary> {
    use std::collections::HashMap;

    let mut channel_map: HashMap<DateTime<Utc>, Vec<u128>> = HashMap::new();
    let nodes_by_date: HashMap<DateTime<Utc>, i64> = nodes_data.into_iter().collect();

    for (dt, value) in channels_data {
        channel_map.entry(dt).or_default().push(value);
    }

    let mut all_dates: HashSet<DateTime<Utc>> = channel_map.keys().copied().collect();
    all_dates.extend(nodes_by_date.keys());
    all_dates
        .into_iter()
        .filter_map(|dt| {
            let nodes_count = nodes_by_date.get(&dt).copied().unwrap_or(0);
            if let Some(values) = channel_map.get_mut(&dt) {
                if values.is_empty() {
                    return Some(DailySummary {
                        date: dt,
                        channels_count: 0,
                        capacity_average: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                        capacity_min: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                        capacity_max: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                        capacity_median: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                        capacity_sum: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                        nodes_count,
                    });
                }

                values.sort_unstable();

                let count = values.len();
                let min = values[0];
                let max = values[values.len() - 1];
                let sum: u128 = values.iter().sum();
                let average = sum / values.len() as u128;

                let median = if values.len() % 2 == 0 {
                    let mid1 = values[values.len() / 2 - 1];
                    let mid2 = values[values.len() / 2];
                    (mid1 + mid2) / 2
                } else {
                    values[values.len() / 2]
                };

                Some(DailySummary {
                    date: dt,
                    channels_count: count as i64,
                    capacity_average: faster_hex::hex_string(average.to_le_bytes().as_ref()),
                    capacity_min: faster_hex::hex_string(min.to_le_bytes().as_ref()),
                    capacity_max: faster_hex::hex_string(max.to_le_bytes().as_ref()),
                    capacity_median: faster_hex::hex_string(median.to_le_bytes().as_ref()),
                    capacity_sum: faster_hex::hex_string(sum.to_le_bytes().as_ref()),
                    nodes_count,
                })
            } else {
                Some(DailySummary {
                    date: dt,
                    channels_count: 0,
                    capacity_average: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                    capacity_min: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                    capacity_max: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                    capacity_median: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                    capacity_sum: faster_hex::hex_string(0u128.to_le_bytes().as_ref()),
                    nodes_count,
                })
            }
        })
        .collect()
}

pub fn multiaddr_to_socketaddr(addr: &Multiaddr) -> Option<SocketAddr> {
    let mut iter = addr.iter().peekable();

    while iter.peek().is_some() {
        match iter.peek() {
            Some(Protocol::Ip4(_)) | Some(Protocol::Ip6(_)) => (),
            _ => {
                // ignore is true
                let _ignore = iter.next();
                continue;
            }
        }

        let proto1 = iter.next()?;
        let proto2 = iter.next()?;

        match (proto1, proto2) {
            (Protocol::Ip4(ip), Protocol::Tcp(port)) => {
                return Some(SocketAddr::new(ip.into(), port));
            }
            (Protocol::Ip6(ip), Protocol::Tcp(port)) => {
                return Some(SocketAddr::new(ip.into(), port));
            }
            _ => (),
        }
    }

    None
}
