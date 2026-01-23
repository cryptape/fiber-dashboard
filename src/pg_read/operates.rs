use std::{collections::HashMap, hash::Hash};

use chrono::{DateTime, Utc};
use ckb_jsonrpc_types::{DepType, JsonBytes, OutPoint as OutPointWrapper, Script};
use ckb_types::H256;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use sqlx::{Pool, Postgres, Row};

use crate::{
    Network,
    http_server::{
        AnalysisHourlyParams, ChannelByNodeIdParams, ChannelByStateParams, FuzzyNodeName,
        ListNodesHourlyParams, NodeByRegion, Page,
    },
    pg_read::{
        ChannelInfo, HourlyChannelInfoDBRead, HourlyNodeInfo, HourlyNodeInfoDBRead, PAGE_SIZE,
    },
    pg_write::{DailySummaryInner, global_cache, global_cache_testnet},
    types::{U64Hex, U128Hex, UdtArgInfo, UdtCellDep, UdtCfgInfos, UdtDep},
};

pub(crate) async fn read_nodes_hourly(
    pool: &Pool<Postgres>,
    params: ListNodesHourlyParams,
) -> Result<(Vec<HourlyNodeInfo>, usize, usize), sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_by_page_hourly(pool, params)
        .await
        .map(|(entities, next_page, total_count)| {
            (
                entities.into_iter().map(HourlyNodeInfo::from).collect(),
                next_page,
                total_count,
            )
        })
}

pub async fn read_nodes_monthly(
    pool: &Pool<Postgres>,
    params: Page,
) -> Result<(Vec<HourlyNodeInfo>, usize, usize), sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_by_page_monthly(pool, params)
        .await
        .map(|(entities, next_page, total_count)| {
            (
                entities.into_iter().map(HourlyNodeInfo::from).collect(),
                next_page,
                total_count,
            )
        })
}

pub async fn query_node_info(
    pool: &Pool<Postgres>,
    node_id: JsonBytes,
    net: Network,
) -> Result<Option<HourlyNodeInfo>, sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_by_id(pool, node_id, net)
        .await
        .map(|res| res.map(HourlyNodeInfo::from))
}

pub(crate) async fn query_nodes_by_region(
    pool: &Pool<Postgres>,
    params: NodeByRegion,
) -> Result<(Vec<HourlyNodeInfo>, usize, usize), sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_node_by_region(pool, params)
        .await
        .map(|(entities, next_page, total_count)| {
            (
                entities.into_iter().map(HourlyNodeInfo::from).collect(),
                next_page,
                total_count,
            )
        })
}

pub(crate) async fn query_nodes_fuzzy_by_name(
    pool: &Pool<Postgres>,
    params: FuzzyNodeName,
) -> Result<(Vec<HourlyNodeInfo>, usize, usize), sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_node_fuzzy_by_name_or_id(pool, params)
        .await
        .map(|(entities, next_page, total_count)| {
            (
                entities.into_iter().map(HourlyNodeInfo::from).collect(),
                next_page,
                total_count,
            )
        })
}

pub async fn read_channels_hourly(
    pool: &Pool<Postgres>,
    params: Page,
) -> Result<(Vec<ChannelInfo>, usize, usize), sqlx::Error> {
    HourlyChannelInfoDBRead::fetch_by_page_hourly(pool, params)
        .await
        .map(|(entities, next_page, total_count)| {
            (
                entities.into_iter().map(ChannelInfo::from).collect(),
                next_page,
                total_count,
            )
        })
}

pub async fn read_channels_monthly(
    pool: &Pool<Postgres>,
    params: Page,
) -> Result<(Vec<ChannelInfo>, usize, usize), sqlx::Error> {
    HourlyChannelInfoDBRead::fetch_by_page_monthly(pool, params)
        .await
        .map(|(entities, next_page, total_count)| {
            (
                entities.into_iter().map(ChannelInfo::from).collect(),
                next_page,
                total_count,
            )
        })
}

pub async fn query_channel_info(
    pool: &Pool<Postgres>,
    outpoint: JsonBytes,
    net: Network,
) -> Result<Option<ChannelInfo>, sqlx::Error> {
    HourlyChannelInfoDBRead::fetch_by_id(pool, outpoint, net)
        .await
        .map(|res| res.map(ChannelInfo::from))
}

