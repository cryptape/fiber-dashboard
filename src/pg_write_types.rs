use std::{
    collections::{HashMap, HashSet},
    net::SocketAddr,
    sync::{Arc, LazyLock},
};

use arc_swap::ArcSwap;
use ckb_jsonrpc_types::{DepType, JsonBytes, Script};
use ckb_types::bytes::Bytes;
use faster_hex::hex_string;
use multiaddr::{Multiaddr, Protocol};
use sqlx::types::chrono::{DateTime, Utc};
use sqlx::{PgConnection, Pool, Postgres, QueryBuilder};

use crate::{
    ip_location::lookup_ipinfo,
    types::{ChannelInfo, NodeInfo},
};

pub const UDT_INFO_INSERT_SQL: &str =
    "insert into udt_infos (id, name, code_hash, hash_type, args, auto_accept_amount) ";
pub const UDT_DEP_RELATION_INSERT_SQL: &str = "insert into udt_dep (outpoint_tx_hash, outpoint_index, dep_type, code_hash, hash_type, args, udt_info_id) ";
pub const UDT_NODE_RELATION_INSERT_SQL: &str =
    "insert into node_udt_relations (node_id, udt_info_id) ";
pub const NODE_INFO_INSERT_SQL: &str = "insert into node_infos (time, node_name, addresses, node_id, announce_timestamp, chain_hash, auto_accept_min_ckb_funding_amount, country, city, region, loc) ";
pub const CHANNEL_INFO_INSERT_SQL: &str = "insert into channel_infos (
    time, channel_outpoint, node1, node2, capacity, chain_hash, udt_type_script, 
    created_timestamp, update_of_node1_timestamp, update_of_node1_enabled, 
    update_of_node1_outbound_liquidity, update_of_node1_tlc_expiry_delta, 
    update_of_node1_tlc_minimum_value, update_of_node1_fee_rate, 
    update_of_node2_timestamp, update_of_node2_enabled, 
    update_of_node2_outbound_liquidity, update_of_node2_tlc_expiry_delta, 
    update_of_node2_tlc_minimum_value, update_of_node2_fee_rate
) ";

pub const UDT_INFO_CACHE_SQL: &str = "SELECT id, code_hash, hash_type, args FROM udt_infos";
pub const UDT_NODE_RELATION_CACHE_SQL: &str = "SELECT 
  node_id,
  array_agg(udt_info_id) AS udt_info_ids
FROM node_udt_relations
GROUP BY node_id";

#[derive(sqlx::FromRow)]
struct UdtInfoCache {
    id: i32,
    code_hash: String,
    hash_type: String,
    args: String,
}

pub async fn init_global_cache(pool: &Pool<Postgres>) {
    let mut conn = pool.acquire().await.expect("Failed to acquire connection");

    // Load UDT infos into cache
    let udt_infos: Vec<UdtInfoCache> = sqlx::query_as(UDT_INFO_CACHE_SQL)
        .fetch_all(&mut *conn)
        .await
        .expect("Failed to fetch UDT infos");

    let mut udt_map = HashMap::new();
    for udt in udt_infos {
        udt_map.insert(
            Script {
                code_hash: {
                    let mut buf = [0; 32];
                    faster_hex::hex_decode(udt.code_hash.as_bytes(), &mut buf).unwrap();
                    buf.into()
                },
                hash_type: match udt.hash_type.as_str() {
                    "type" => ckb_jsonrpc_types::ScriptHashType::Type,
                    "data" => ckb_jsonrpc_types::ScriptHashType::Data,
                    "data1" => ckb_jsonrpc_types::ScriptHashType::Data1,
                    "data2" => ckb_jsonrpc_types::ScriptHashType::Data2,
                    _ => panic!("Unknown hash type: {}", udt.hash_type),
                },
                args: {
                    let mut buf = vec![0; udt.args.len() / 2];
                    faster_hex::hex_decode(udt.args.as_bytes(), &mut buf).unwrap();
                    JsonBytes::from_vec(buf)
                },
            },
            udt.id,
        );
    }

    // Load UDT node relations into cache
    let rows: Vec<(String, Vec<i32>)> = sqlx::query_as(UDT_NODE_RELATION_CACHE_SQL)
        .fetch_all(&mut *conn)
        .await
        .expect("Failed to fetch UDT node relations");

    let mut udt_node_map = HashMap::new();
    for (node_id, udt_info_ids) in rows {
        udt_node_map.insert(Bytes::from(node_id), HashSet::from_iter(udt_info_ids));
    }

    global_cache().store(Arc::new(RelationCache {
        udt: udt_map,
        udt_node: udt_node_map,
    }));
}

