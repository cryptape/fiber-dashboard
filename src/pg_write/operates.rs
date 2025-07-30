use crate::{
    ip_location::lookup_ipinfo,
    pg_write::{
        ChannelInfoDBSchema, NodeInfoDBSchema, RelationCache, UdtInfos, UdtNodeRelation,
        UdtdepRelation, global_cache,
    },
    types::NodeInfo,
};

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

    let global = global_cache().load();
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
        global_cache().store(Arc::new(new_udt_infos));
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
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    UdtInfos::insert_batch(&mut tx, udt_infos).await?;
    UdtdepRelation::use_sqlx(&mut tx, udt_dep_relations).await?;
    UdtNodeRelation::use_sqlx(&mut tx, udt_node_relations).await?;
    NodeInfoDBSchema::use_sqlx(&mut tx, node_schemas, time).await?;
    ChannelInfoDBSchema::use_sqlx(&mut tx, channel_schemas, time).await?;
    tx.commit().await?;
    Ok(())
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