pub(crate) async fn query_channels_by_node_id(
    pool: &Pool<Postgres>,
    params: ChannelByNodeIdParams,
) -> Result<String, sqlx::Error> {
    let page_size = std::cmp::min(params.page_size.unwrap_or(PAGE_SIZE), PAGE_SIZE);
    let offset = params.page.saturating_mul(page_size);
    let hour_bucket = Utc::now() - chrono::Duration::hours(3);
    let sql_count = format!(
        "
            select COUNT(DISTINCT n.channel_outpoint) as total_count
            from {} n
            WHERE n.bucket >= $1::timestamp and (n.node1 = $2 OR n.node2 = $2)
        ",
        params.net.mv_online_channels(),
    );
    let total_count: i64 = sqlx::query(&sql_count)
        .bind(hour_bucket)
        .bind(faster_hex::hex_string(params.node_id.as_bytes()))
        .fetch_one(pool)
        .await?
        .get("total_count");
    let sql = format!(
        "
            select
            n.channel_outpoint, 
            n.bucket as last_seen_hour, 
            n.capacity as asset,
            c.capacity as capacity,
            n.created_timestamp,
            c.state,
            c.last_commit_time
            from {} n
            left join {} c on n.channel_outpoint = c.channel_outpoint
            WHERE n.bucket >= $1::timestamp and (n.node1 = $2 OR n.node2 = $2)
            ORDER BY {} {}
        ",
        params.net.mv_online_channels(),
        params.net.channel_states(),
        params.sort_by.as_str(),
        params.order.as_str(),
    );

    #[derive(Serialize, Deserialize)]
    struct Channel {
        channel_outpoint: String,
        last_seen_hour: DateTime<Utc>,
        capacity: String,
        asset: String,
        created_timestamp: DateTime<Utc>,
        state: String,
        last_commit_time: DateTime<Utc>,
    }

    #[derive(Serialize, Deserialize)]
    struct ChannelWithPage {
        channels: Vec<Channel>,
        next_page: usize,
        total_count: usize,
    }

    let channels = sqlx::query(&format!("{} LIMIT {} OFFSET {}", sql, page_size, offset))
        .bind(hour_bucket)
        .bind(faster_hex::hex_string(params.node_id.as_bytes()))
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|row| Channel {
            channel_outpoint: format!("0x{}", row.get::<String, _>("channel_outpoint")),
            last_seen_hour: row.get("last_seen_hour"),
            capacity: {
                let be_hex: String = row.get("capacity");
                format!("0x{}", &be_hex)
            },
            asset: {
                let be_hex: String = row.get("asset");
                format!("0x{}", &be_hex)
            },
            created_timestamp: row.get("created_timestamp"),
            state: row.get("state"),
            last_commit_time: row.get("last_commit_time"),
        })
        .collect();

    Ok(serde_json::to_string(&ChannelWithPage {
        channels,
        next_page: params.page.saturating_add(1),
        total_count: total_count as usize,
    })
    .unwrap())
}

pub async fn query_node_udt_relation(
    pool: &Pool<Postgres>,
    node_id: JsonBytes,
    net: Network,
) -> Result<UdtCfgInfos, sqlx::Error> {
    let sql = format!(
        r#"
        select id, name, code_hash, hash_type, args, auto_accept_amount 
        from {} 
        join {} on {}.id = {}.udt_info_id 
        where node_id = $1
    "#,
        net.udt_infos(),
        net.node_udt_relations(),
        net.udt_infos(),
        net.node_udt_relations()
    );

    let raw_udt_infos = sqlx::query(&sql)
        .bind(faster_hex::hex_string(node_id.as_bytes()))
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|row| {
            let id = row.get::<i32, _>("id");
            let info = UdtArgInfo {
                name: row.get("name"),
                script: Script {
                    code_hash: {
                        let mut code_hash_bytes = [0u8; 32];
                        let code_hash_str: String = row.get("code_hash");
                        faster_hex::hex_decode(code_hash_str.as_bytes(), &mut code_hash_bytes)
                            .unwrap();
                        H256::from(code_hash_bytes)
                    },
                    hash_type: {
                        let hash_type_str: String = row.get("hash_type");
                        match hash_type_str.as_str() {
                            "type" => ckb_jsonrpc_types::ScriptHashType::Type,
                            "data" => ckb_jsonrpc_types::ScriptHashType::Data,
                            "data1" => ckb_jsonrpc_types::ScriptHashType::Data1,
                            "data2" => ckb_jsonrpc_types::ScriptHashType::Data2,
                            _ => panic!("Unknown hash type: {}", hash_type_str),
                        }
                    },
                    args: {
                        let args_str: String = row.get("args");
                        let mut args_bytes = vec![0u8; args_str.len() / 2];
                        faster_hex::hex_decode(args_str.as_bytes(), &mut args_bytes).unwrap();
                        JsonBytes::from_vec(args_bytes)
                    },
                },
                auto_accept_amount: {
                    let amount: Option<String> = row.get("auto_accept_amount");
                    amount.map(|amt| {
                        let mut buf = [0u8; 16];
                        faster_hex::hex_decode(amt.as_bytes(), &mut buf).unwrap();
                        u128::from_be_bytes(buf)
                    })
                },
                cell_deps: Vec::new(),
            };
            (id, info)
        })
        .collect::<Vec<_>>();

    let mut cache = HashMap::new();
    let mut udt_infos = Vec::new();
    for (id, mut info) in raw_udt_infos {
        match cache.entry(id) {
            std::collections::hash_map::Entry::Vacant(e) => {
                let udt_deps = sqlx::query(
                    r#"
                    select outpoint_tx_hash, outpoint_index, dep_type, code_hash, hash_type, args   
                    from udt_dep 
                    where udt_info_id = $1
                    "#,
                )
                .bind(id)
                .fetch_all(pool)
                .await?
                .into_iter()
                .map(|row| UdtDep {
                    cell_dep: {
                        let outpoint_tx_hash: Option<String> = row.get("outpoint_tx_hash");
                        let outpoint_index: Option<String> = row.get("outpoint_index");
                        match (outpoint_tx_hash, outpoint_index) {
                            (Some(tx_hash), Some(index)) => Some(UdtCellDep {
                                out_point: OutPointWrapper {
                                    tx_hash: {
                                        let mut buf = [0; 32];
                                        faster_hex::hex_decode(tx_hash.as_bytes(), &mut buf)
                                            .unwrap();
                                        H256::from(buf)
                                    },
                                    index: {
                                        let mut buf = [0; 4];
                                        faster_hex::hex_decode(index.as_bytes(), &mut buf).unwrap();
                                        u32::from_be_bytes(buf).into()
                                    },
                                },
                                dep_type: match row.get::<String, _>("dep_type").as_str() {
                                    "code" => DepType::Code,
                                    "dep_group" => DepType::DepGroup,
                                    _ => panic!("Unknown dep type"),
                                },
                            }),
                            _ => None,
                        }
                    },
                    type_id: {
                        let code_hash: Option<String> = row.get("code_hash");
                        code_hash.map(|code_hash| Script {
                            code_hash: {
                                let mut buf = [0; 32];
                                faster_hex::hex_decode(code_hash.as_bytes(), &mut buf).unwrap();
                                H256::from(buf)
                            },
                            hash_type: match row.get::<String, _>("hash_type").as_str() {
                                "type" => ckb_jsonrpc_types::ScriptHashType::Type,
                                "data" => ckb_jsonrpc_types::ScriptHashType::Data,
                                "data1" => ckb_jsonrpc_types::ScriptHashType::Data1,
                                "data2" => ckb_jsonrpc_types::ScriptHashType::Data2,
                                _ => panic!("Unknown hash type"),
                            },
                            args: {
                                let args = {
                                    let mut buf = Vec::new();
                                    faster_hex::hex_decode(
                                        row.get::<String, _>("args").as_bytes(),
                                        &mut buf,
                                    )
                                    .unwrap();
                                    buf
                                };
                                JsonBytes::from_vec(args)
                            },
                        })
                    },
                })
                .collect::<Vec<_>>();
                e.insert(udt_deps.clone());
                info.cell_deps = udt_deps;
                udt_infos.push(info);
            }
            std::collections::hash_map::Entry::Occupied(e) => {
                info.cell_deps = e.get().clone();
                udt_infos.push(info);
            }
        }
    }

    Ok(UdtCfgInfos(udt_infos))
}