fn global_cache() -> &'static ArcSwap<RelationCache> {
    static GLOBAL_CACHE: LazyLock<ArcSwap<RelationCache>> =
        LazyLock::new(|| ArcSwap::new(Arc::new(RelationCache::default())));
    &*GLOBAL_CACHE
}

#[derive(Debug, Clone, Default)]
struct RelationCache {
    udt: HashMap<Script, i32>,
    udt_node: HashMap<Bytes, HashSet<i32>>,
}

pub struct UdtInfos {
    id: i32,
    name: String,
    code_hash: String,
    hash_type: String,
    args: String,
    auto_accept_amount: String,
}

impl UdtInfos {
    pub fn into_sql(self) -> String {
        let id = self.id;
        let name = self.name;
        let code_hash = self.code_hash;
        let hash_type = self.hash_type;
        let args = self.args;
        let auto_accept_amount: String = self.auto_accept_amount;

        format!("({id}, '{name}', '{code_hash}', '{hash_type}', '{args}', '{auto_accept_amount}')")
    }

    pub async fn insert_batch(
        conn: &mut PgConnection,
        udts: &[UdtInfos],
    ) -> Result<(), sqlx::Error> {
        if udts.is_empty() {
            return Ok(());
        }
        let mut query_builder: QueryBuilder<'_, sqlx::Postgres> =
            QueryBuilder::new(UDT_INFO_INSERT_SQL);

        query_builder.push_values(udts.iter().take(65535 / 6), |mut b, udt| {
            b.push_bind(udt.id)
                .push_bind(&udt.name)
                .push_bind(&udt.code_hash)
                .push_bind(&udt.hash_type)
                .push_bind(&udt.args)
                .push_bind(&udt.auto_accept_amount);
        });

        query_builder.build().execute(conn).await?;
        Ok(())
    }
}

pub struct UdtdepRelation {
    outpoint_tx_hash: Option<String>,
    outpoint_index: Option<String>,
    dep_type: Option<String>,
    code_hash: Option<String>,
    hash_type: Option<String>,
    args: Option<String>,
    udt_info_id: i32,
}

impl UdtdepRelation {
    pub fn into_sql(self) -> String {
        let outpoint_tx_hash = self.outpoint_tx_hash.unwrap_or("NULL".to_string());
        let outpoint_index = self.outpoint_index.unwrap_or("NULL".to_string());
        let dep_type = self.dep_type.unwrap_or("NULL".to_string());
        let code_hash = self.code_hash.unwrap_or("NULL".to_string());
        let hash_type = self.hash_type.unwrap_or("NULL".to_string());
        let args = self.args.unwrap_or("NULL".to_string());
        let udt_info_id = self.udt_info_id;

        format!(
            "('{}', '{}', '{}', '{}', '{}', '{}', {})",
            outpoint_tx_hash, outpoint_index, dep_type, code_hash, hash_type, args, udt_info_id
        )
    }

    pub async fn use_sqlx(
        conn: &mut PgConnection,
        relations: &[UdtdepRelation],
    ) -> Result<(), sqlx::Error> {
        if relations.is_empty() {
            return Ok(());
        }
        let mut query_builder: QueryBuilder<'_, sqlx::Postgres> =
            QueryBuilder::new(UDT_DEP_RELATION_INSERT_SQL);

        query_builder.push_values(relations.iter().take(65535 / 7), |mut b, relation| {
            b.push_bind(&relation.outpoint_tx_hash)
                .push_bind(&relation.outpoint_index)
                .push_bind(&relation.dep_type)
                .push_bind(&relation.code_hash)
                .push_bind(&relation.hash_type)
                .push_bind(&relation.args)
                .push_bind(relation.udt_info_id);
        });

        query_builder.build().execute(conn).await?;
        Ok(())
    }
}

