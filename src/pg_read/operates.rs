use std::collections::HashMap;

use ckb_jsonrpc_types::{DepType, JsonBytes, OutPoint as OutPointWrapper, Script};
use ckb_types::H256;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use sqlx::{Pool, Postgres, Row};

use crate::{
    pg_read::{ChannelInfo, HourlyChannelInfoDBRead, HourlyNodeInfo, HourlyNodeInfoDBRead},
    pg_write::global_cache,
    types::{U128Hex, UdtArgInfo, UdtCellDep, UdtCfgInfos, UdtDep},
};

pub async fn read_nodes_hourly(
    pool: &Pool<Postgres>,
    page: usize,
) -> Result<(Vec<HourlyNodeInfo>, usize), sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_by_page_hourly(pool, page)
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
) -> Result<(Vec<HourlyNodeInfo>, usize), sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_by_page_nearly_a_month(pool, page)
        .await
        .map(|(entities, next_page)| {
            (
                entities.into_iter().map(HourlyNodeInfo::from).collect(),
                next_page,
            )
        })
}

pub async fn read_channels_hourly(
    pool: &Pool<Postgres>,
    page: usize,
) -> Result<(Vec<ChannelInfo>, usize), sqlx::Error> {
    HourlyChannelInfoDBRead::fetch_by_page_hourly(pool, page)
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
) -> Result<(Vec<ChannelInfo>, usize), sqlx::Error> {
    HourlyChannelInfoDBRead::fetch_by_page_nearly_a_month(pool, page)
        .await
        .map(|(entities, next_page)| {
            (
                entities.into_iter().map(ChannelInfo::from).collect(),
                next_page,
            )
        })
}

pub async fn query_node_udt_relation(
    pool: &Pool<Postgres>,
    node_id: JsonBytes,
) -> Result<UdtCfgInfos, sqlx::Error> {
    let sql = r#"
        select id, name, code_hash, hash_type, args, auto_accept_amount 
        from udt_infos 
        join node_udt_relations on udt_infos.id = node_udt_relations.udt_info_id 
        where node_id = $1
    "#;

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
                        faster_hex::hex_decode(&code_hash_str.as_bytes(), &mut code_hash_bytes)
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
                        faster_hex::hex_decode(&args_str.as_bytes(), &mut args_bytes).unwrap();
                        JsonBytes::from_vec(args_bytes)
                    },
                },
                auto_accept_amount: {
                    let amount: Option<String> = row.get("auto_accept_amount");
                    amount.map(|amt| {
                        let mut buf = [0u8; 16];
                        faster_hex::hex_decode(&amt.as_bytes(), &mut buf).unwrap();
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
                        if outpoint_tx_hash.is_some() && outpoint_index.is_some() {
                            Some(UdtCellDep {
                                out_point: OutPointWrapper {
                                    tx_hash: {
                                        let mut buf = [0; 32];
                                        faster_hex::hex_decode(
                                            outpoint_tx_hash.unwrap().as_bytes(),
                                            &mut buf,
                                        )
                                        .unwrap();
                                        H256::from(buf)
                                    },
                                    index: {
                                        let mut buf = [0; 4];
                                        faster_hex::hex_decode(
                                            outpoint_index.unwrap().as_bytes(),
                                            &mut buf,
                                        )
                                        .unwrap();
                                        u32::from_le_bytes(buf).into()
                                    },
                                },
                                dep_type: match row.get::<String, _>("dep_type").as_str() {
                                    "code" => DepType::Code,
                                    "dep_group" => DepType::DepGroup,
                                    _ => panic!("Unknown dep type"),
                                },
                            })
                        } else {
                            None
                        }
                    },
                    type_id: {
                        let code_hash: Option<String> = row.get("code_hash");
                        if code_hash.is_some() {
                            Some(Script {
                                code_hash: {
                                    let mut buf = [0; 32];
                                    faster_hex::hex_decode(code_hash.unwrap().as_bytes(), &mut buf)
                                        .unwrap();
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
                        } else {
                            None
                        }
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
) -> Result<Vec<String>, sqlx::Error> {
    let udt_id = global_cache()
        .load()
        .udt
        .get(&udt)
        .cloned()
        .ok_or_else(|| sqlx::Error::RowNotFound)?;
    let sql = r#"
        select node_id
        from node_udt_relations
        where udt_info_id = $1
    "#;

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
pub struct ChannelCapacitys {
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
}

pub async fn query_channel_capacity_analysis_hourly(
    pool: &Pool<Postgres>,
) -> Result<Vec<ChannelCapacitys>, sqlx::Error> {
    let sql = "SELECT DISTINCT ON (channel_outpoint) channel_outpoint, capacity from online_channels_hourly WHERE bucket >= $1::timestamp ORDER BY channel_outpoint, bucket DESC";
    let start_time = chrono::Utc::now() - chrono::Duration::hours(3);
    let mut channel_capacitys = sqlx::query(sql)
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
    Ok(vec![ChannelCapacitys {
        max_capacity,
        min_capacity,
        avg_capacity,
        total_capacity,
        median_capacity,
    }])
}