pub async fn query_nodes_by_udt(
    pool: &Pool<Postgres>,
    udt: Script,
    net: Network,
) -> Result<Vec<String>, sqlx::Error> {
    let udt_id = match net {
        Network::Mainnet => global_cache()
            .load()
            .udt
            .get(&udt)
            .cloned()
            .ok_or_else(|| sqlx::Error::RowNotFound)?,
        Network::Testnet => global_cache_testnet()
            .load()
            .udt
            .get(&udt)
            .cloned()
            .ok_or_else(|| sqlx::Error::RowNotFound)?,
    };
    let sql = format!(
        r#"
        select node_id
        from {}
        where udt_info_id = $1
    "#,
        net.node_udt_relations()
    );

    Ok(sqlx::query(&sql)
        .bind(udt_id)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|row| {
            let node_id: String = row.get("node_id");
            format!("0x{}", node_id)
        })
        .collect::<Vec<_>>())
}

#[serde_as]
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AnalysisHourly {
    #[serde_as(as = "U64Hex")]
    channel_len: u64,
    #[serde_as(as = "U64Hex")]
    total_nodes: u64,
    asset_analysis: Vec<AnalysisHourlyInner>,
    capacity_analysis: Vec<AnalysisHourlyInner>,
}

#[serde_as]
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AnalysisHourlyInner {
    name: String,
    #[serde_as(as = "U128Hex")]
    max: u128,
    #[serde_as(as = "U128Hex")]
    min: u128,
    #[serde_as(as = "U128Hex")]
    avg: u128,
    #[serde_as(as = "U128Hex")]
    total: u128,
    #[serde_as(as = "U128Hex")]
    median: u128,
    #[serde_as(as = "U64Hex")]
    channel_len: u64,
}