pub struct UdtNodeRelation {
    node_id: String,
    udt_info_id: i32,
}

impl UdtNodeRelation {
    pub fn into_sql(self) -> String {
        format!("('{}', {})", self.node_id, self.udt_info_id)
    }

    pub async fn use_sqlx(
        conn: &mut PgConnection,
        relations: &[UdtNodeRelation],
    ) -> Result<(), sqlx::Error> {
        if relations.is_empty() {
            return Ok(());
        }
        let mut query_builder: QueryBuilder<'_, sqlx::Postgres> =
            QueryBuilder::new(UDT_NODE_RELATION_INSERT_SQL);

        query_builder.push_values(relations.iter().take(65535 / 2), |mut b, relation| {
            b.push_bind(&relation.node_id)
                .push_bind(relation.udt_info_id);
        });

        query_builder.build().execute(conn).await?;
        Ok(())
    }
}

pub struct NodeInfoDBSchema {
    pub node_name: String,
    // json list
    pub addresses: String,
    // hex string
    pub node_id: String,
    pub announce_timestamp: DateTime<Utc>,
    // hex string
    pub chain_hash: String,
    pub auto_accept_min_ckb_funding_amount: String,
    pub country: String,
    pub city: String,
    pub region: String,
    pub loc: String,
}

impl NodeInfoDBSchema {
    pub fn into_sql(self, time: &DateTime<Utc>) -> String {
        let time = time.to_rfc3339();
        let node_name = self.node_name;
        let addresses = self.addresses;
        let node_id = self.node_id;
        let announce_timestamp = self.announce_timestamp.to_rfc3339();
        let chain_hash = self.chain_hash;
        let auto_accept_min_ckb_funding_amount = self.auto_accept_min_ckb_funding_amount;
        let country = self.country;
        let city = self.city;
        let region = self.region;
        let loc = self.loc;

        format!(
            "('{time}', '{node_name}', '{addresses}', '{node_id}', '{announce_timestamp}', '{chain_hash}', '{auto_accept_min_ckb_funding_amount}', '{country}', '{city}', '{region}', '{loc}')",
        )
    }

    pub async fn use_sqlx(
        conn: &mut PgConnection,
        nodes: &[NodeInfoDBSchema],
        time: &DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        if nodes.is_empty() {
            return Ok(());
        }
        let mut query_builder: QueryBuilder<'_, sqlx::Postgres> =
            QueryBuilder::new(NODE_INFO_INSERT_SQL);

        query_builder.push_values(nodes.iter().take(65535 / 11), |mut b, node| {
            b.push_bind(time)
                .push_bind(&node.node_name)
                .push_bind(&node.addresses)
                .push_bind(&node.node_id)
                .push_bind(node.announce_timestamp)
                .push_bind(&node.chain_hash)
                .push_bind(&node.auto_accept_min_ckb_funding_amount)
                .push_bind(&node.country)
                .push_bind(&node.city)
                .push_bind(&node.region)
                .push_bind(&node.loc);
        });

        query_builder.build().execute(conn).await?;
        Ok(())
    }
}

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

#[derive(Debug, Clone)]
pub struct ChannelInfoDBSchema {
    /// hex string
    pub channel_outpoint: String,
    /// hex string
    pub node1: String,
    /// hex string
    pub node2: String,

    /// hex string
    pub capacity: String,
    /// hex string
    pub chain_hash: String,

    pub udt_type_script: Option<i32>,

    pub created_timestamp: DateTime<Utc>,

    pub update_of_node1_timestamp: Option<DateTime<Utc>>,

    pub update_of_node1_enabled: Option<bool>,
    /// hex string
    pub update_of_node1_outbound_liquidity: Option<String>,

    pub update_of_node1_tlc_expiry_delta: Option<String>,
    /// hex string
    pub update_of_node1_tlc_minimum_value: Option<String>,

    pub update_of_node1_fee_rate: Option<String>,

    pub update_of_node2_timestamp: Option<DateTime<Utc>>,

