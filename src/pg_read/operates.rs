use std::{collections::HashMap, hash::Hash};

use ckb_jsonrpc_types::{DepType, JsonBytes, OutPoint as OutPointWrapper, Script};
use ckb_types::H256;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use sqlx::{Pool, Postgres, Row};

use crate::{
    Network,
    pg_read::{
        ChannelInfo, HourlyChannelInfoDBRead, HourlyNodeInfo, HourlyNodeInfoDBRead, PAGE_SIZE,
    },
    pg_write::{DBState, global_cache, global_cache_testnet},
    types::{U64Hex, U128Hex, UdtArgInfo, UdtCellDep, UdtCfgInfos, UdtDep},
};

pub async fn read_nodes_hourly(
    pool: &Pool<Postgres>,
    page: usize,
    net: Network,
) -> Result<(Vec<HourlyNodeInfo>, usize), sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_by_page_hourly(pool, page, net)
        .await
        .map(|(entities, next_page)| {
            (
                entities.into_iter().map(HourlyNodeInfo::from).collect(),
                next_page,
            )
        })
}

pub async fn read_nodes_monthly(
    pool: &Pool<Postgres>,
    page: usize,
    start: chrono::DateTime<chrono::Utc>,
    end: chrono::DateTime<chrono::Utc>,
    net: Network,
) -> Result<(Vec<HourlyNodeInfo>, usize), sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_by_page_monthly(pool, page, start, end, net)
        .await
        .map(|(entities, next_page)| {
            (
                entities.into_iter().map(HourlyNodeInfo::from).collect(),
                next_page,
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

pub async fn read_channels_hourly(
    pool: &Pool<Postgres>,
    page: usize,
    net: Network,
) -> Result<(Vec<ChannelInfo>, usize), sqlx::Error> {
    HourlyChannelInfoDBRead::fetch_by_page_hourly(pool, page, net)
        .await
        .map(|(entities, next_page)| {
            (
                entities.into_iter().map(ChannelInfo::from).collect(),
                next_page,
            )
        })
}

pub async fn read_channels_monthly(
    pool: &Pool<Postgres>,
    page: usize,
    start: chrono::DateTime<chrono::Utc>,
    end: chrono::DateTime<chrono::Utc>,
    net: Network,
) -> Result<(Vec<ChannelInfo>, usize), sqlx::Error> {
    HourlyChannelInfoDBRead::fetch_by_page_monthly(pool, page, start, end, net)
        .await
        .map(|(entities, next_page)| {
            (
                entities.into_iter().map(ChannelInfo::from).collect(),
                next_page,
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
                        u128::from_le_bytes(buf)
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
                                        u32::from_le_bytes(buf).into()
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
    #[serde_as(as = "U128Hex")]
    max_capacity: u128,
    #[serde_as(as = "U128Hex")]
    min_capacity: u128,
    #[serde_as(as = "U128Hex")]
    avg_capacity: u128,
    #[serde_as(as = "U128Hex")]
    total_capacity: u128,
    #[serde_as(as = "U128Hex")]
    median_capacity: u128,
    #[serde_as(as = "U64Hex")]
    channel_len: u64,
    #[serde_as(as = "U64Hex")]
    total_nodes: u64,
}

pub async fn query_analysis_hourly(
    pool: &Pool<Postgres>,
    net: Network,
) -> Result<AnalysisHourly, sqlx::Error> {
    let channel_sql = format!(
        "SELECT DISTINCT ON (channel_outpoint) channel_outpoint, capacity from {} WHERE bucket >= $1::timestamp ORDER BY channel_outpoint, bucket DESC",
        net.online_channels_hourly()
    );
    let node_sql = format!(
        "SELECT COUNT(DISTINCT node_id) FROM {} WHERE bucket >= $1::timestamp",
        net.online_nodes_hourly()
    );
    let start_time = chrono::Utc::now() - chrono::Duration::hours(3);
    let mut channel_capacitys = sqlx::query(&channel_sql)
        .bind(start_time)
        .fetch_all(pool)
        .await
        .map(|rows| {
            rows.into_iter()
                .map(|row| {
                    let capacity: u128 = {
                        let raw: String = row.get("capacity");
                        let mut buf = [0u8; 16];
                        faster_hex::hex_decode(raw.as_bytes(), &mut buf).unwrap();
                        u128::from_le_bytes(buf)
                    };
                    capacity
                })
                .collect::<Vec<_>>()
        })?;
    let total_nodes: u64 = sqlx::query(&node_sql)
        .bind(start_time)
        .fetch_one(pool)
        .await
        .map(|row| {
            let count: i64 = row.get(0);
            count as u64
        })?;
    channel_capacitys.sort_unstable();
    let total_capacity = channel_capacitys.iter().sum();
    let max_capacity = *channel_capacitys.last().unwrap_or(&0);
    let min_capacity = *channel_capacitys.first().unwrap_or(&0);
    let avg_capacity = if channel_capacitys.is_empty() {
        0
    } else {
        total_capacity / channel_capacitys.len() as u128
    };
    let median_capacity = if channel_capacitys.is_empty() {
        0
    } else if channel_capacitys.len() % 2 == 0 {
        (channel_capacitys[channel_capacitys.len() / 2 - 1]
            + channel_capacitys[channel_capacitys.len() / 2])
            / 2
    } else {
        channel_capacitys[channel_capacitys.len() / 2]
    };
    Ok(AnalysisHourly {
        max_capacity,
        min_capacity,
        avg_capacity,
        total_capacity,
        median_capacity,
        channel_len: channel_capacitys.len() as u64,
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
}

impl AnalysisField {
    pub fn to_sql(self) -> String {
        match self {
            AnalysisField::Channels => "channels_count".to_string(),
            AnalysisField::Nodes => "nodes_count".to_string(),
            AnalysisField::Capacity => {
                "sum_capacity, avg_capacity, min_capacity, max_capacity, median_capacity"
                    .to_string()
            }
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
                    let value: i32 = row.get(table.name.to_sql().as_str());
                    table
                        .points
                        .push((timestamp, serde_json::Value::Number(value.into())));
                }
                AnalysisField::Capacity => {
                    let mut values = Vec::new();
                    for name in table.name.to_sql().split(", ") {
                        let value: String = row.get(name);
                        values.push(serde_json::Value::String(format!("0x{}", value)));
                    }
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
        select {states}.funding_args, {states}.capacity, {states}.state, {txs}.tx_hash, {txs}.block_number, {txs}.timestamp,{txs}.witness_args, {txs}.commitment_args
        from {states} 
        join {txs} on {txs}.channel_outpoint = {states}.channel_outpoint 
        where {states}.channel_outpoint = $1
    "#,
    );
    let mut funding_args: JsonBytes = JsonBytes::default();
    let mut state: String = String::new();
    let mut capacity: String = String::new();
    let mut rows = sqlx::query(&sql)
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
            }

            let raw_tx_hash: String = row.get("tx_hash");
            let raw_block_number: String = row.get("block_number");
            let raw_witness_args: Option<String> = row.get("witness_args");
            let raw_commitment_args: Option<String> = row.get("commitment_args");
            let raw_timestamp: String = row.get("timestamp");
            let tx_hash = format!("0x{}", raw_tx_hash);
            let block_number = format!("0x{}", raw_block_number);
            let timestamp = format!("0x{}", raw_timestamp);

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

    let to_u64 = |s: &str| -> u64 {
        let s = s.trim_start_matches("0x");
        let mut buf = [0u8; 8];
        faster_hex::hex_decode(s.as_bytes(), &mut buf).unwrap();
        u64::from_le_bytes(buf)
    };
    rows.sort_unstable_by(|a, b| to_u64(&a.1).cmp(&to_u64(&b.1)));

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
        txs: Vec<Txs>,
    }

    let res = TxState {
        funding_args,
        state,
        capacity,
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

pub async fn group_channel_by_state(
    pool: &Pool<Postgres>,
    state: DBState,
    page: usize,
    net: Network,
) -> Result<String, sqlx::Error> {
    let offset = page.saturating_mul(PAGE_SIZE);
    let sql = format!(
        r#"
        with channel_tx as (
            select channel_outpoint, tx_hash from {}
            ),
            channel_tx_count as (
                select channel_outpoint, count(*) as tx_count from channel_tx group by channel_outpoint
            )
        select n.channel_outpoint, n.funding_args, n.capacity, n.last_block_number, n.capacity, n.create_time, n.last_commit_time, n.last_tx_hash, n.last_commitment_args, c.tx_count
        from {} n
        left join channel_tx_count c on n.channel_outpoint = c.channel_outpoint
        where state = $1 LIMIT {} OFFSET {}
    "#,
        net.channel_txs(),
        net.channel_states(),
        PAGE_SIZE,
        offset
    );
    let rows = sqlx::query(&sql)
        .bind(state.to_sql())
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|row| {
            let channel_outpoint: String = row.get("channel_outpoint");
            let funding_args: String = row.get("funding_args");
            let last_block_number: String = row.get("last_block_number");
            let last_tx_hash: String = row.get("last_tx_hash");
            let last_commitment_args: Option<String> = row.get("last_commitment_args");
            let create_time: String = row.get("create_time");
            let last_commit_time: String = row.get("last_commit_time");
            let tx_count: i64 = row.get("tx_count");
            let capacity: String = row.get("capacity");
            (
                format!("0x{}", channel_outpoint),
                format!("0x{}", funding_args),
                format!("0x{}", last_block_number),
                format!("0x{}", last_tx_hash),
                format!("0x{}", create_time),
                format!("0x{}", last_commit_time),
                format!("0x{}", capacity),
                tx_count as usize,
                last_commitment_args.map(|arg| format!("0x{}", arg)),
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
        tx_count: usize,
    }

    #[derive(Serialize, Deserialize, Debug)]
    struct ChannelState {
        list: Vec<State>,
        next_page: usize,
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
                    create_time,
                    last_commit_time,
                    capacity,
                    tx_count,
                    last_commitment_args,
                )| State {
                    channel_outpoint,
                    funding_args,
                    last_block_number,
                    last_tx_hash,
                    tx_count,
                    create_time,
                    capacity,
                    last_commit_time,
                    last_commitment_args,
                },
            )
            .collect(),
        next_page: page.saturating_add(1),
    };
    Ok(serde_json::to_string(&res).unwrap())
}

pub async fn grout_channel_count_by_state(
    pool: &Pool<Postgres>,
    state: DBState,
    net: Network,
) -> Result<String, sqlx::Error> {
    let sql = format!(
        r#"
        select count(*) from {}
        where state = $1
    "#,
        net.channel_states()
    );
    let count: i64 = sqlx::query(&sql)
        .bind(state.to_sql())
        .fetch_one(pool)
        .await?
        .get(0);
    #[derive(Serialize, Deserialize, Debug)]
    struct Count {
        count: usize,
    }
    let res = Count {
        count: count as usize,
    };
    Ok(serde_json::to_string(&res).unwrap())
}

pub async fn query_channel_capacity_distribution(
    pool: &Pool<Postgres>,
    net: Network,
) -> Result<String, sqlx::Error> {
    let hour_bucket = chrono::Utc::now() - chrono::Duration::hours(3);
    let sql = format!(
        r#"
        SELECT DISTINCT ON (channel_outpoint) channel_outpoint, capacity, bucket AS last_seen_hour from {}
        WHERE bucket >= $1::timestamp
        ORDER BY channel_outpoint, bucket DESC
    "#,
        net.online_channels_hourly()
    );

    let rows = sqlx::query(&sql)
        .bind(hour_bucket)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|row| {
            let capacity: u128 = {
                let raw: String = row.get("capacity");
                let mut buf = [0u8; 16];
                faster_hex::hex_decode(raw.as_bytes(), &mut buf).unwrap();
                u128::from_le_bytes(buf)
            };
            capacity / 1000
        })
        .collect::<Vec<u128>>();

    let mut buckets = vec![0usize; 8];
    for &cap in &rows {
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

    let res = buckets
        .into_iter()
        .enumerate()
        .map(|(i, count)| (format!("Capacity 10^{}k", i), count))
        .collect::<HashMap<_, _>>();

    Ok(serde_json::to_string(&res).unwrap())
}
