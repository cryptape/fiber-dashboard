mod operates;
mod types;

use arc_swap::ArcSwap;
use ckb_jsonrpc_types::{JsonBytes, Script};
use ckb_types::bytes::Bytes;
use sqlx::{Pool, Postgres};

use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, LazyLock},
};

pub use operates::*;
pub use types::*;

pub const UDT_INFO_CACHE_SQL: &str = "SELECT id, code_hash, hash_type, args FROM udt_infos";
pub const UDT_NODE_RELATION_CACHE_SQL: &str = "SELECT 
  node_id,
  array_agg(udt_info_id) AS udt_info_ids
FROM node_udt_relations
GROUP BY node_id";

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