    pub update_of_node2_enabled: Option<bool>,
    /// hex string
    pub update_of_node2_outbound_liquidity: Option<String>,

    pub update_of_node2_tlc_expiry_delta: Option<String>,
    /// hex string
    pub update_of_node2_tlc_minimum_value: Option<String>,

    pub update_of_node2_fee_rate: Option<String>,
}

impl ChannelInfoDBSchema {
    pub fn into_sql(self, time: &DateTime<Utc>) -> String {
        let time = time.to_rfc3339();
        let channel_outpoint = self.channel_outpoint;
        let node1 = self.node1;
        let node2 = self.node2;
        let capacity = self.capacity;
        let chain_hash = self.chain_hash;
        let udt_type_script = self
            .udt_type_script
            .map(|id| id.to_string())
            .unwrap_or("NULL".to_string());
        let created_timestamp = self.created_timestamp.to_rfc3339();
        let update_of_node1_timestamp = self
            .update_of_node1_timestamp
            .map(|t| t.to_rfc3339())
            .unwrap_or("NULL".to_string());
        let update_of_node1_enabled = self
            .update_of_node1_enabled
            .map(|v| v.to_string())
            .unwrap_or("NULL".to_string());
        let update_of_node1_outbound_liquidity = self
            .update_of_node1_outbound_liquidity
            .map_or("NULL".to_string(), |v| v);
        let update_of_node1_tlc_expiry_delta = self
            .update_of_node1_tlc_expiry_delta
            .map_or("NULL".to_string(), |v| v);
        let update_of_node1_tlc_minimum_value = self
            .update_of_node1_tlc_minimum_value
            .map_or("NULL".to_string(), |v| v);
        let update_of_node1_fee_rate = self
            .update_of_node1_fee_rate
            .map_or("NULL".to_string(), |v| v);

        let update_of_node2_timestamp = self
            .update_of_node2_timestamp
            .map(|t| t.to_rfc3339())
            .unwrap_or("NULL".to_string());
        let update_of_node2_enabled = self
            .update_of_node2_enabled
            .map(|v| v.to_string())
            .unwrap_or("NULL".to_string());
        let update_of_node2_outbound_liquidity = self
            .update_of_node2_outbound_liquidity
            .map_or("NULL".to_string(), |v| v);
        let update_of_node2_tlc_expiry_delta = self
            .update_of_node2_tlc_expiry_delta
            .map_or("NULL".to_string(), |v| v);
        let update_of_node2_tlc_minimum_value = self
            .update_of_node2_tlc_minimum_value
            .map_or("NULL".to_string(), |v| v);
        let update_of_node2_fee_rate = self
            .update_of_node2_fee_rate
            .map_or("NULL".to_string(), |v| v);
        format!(
            "('{time}', '{channel_outpoint}', '{node1}', '{node2}', '{capacity}', \
             '{chain_hash}', {udt_type_script}, '{created_timestamp}', \
             '{update_of_node1_timestamp}', {update_of_node1_enabled}, \
             '{update_of_node1_outbound_liquidity}', '{update_of_node1_tlc_expiry_delta}', \
             '{update_of_node1_tlc_minimum_value}', '{update_of_node1_fee_rate}', \
             '{update_of_node2_timestamp}', {update_of_node2_enabled}, \
             '{update_of_node2_outbound_liquidity}', '{update_of_node2_tlc_expiry_delta}', \
             '{update_of_node2_tlc_minimum_value}', '{update_of_node2_fee_rate}')"
        )
    }