pub async fn query_analysis_hourly(
    pool: &Pool<Postgres>,
    params: AnalysisHourlyParams,
) -> Result<AnalysisHourly, sqlx::Error> {
    let channel_sql = format!(
        "SELECT DISTINCT ON (n.channel_outpoint) n.capacity as asset, COALESCE(c.name, 'ckb') as name, u.capacity as capacity
        from {} n
        left join {} c on n.udt_type_script = c.id
        left join {} u on n.channel_outpoint = u.channel_outpoint
        WHERE bucket >= $1::timestamp and bucket <= $2::timestamp
        ORDER BY n.channel_outpoint, bucket DESC",
        params.net.online_channels_hourly(),
        params.net.udt_infos(),
        params.net.channel_states()
    );
    let node_sql = format!(
        "SELECT COUNT(DISTINCT node_id) FROM {} WHERE bucket >= $1::timestamp and bucket <= $2::timestamp",
        params.net.online_nodes_hourly()
    );
    let end = params.end.unwrap_or_else(chrono::Utc::now);
    let start_time = end - chrono::Duration::hours(3);
    let mut channel_capacitys = sqlx::query(&channel_sql)
        .bind(start_time)
        .bind(end)
        .fetch_all(pool)
        .await
        .map(|rows| {
            rows.into_iter()
                .map(|row| {
                    let name = row.get::<String, _>("name");
                    let asset: u128 = {
                        let raw: String = row.get("asset");
                        let mut buf = [0u8; 16];
                        faster_hex::hex_decode(raw.as_bytes(), &mut buf).unwrap();
                        u128::from_be_bytes(buf)
                    };
                    let capacity: u64 = {
                        let raw: String = row.get("capacity");
                        let mut buf = [0u8; 8];
                        faster_hex::hex_decode(raw.as_bytes(), &mut buf).unwrap();
                        u64::from_be_bytes(buf)
                    };
                    (name, asset, capacity)
                })
                .fold(
                    HashMap::new(),
                    |mut acc: HashMap<String, Vec<(u128, u64)>>, (name, asset, capacity)| {
                        acc.entry(name).or_default().push((asset, capacity));
                        acc
                    },
                )
        })?;
    let total_nodes: u64 = sqlx::query(&node_sql)
        .bind(start_time)
        .bind(end)
        .fetch_one(pool)
        .await
        .map(|row| {
            let count: i64 = row.get(0);
            count as u64
        })?;
    let mut channel_len = 0;
    let mut asset_analysis = Vec::with_capacity(channel_capacitys.len());
    let mut capacity_analysis = Vec::with_capacity(channel_capacitys.len());
    for (name, caps) in channel_capacitys.drain() {
        channel_len += caps.len();
        let mut assets: Vec<u128> = caps.iter().map(|(asset, _)| *asset).collect();
        assets.sort_unstable();
        let asset_min = assets[0];
        let asset_max = assets[assets.len() - 1];
        let asset_sum: u128 = assets.iter().sum();
        let asset_average = asset_sum / assets.len() as u128;
        let asset_median = if assets.len().is_multiple_of(2) {
            let mid1 = assets[assets.len() / 2 - 1];
            let mid2 = assets[assets.len() / 2];
            (mid1 + mid2) / 2
        } else {
            assets[assets.len() / 2]
        };

        asset_analysis.push(AnalysisHourlyInner {
            name: name.clone(),
            avg: asset_average,
            min: asset_min,
            max: asset_max,
            median: asset_median,
            total: asset_sum,
            channel_len: caps.len() as u64,
        });

        let mut capacities: Vec<u64> = caps.iter().map(|(_, capacity)| *capacity).collect();
        capacities.sort_unstable();
        let capacity_min = capacities[0];
        let capacity_max = capacities[capacities.len() - 1];
        let capacity_sum: u64 = capacities.iter().sum();
        let capacity_average = capacity_sum / capacities.len() as u64;
        let capacity_median = if capacities.len().is_multiple_of(2) {
            let mid1 = capacities[capacities.len() / 2 - 1];
            let mid2 = capacities[capacities.len() / 2];
            (mid1 + mid2) / 2
        } else {
            capacities[capacities.len() / 2]
        };

        capacity_analysis.push(AnalysisHourlyInner {
            name: name.clone(),
            avg: capacity_average as u128,
            min: capacity_min as u128,
            max: capacity_max as u128,
            median: capacity_median as u128,
            total: capacity_sum as u128,
            channel_len: caps.len() as u64,
        });
    }

    Ok(AnalysisHourly {
        asset_analysis,
        capacity_analysis,
        channel_len: channel_len as u64,
        total_nodes,
    })
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum AnalysisField {
    #[serde(alias = "channels")]
    Channels,
    #[serde(alias = "nodes")]
    Nodes,
    #[serde(alias = "capacity")]
    Capacity,
    #[serde(alias = "asset")]
    Asset,
}

impl AnalysisField {
    pub fn to_sql(self) -> String {
        match self {
            AnalysisField::Channels => "channels_count".to_string(),
            AnalysisField::Nodes => "nodes_count".to_string(),
            AnalysisField::Capacity => "capacity_analysis".to_string(),
            AnalysisField::Asset => "asset_analysis".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Hash, salvo::macros::Extractible)]
#[salvo(extract(default_source(from = "body")))]
pub struct AnalysisParams {
    start_time: Option<chrono::NaiveDate>,
    end_time: Option<chrono::NaiveDate>,
    #[serde(default)]
    fields: Vec<AnalysisField>,
    interval: Option<String>,
    range: Option<String>,
    #[serde(default)]
    net: crate::Network,
}

impl AnalysisParams {
    fn to_sql(&self) -> (String, Meta) {
        let mut meta = Meta::default();
        let mut sql = String::from("SELECT day, ");
        let end_time = self
            .end_time
            .unwrap_or_else(|| chrono::Utc::now().date_naive());
        let start_time = self.start_time.unwrap_or_else(|| match self.range {
            None => end_time - chrono::Duration::days(30),
            Some(ref range) => {
                meta.range = range.clone();
                match range.as_str() {
                    "1M" => end_time - chrono::Duration::days(30),
                    "3M" => end_time - chrono::Duration::days(3 * 30),
                    "6M" => end_time - chrono::Duration::days(6 * 30),
                    "1Y" => end_time - chrono::Duration::days(365),
                    "2Y" => end_time - chrono::Duration::days(2 * 365),
                    _ => end_time - chrono::Duration::days(30),
                }
            }
        });
        let fields = if self.fields.is_empty() {
            meta.fields = vec![
                AnalysisField::Channels,
                AnalysisField::Nodes,
                AnalysisField::Capacity,
                AnalysisField::Asset,
            ];
            "*".to_string()
        } else {
            meta.fields = self.fields.clone();
            self.fields
                .iter()
                .map(|f| f.to_sql())
                .collect::<Vec<_>>()
                .join(", ")
        };
        sql.push_str(&fields);
        sql.push_str(&format!(" from {} ", self.net.daily_summarized_data()));
        sql.push_str(&format!(
            "where day >= '{}'::date and day < '{}'::date ",
            start_time, end_time
        ));
        sql.push_str("order by day asc");
        meta.start_time = format!("{}", start_time.format("%Y-%m-%d"));
        meta.end_time = format!("{}", end_time.format("%Y-%m-%d"));
        meta.interval = self.interval.clone().unwrap_or_else(|| "day".to_string());

        (sql, meta)
    }
}

#[derive(Serialize, Deserialize, Debug, Default)]
struct Meta {
    fields: Vec<AnalysisField>,
    start_time: String,
    end_time: String,
    interval: String,
    range: String,
}

pub async fn query_analysis(
    pool: &Pool<Postgres>,
    params: &AnalysisParams,
) -> Result<String, sqlx::Error> {
    let (sql, meta) = params.to_sql();
    let rows = sqlx::query(&sql).fetch_all(pool).await?;
    #[derive(Serialize, Deserialize, Debug)]
    struct Res {
        series: Vec<Tables>,
        meta: Meta,
    }
    #[derive(Serialize, Deserialize, Debug)]
    struct Tables {
        name: AnalysisField,
        points: Vec<(chrono::NaiveDate, serde_json::Value)>,
    }
    let mut results = Res {
        series: Vec::new(),
        meta,
    };
    let mut tables = results
        .meta
        .fields
        .iter()
        .map(|field| Tables {
            name: *field,
            points: Vec::new(),
        })
        .collect::<Vec<_>>();
    for row in rows {
        let timestamp: chrono::NaiveDate = row.get("day");
        for table in tables.iter_mut() {
            match table.name {
                AnalysisField::Channels => {
                    let value: sqlx::types::Json<HashMap<String, i64>> =
                        row.get(table.name.to_sql().as_str());
                    table.points.push((
                        timestamp,
                        serde_json::Value::Object(serde_json::Map::from_iter(
                            value.0.into_iter().map(|(k, v)| {
                                (k, serde_json::Value::Number(serde_json::Number::from(v)))
                            }),
                        )),
                    ));
                }
                AnalysisField::Capacity => {
                    let raw: sqlx::types::Json<Vec<DailySummaryInner>> =
                        row.get(table.name.to_sql().as_str());
                    let values = raw
                        .0
                        .into_iter()
                        .map(|inner| {
                            serde_json::json!({
                                    "name": inner.name,
                                    "max": format!("0x{}", inner.max),
                                    "min": format!("0x{}", inner.min),
                                    "avg": format!("0x{}", inner.average),
                                    "total": format!("0x{}", inner.sum),
                                    "median": format!("0x{}", inner.median),
                            })
                        })
                        .collect::<Vec<_>>();

                    table
                        .points
                        .push((timestamp, serde_json::Value::Array(values)));
                }
                AnalysisField::Asset => {
                    let raw: sqlx::types::Json<Vec<DailySummaryInner>> =
                        row.get(table.name.to_sql().as_str());
                    let values = raw
                        .0
                        .into_iter()
                        .map(|inner| {
                            serde_json::json!({
                                    "name": inner.name,
                                    "max": format!("0x{}", inner.max),
                                    "min": format!("0x{}", inner.min),
                                    "avg": format!("0x{}", inner.average),
                                    "total": format!("0x{}", inner.sum),
                                    "median": format!("0x{}", inner.median),
                            })
                        })
                        .collect::<Vec<_>>();

                    table
                        .points
                        .push((timestamp, serde_json::Value::Array(values)));
                }
                AnalysisField::Nodes => {
                    let value: i32 = row.get(table.name.to_sql().as_str());
                    table
                        .points
                        .push((timestamp, serde_json::Value::Number(value.into())));
                }
            }
        }
    }
    results.series = tables;
    Ok(serde_json::to_string(&results).unwrap())
}

pub async fn query_channel_state(
    pool: &Pool<Postgres>,
    outpoint: JsonBytes,
    net: Network,
) -> Result<String, sqlx::Error> {
    let states = net.channel_states();
    let txs = net.channel_txs();
    let sql = format!(
        r#"
        select {states}.funding_args, {states}.capacity, {states}.state, {txs}.tx_hash, {txs}.block_number, {txs}.timestamp,{txs}.witness_args, {txs}.commitment_args, {states}.udt_value
        from {states} 
        join {txs} on {txs}.channel_outpoint = {states}.channel_outpoint 
        where {states}.channel_outpoint = $1
        order by {txs}.block_number ASC
    "#,
    );
    let mut funding_args: JsonBytes = JsonBytes::default();
    let mut state: String = String::new();
    let mut capacity: String = String::new();
    let mut udt_value: Option<String> = None;
    let rows = sqlx::query(&sql)
        .bind(faster_hex::hex_string(outpoint.as_bytes()))
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|row| {
            if funding_args.is_empty() {
                let raw: String = row.get("funding_args");
                let mut buf = vec![0u8; raw.len() / 2];
                faster_hex::hex_decode(raw.as_bytes(), &mut buf).unwrap();
                funding_args = JsonBytes::from_vec(buf);
            }
            if state.is_empty() {
                state = row.get("state");
            }
            if capacity.is_empty() {
                let raw: String = row.get("capacity");
                capacity = format!("0x{}", raw);
                let raw_udt_value: Option<String> = row.try_get("udt_value").ok();
                udt_value = raw_udt_value.map(|v| format!("0x{}", v));
            }

            let raw_tx_hash: String = row.get("tx_hash");
            let raw_block_number: String = row.get("block_number");
            let raw_witness_args: Option<String> = row.get("witness_args");
            let raw_commitment_args: Option<String> = row.get("commitment_args");
            let raw_timestamp: DateTime<Utc> = row.get("timestamp");
            let tx_hash = format!("0x{}", raw_tx_hash);
            let block_number = { format!("0x{}", raw_block_number) };
            let timestamp = raw_timestamp.to_rfc3339();

            let witness_args = raw_witness_args.map(|args| format!("0x{}", args));
            let commitment_args = raw_commitment_args.map(|args| format!("0x{}", args));
            (
                tx_hash,
                block_number,
                timestamp,
                witness_args,
                commitment_args,
            )
        })
        .collect::<Vec<_>>();

    #[derive(Serialize, Deserialize, Debug)]
    struct Txs {
        tx_hash: String,
        block_number: String,
        timestamp: String,
        witness_args: Option<String>,
        commitment_args: Option<String>,
    }
    #[derive(Serialize, Deserialize, Debug)]
    struct TxState {
        funding_args: JsonBytes,
        state: String,
        capacity: String,
        udt_value: Option<String>,
        txs: Vec<Txs>,
    }

    let res = TxState {
        funding_args,
        state,
        capacity,
        udt_value,
        txs: rows
            .into_iter()
            .map(
                |(tx_hash, block_number, timestamp, witness_args, commitment_args)| Txs {
                    tx_hash,
                    block_number,
                    timestamp,
                    witness_args,
                    commitment_args,
                },
            )
            .collect(),
    };

    Ok(serde_json::to_string(&res).unwrap())
}

pub(crate) async fn group_channel_by_state(
    pool: &Pool<Postgres>,
    params: ChannelByStateParams,
) -> Result<String, sqlx::Error> {
    let page_size = std::cmp::min(params.page_size.unwrap_or(PAGE_SIZE), PAGE_SIZE);
    let offset = params.page.saturating_mul(page_size);
    let mut sql_count = format!(
        r#"
        select COUNT(*) as total_count
        from {} n
        left join {} k on n.channel_outpoint = k.channel_outpoint
        left join {} m on k.udt_type_script = m.id
        where state = Any($1) 
    "#,
        params.net.channel_states(),
        params.net.mv_online_channels(),
        params.net.udt_infos()
    );
    let index = if params.fuzz_name.is_some() {
        sql_count.push_str(" AND (POSITION($2 IN n.channel_outpoint) > 0)");
        3
    } else {
        2
    };
    if params.asset_name.is_some() {
        sql_count.push_str(&format!(
            " AND LOWER(COALESCE(m.name, 'ckb')) = LOWER(${})",
            index
        ));
    }
    let total_count: i64 = {
        let mut query = sqlx::query(&sql_count).bind(params.state.to_sql());
        if let Some(fuzz_name) = &params.fuzz_name {
            let name = if fuzz_name.starts_with("0x") || fuzz_name.starts_with("0X") {
                &fuzz_name[2..]
            } else {
                fuzz_name
            };
            query = query.bind(name);
        }
        if let Some(asset_name) = &params.asset_name {
            query = query.bind(asset_name);
        }
        query.fetch_one(pool).await?.get("total_count")
    };
    let sql = format!(
        r#"
        with channel_tx_count as (
            select c.channel_outpoint, count(*) as tx_count 
            from {} c
            inner join {} s on c.channel_outpoint = s.channel_outpoint and s.state = Any($1)
            group by c.channel_outpoint
        )
        select n.channel_outpoint, n.funding_args, n.capacity, n.udt_value, n.last_block_number, n.create_time, n.last_commit_time, n.last_tx_hash, n.last_commitment_args, coalesce(t.tx_count, 0) as tx_count, COALESCE(m.name, 'ckb') as name
        from {} n
        left join channel_tx_count t on n.channel_outpoint = t.channel_outpoint
        left join {} k on n.channel_outpoint = k.channel_outpoint
        left join {} m on k.udt_type_script = m.id
        where n.state = Any($1) {} {}
        order by n.{} {}
        LIMIT {} OFFSET {}
        "#,
        params.net.channel_txs(),
        params.net.channel_states(),
        params.net.channel_states(),
        params.net.mv_online_channels(),
        params.net.udt_infos(),
        if params.fuzz_name.is_some() {
            " AND (POSITION($2 IN n.channel_outpoint) > 0)"
        } else {
            ""
        },
        if params.asset_name.is_some() {
            format!(" AND LOWER(COALESCE(m.name, 'ckb')) = LOWER(${})", index)
        } else {
            String::new()
        },
        params.sort_by.as_str(),
        params.order.as_str(),
        page_size,
        offset
    );
    let mut query = sqlx::query(&sql).bind(params.state.to_sql());
    if let Some(fuzz_name) = &params.fuzz_name {
        let name = if fuzz_name.starts_with("0x") || fuzz_name.starts_with("0X") {
            &fuzz_name[2..]
        } else {
            fuzz_name
        };
        query = query.bind(name);
    }
    if let Some(asset_name) = &params.asset_name {
        query = query.bind(asset_name);
    }
    let rows = query
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|row| {
            let channel_outpoint: String = row.get("channel_outpoint");
            let funding_args: String = row.get("funding_args");
            let last_block_number: String = row.get("last_block_number");
            let last_tx_hash: String = row.get("last_tx_hash");
            let last_commitment_args: Option<String> = row.get("last_commitment_args");
            let create_time: DateTime<Utc> = row.get("create_time");
            let last_commit_time: DateTime<Utc> = row.get("last_commit_time");
            let tx_count: i64 = row.get("tx_count");
            let capacity: String = row.get("capacity");
            let udt_value: Option<String> = row.try_get("udt_value").ok();
            let name: String = row.get("name");
            (
                format!("0x{}", channel_outpoint),
                format!("0x{}", funding_args),
                format!("0x{}", last_block_number),
                format!("0x{}", last_tx_hash),
                udt_value.map(|val| format!("0x{}", val)),
                create_time.to_rfc3339(),
                last_commit_time.to_rfc3339(),
                format!("0x{}", capacity),
                tx_count as usize,
                last_commitment_args.map(|arg| format!("0x{}", arg)),
                name,
            )
        })
        .collect::<Vec<_>>();

    #[derive(Serialize, Deserialize, Debug)]
    struct State {
        channel_outpoint: String,
        funding_args: String,
        last_block_number: String,
        last_tx_hash: String,
        last_commitment_args: Option<String>,
        create_time: String,
        last_commit_time: String,
        capacity: String,
        udt_value: Option<String>,
        tx_count: usize,
        name: String,
    }

    #[derive(Serialize, Deserialize, Debug)]
    struct ChannelState {
        list: Vec<State>,
        next_page: usize,
        total_count: usize,
    }
    let res = ChannelState {
        list: rows
            .into_iter()
            .map(
                |(
                    channel_outpoint,
                    funding_args,
                    last_block_number,
                    last_tx_hash,
                    udt_value,
                    create_time,
                    last_commit_time,
                    capacity,
                    tx_count,
                    last_commitment_args,
                    name,
                )| State {
                    channel_outpoint,
                    funding_args,
                    last_block_number,
                    last_tx_hash,
                    udt_value,
                    tx_count,
                    create_time,
                    capacity,
                    last_commit_time,
                    last_commitment_args,
                    name,
                },
            )
            .collect(),
        next_page: params.page.saturating_add(1),
        total_count: total_count as usize,
    };
    Ok(serde_json::to_string(&res).unwrap())
}