    pub async fn use_sqlx(
        conn: &mut PgConnection,
        channels: &[ChannelInfoDBSchema],
        time: &DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        if channels.is_empty() {
            return Ok(());
        }
        let mut query_builder: QueryBuilder<'_, sqlx::Postgres> =
            QueryBuilder::new(CHANNEL_INFO_INSERT_SQL);

        query_builder.push_values(channels.iter().take(65535 / 20), |mut b, channel| {
            b.push_bind(time)
                .push_bind(&channel.channel_outpoint)
                .push_bind(&channel.node1)
                .push_bind(&channel.node2)
                .push_bind(&channel.capacity)
                .push_bind(&channel.chain_hash)
                .push_bind(channel.udt_type_script.as_ref())
                .push_bind(channel.created_timestamp)
                .push_bind(&channel.update_of_node1_timestamp)
                .push_bind(&channel.update_of_node1_enabled)
                .push_bind(&channel.update_of_node1_outbound_liquidity)
                .push_bind(&channel.update_of_node1_tlc_expiry_delta)
                .push_bind(&channel.update_of_node1_tlc_minimum_value)
                .push_bind(&channel.update_of_node1_fee_rate)
                .push_bind(&channel.update_of_node2_timestamp)
                .push_bind(&channel.update_of_node2_enabled)
                .push_bind(&channel.update_of_node2_outbound_liquidity)
                .push_bind(&channel.update_of_node2_tlc_expiry_delta)
                .push_bind(&channel.update_of_node2_tlc_minimum_value)
                .push_bind(&channel.update_of_node2_fee_rate);
        });

        query_builder.build().execute(conn).await?;
        Ok(())
    }
}

impl From<ChannelInfo> for ChannelInfoDBSchema {
    fn from(channel_info: ChannelInfo) -> Self {
        Self {
            channel_outpoint: hex_string(channel_info.channel_outpoint.as_bytes()),
            node1: String::from_utf8(channel_info.node1.to_vec()).unwrap(),
            node2: String::from_utf8(channel_info.node2.to_vec()).unwrap(),
            capacity: hex_string(channel_info.capacity.to_le_bytes().as_ref()),
            chain_hash: hex_string(channel_info.chain_hash.as_bytes()),
            udt_type_script: channel_info
                .udt_type_script
                .as_ref()
                .and_then(|script| global_cache().load().udt.get(script).cloned()),
            created_timestamp: DateTime::from_timestamp_millis(
                channel_info.created_timestamp as i64,
            )
            .unwrap(),
            update_of_node1_timestamp: channel_info
                .update_info_of_node1
                .as_ref()
                .map(|info| DateTime::from_timestamp_millis(info.timestamp as i64).unwrap()),
            update_of_node1_enabled: channel_info
                .update_info_of_node1
                .as_ref()
                .map(|info| info.enabled),
            update_of_node1_outbound_liquidity: channel_info
                .update_info_of_node1
                .as_ref()
                .and_then(|info| {
                    info.outbound_liquidity
                        .map(|v| hex_string(&v.to_le_bytes()))
                }),
            update_of_node1_tlc_expiry_delta: channel_info
                .update_info_of_node1
                .as_ref()
                .map(|info| hex_string(&info.tlc_expiry_delta.to_le_bytes())),
            update_of_node1_tlc_minimum_value: channel_info
                .update_info_of_node1
                .as_ref()
                .map(|info| hex_string(&info.tlc_minimum_value.to_le_bytes())),
            update_of_node1_fee_rate: channel_info
                .update_info_of_node1
                .as_ref()
                .map(|info| hex_string(&info.fee_rate.to_le_bytes())),
            update_of_node2_timestamp: channel_info
                .update_info_of_node2
                .as_ref()
                .map(|info| DateTime::from_timestamp_millis(info.timestamp as i64).unwrap()),
            update_of_node2_enabled: channel_info
                .update_info_of_node2
                .as_ref()
                .map(|info| info.enabled),
            update_of_node2_outbound_liquidity: channel_info
                .update_info_of_node2
                .as_ref()
                .and_then(|info| {
                    info.outbound_liquidity
                        .map(|v| hex_string(&v.to_le_bytes()))
                }),
            update_of_node2_tlc_expiry_delta: channel_info
                .update_info_of_node2
                .as_ref()
                .map(|info| hex_string(&info.tlc_expiry_delta.to_le_bytes())),
            update_of_node2_tlc_minimum_value: channel_info
                .update_info_of_node2
                .as_ref()
                .map(|info| hex_string(&info.tlc_minimum_value.to_le_bytes())),
            update_of_node2_fee_rate: channel_info
                .update_info_of_node2
                .as_ref()
                .map(|info| hex_string(&info.fee_rate.to_le_bytes())),
        }
    }
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