pub async fn group_channel_count_by_state(
    pool: &Pool<Postgres>,
    net: Network,
) -> Result<String, sqlx::Error> {
    let hour_bucket = chrono::Utc::now() - chrono::Duration::hours(3);
    let sql = format!(
        r#"
        select state, count(*), COALESCE(u.name, 'ckb') as name from {} n
        left join {} v on n.channel_outpoint = v.channel_outpoint
        left join {} u on u.id = v.udt_type_script
        WHERE v.bucket >= $1::timestamp
        group by state, name
    "#,
        net.channel_states(),
        net.mv_online_channels(),
        net.udt_infos()
    );
    let res = sqlx::query(&sql)
        .bind(hour_bucket)
        .fetch_all(pool)
        .await?
        .into_iter()
        .fold(HashMap::new(), |mut acc, row| {
            let state: String = row.get("state");
            let count: i64 = row.get("count");
            let name: String = row.get("name");
            acc.entry(name)
                .or_insert_with(HashMap::new)
                .insert(state, count as usize);
            acc
        });

    Ok(serde_json::to_string(&res).unwrap())
}

pub async fn query_channel_capacity_distribution(
    pool: &Pool<Postgres>,
    net: Network,
) -> Result<String, sqlx::Error> {
    let hour_bucket = chrono::Utc::now() - chrono::Duration::hours(3);
    let sql = format!(
        r#"
        SELECT n.capacity as asset, COALESCE(u.name, 'ckb') as name, v.capacity as capacity from {} n
        left join {} u on n.udt_type_script = u.id
        left join {} v on n.channel_outpoint = v.channel_outpoint
        WHERE bucket >= $1::timestamp
        ORDER BY n.channel_outpoint, bucket DESC
    "#,
        net.mv_online_channels(),
        net.udt_infos(),
        net.channel_states()
    );

    let rows = sqlx::query(&sql)
        .bind(hour_bucket)
        .fetch_all(pool)
        .await?
        .into_iter()
        .fold(HashMap::new(), |mut acc, row| {
            let asset: u128 = {
                let raw: String = row.get("asset");
                let mut buf = [0u8; 16];
                faster_hex::hex_decode(raw.as_bytes(), &mut buf).unwrap();
                u128::from_be_bytes(buf)
            };
            let capacity: u64 = {
                let raw: String = row.get("capacity");
                let mut buf = [0u8; 8];
                faster_hex::hex_decode(raw.as_bytes(), &mut buf).unwrap();
                u64::from_be_bytes(buf)
            };
            let name = row.get::<String, _>("name");
            acc.entry(name)
                .or_insert_with(Vec::new)
                .push((asset, capacity));
            acc
        });

    #[derive(Serialize, Deserialize, Debug)]
    struct Distribution {
        asset: HashMap<String, HashMap<String, usize>>,
        capacity: HashMap<String, HashMap<String, usize>>,
    }
    let mut asset_distribution = HashMap::with_capacity(rows.len());
    let mut capacity_distribution = HashMap::with_capacity(rows.len());

    for (name, caps) in rows.iter() {
        let assets = caps.iter().map(|(asset, _)| *asset).collect::<Vec<_>>();
        let mut buckets = vec![0usize; 8];
        for &cap in assets.iter() {
            let idx = if cap == 0 {
                0usize
            } else {
                let mut v = cap;
                let mut exp = 0usize;
                while v >= 10 && exp < 7 {
                    v /= 10;
                    exp += 1;
                }
                exp
            };
            buckets[idx] += 1;
        }
        asset_distribution.insert(
            name.clone(),
            buckets
                .into_iter()
                .enumerate()
                .map(|(i, count)| (format!("Asset 10^{}k", i), count))
                .collect::<HashMap<_, _>>(),
        );

        let capacities = caps
            .iter()
            .map(|(_, capacity)| *capacity)
            .collect::<Vec<_>>();
        let mut buckets = vec![0usize; 8];
        for &cap in capacities.iter() {
            let idx = if cap == 0 {
                0usize
            } else {
                let mut v = cap;
                let mut exp = 0usize;
                while v >= 10 && exp < 7 {
                    v /= 10;
                    exp += 1;
                }
                exp
            };
            buckets[idx] += 1;
        }
        capacity_distribution.insert(
            name.clone(),
            buckets
                .into_iter()
                .enumerate()
                .map(|(i, count)| (format!("Capacity 10^{}k", i), count))
                .collect::<HashMap<_, _>>(),
        );
    }

    Ok(serde_json::to_string(&Distribution {
        asset: asset_distribution,
        capacity: capacity_distribution,
    })
    .unwrap())
}

pub async fn query_nodes_all_regions(
    pool: &Pool<Postgres>,
    net: Network,
) -> Result<String, sqlx::Error> {
    let sql = format!(
        r#"
        select distinct country_or_region from {}
        WHERE country_or_region IS NOT NULL 
        AND country_or_region != ''
    "#,
        net.node_infos()
    );
    let rows = sqlx::query(&sql)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|row| {
            let region: String = row.get("country_or_region");
            region
        })
        .collect::<Vec<String>>();

    Ok(serde_json::to_string(&rows).unwrap())
}

pub async fn query_channel_count_by_asset(
    pool: &Pool<Postgres>,
    net: Network,
) -> Result<String, sqlx::Error> {
    let sql = format!(
        r#"
        select COALESCE(c.name, 'ckb') as name, COUNT(*) as count
        from {} u
        left join {} c on u.udt_type_script = c.id
        group by c.name
    "#,
        net.mv_online_channels(),
        net.udt_infos()
    );

    let res = sqlx::query(&sql)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|row| {
            let name: String = row.get("name");
            let count: i64 = row.get("count");
            (name, count)
        })
        .collect::<HashMap<_, _>>();

    Ok(serde_json::to_string(&res).unwrap())
}
