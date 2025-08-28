use sqlx::types::chrono::{DateTime, Utc};
use sqlx::{FromRow, Pool, Postgres};

use ckb_jsonrpc_types::{JsonBytes, Script};
use ckb_types::H256;
use multiaddr::MultiAddr;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;

use crate::{
    Network,
    types::{ChannelUpdateInfo, U64Hex, U128Hex},
};

const SELECT_HOURLY_NODES_SQL: &str = "SELECT DISTINCT ON (node_id)
  online_nodes_hourly.node_id as node_id,
  bucket AS last_seen_hour,
  node_name,
  addresses,
  announce_timestamp,
  chain_hash,
  auto_accept_min_ckb_funding_amount,
  country,
  city,
  region,
  loc
FROM {}
WHERE bucket >= $1::timestamp
ORDER BY node_id, bucket DESC";

const SELECT_HOURLY_CHANNELS_SQL: &str = "SELECT DISTINCT ON (channel_outpoint)
  channel_outpoint,
  bucket AS last_seen_hour,
  node1,
  node2,
  capacity,
  chain_hash,
  created_timestamp,
  update_of_node1_timestamp,
  update_of_node1_enabled,
  update_of_node1_outbound_liquidity,
  update_of_node1_tlc_expiry_delta,
  update_of_node1_tlc_minimum_value,
  update_of_node1_fee_rate,
  update_of_node2_timestamp,
  update_of_node2_enabled,
  update_of_node2_outbound_liquidity,
  update_of_node2_tlc_expiry_delta,
  update_of_node2_tlc_minimum_value,
  update_of_node2_fee_rate,
  {2}.name AS udt_name,
  {2}.code_hash AS udt_code_hash,
  {2}.hash_type AS udt_hash_type,
  {2}.args AS udt_args,
  {2}.auto_accept_amount AS udt_auto_accept_amount
FROM {1}
left join udt_infos on {1}.udt_type_script = {2}.id
WHERE bucket >= $1::timestamp
ORDER BY channel_outpoint, bucket DESC";

const SELECT_MONTHLY_NODES_SQL: &str = "SELECT
  node_id,
  bucket AS last_seen_hour,
  node_name,
  addresses,
  announce_timestamp,
  chain_hash,
  auto_accept_min_ckb_funding_amount,
  country,
  city,
  region,
  loc
FROM {}
WHERE bucket >= $1::timestamp and bucket < $2::timestamp
ORDER BY node_id, bucket DESC";

const SELECT_MONTHLY_CHANNELS_SQL: &str = "SELECT
  channel_outpoint,
  bucket AS last_seen_hour,
  node1,
  node2,
  capacity,
  chain_hash,
  created_timestamp,
  update_of_node1_timestamp,
  update_of_node1_enabled,
  update_of_node1_outbound_liquidity,
  update_of_node1_tlc_expiry_delta,
  update_of_node1_tlc_minimum_value,
  update_of_node1_fee_rate,
  update_of_node2_timestamp,
  update_of_node2_enabled,
  update_of_node2_outbound_liquidity,
  update_of_node2_tlc_expiry_delta,
  update_of_node2_tlc_minimum_value,
  update_of_node2_fee_rate,
  {2}.name AS udt_name,
  {2}.code_hash AS udt_code_hash,
  {2}.hash_type AS udt_hash_type,
  {2}.args AS udt_args,
  {2}.auto_accept_amount AS udt_auto_accept_amount
FROM {1}
left join {2} on {1}.udt_type_script = {2}.id
WHERE bucket >= $1::timestamp and bucket < $2::timestamp
ORDER BY channel_outpoint, bucket DESC";

const PAGE_SIZE: usize = 500;

#[serde_as]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HourlyNodeInfo {
    pub node_id: String,
    pub node_name: String,
    pub addresses: Vec<MultiAddr>,
    pub commit_timestamp: String,
    /// The latest timestamp set by the owner for the node announcement.
    /// When a Node is online this timestamp will be updated to the latest value.
    pub announce_timestamp: u64,
    /// The chain hash of the node.
    pub chain_hash: H256,
    /// The minimum CKB funding amount for automatically accepting open channel requests.
    pub auto_accept_min_ckb_funding_amount: u64,
    pub country: Option<String>,
    pub city: Option<String>,
    pub region: Option<String>,
    pub loc: Option<String>,
}

impl From<HourlyNodeInfoDBRead> for HourlyNodeInfo {
    fn from(info: HourlyNodeInfoDBRead) -> Self {
        HourlyNodeInfo {
            node_name: info.node_name,
            addresses: serde_json::from_str(&info.addresses).unwrap(),
            node_id: format!("0x{}", info.node_id),
            commit_timestamp: info.last_seen_hour.to_rfc3339(),
            announce_timestamp: info.announce_timestamp.timestamp_millis() as u64,
            chain_hash: {
                let mut hash_bytes = [0u8; 32];
                faster_hex::hex_decode(info.chain_hash.as_bytes(), &mut hash_bytes).unwrap();
                H256::from(hash_bytes)
            },
            auto_accept_min_ckb_funding_amount: {
                let mut amount_bytes = [0u8; 8];
                faster_hex::hex_decode(
                    info.auto_accept_min_ckb_funding_amount.as_bytes(),
                    &mut amount_bytes,
                )
                .unwrap();
                u64::from_le_bytes(amount_bytes)
            },
            country: info.country,
            city: info.city,
            region: info.region,
            loc: info.loc,
        }
    }
}

#[derive(Debug, Clone, FromRow)]
pub struct HourlyNodeInfoDBRead {
    pub node_id: String,
    pub last_seen_hour: DateTime<Utc>,
    pub node_name: String,
    pub addresses: String,
    pub announce_timestamp: DateTime<Utc>,
    pub chain_hash: String,
    pub auto_accept_min_ckb_funding_amount: String,
    pub country: Option<String>,
    pub city: Option<String>,
    pub region: Option<String>,
    pub loc: Option<String>,
}

impl HourlyNodeInfoDBRead {
    /// fetch all hourly node information from the database.
    pub async fn fetch_all(pool: &Pool<Postgres>, net: Network) -> Result<Vec<Self>, sqlx::Error> {
        let hour_bucket = Utc::now() - chrono::Duration::hours(3);
        let sql = SELECT_HOURLY_NODES_SQL.replace("{}", net.online_nodes_hourly());
        sqlx::query_as::<_, Self>(&sql)
            .bind(hour_bucket)
            .fetch_all(pool)
            .await
    }

    pub async fn fetch_by_page_hourly(
        pool: &Pool<Postgres>,
        page: usize,
        net: Network,
    ) -> Result<(Vec<Self>, usize), sqlx::Error> {
        let offset = page.saturating_mul(PAGE_SIZE);
        let hour_bucket = Utc::now() - chrono::Duration::hours(3);
        let sql = SELECT_HOURLY_NODES_SQL.replace("{}", net.online_nodes_hourly());
        sqlx::query_as::<_, Self>(&format!("{} LIMIT {} OFFSET {}", sql, PAGE_SIZE, offset))
            .bind(hour_bucket)
            .fetch_all(pool)
            .await
            .map(|rows| (rows, page.saturating_add(1)))
    }

    pub async fn fetch_by_page_monthly(
        pool: &Pool<Postgres>,
        page: usize,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        net: Network,
    ) -> Result<(Vec<Self>, usize), sqlx::Error> {
        let offset = page.saturating_mul(PAGE_SIZE);
        let sql = SELECT_MONTHLY_NODES_SQL.replace("{}", net.online_nodes_hourly());
        sqlx::query_as::<_, Self>(&format!("{} LIMIT {} OFFSET {}", sql, PAGE_SIZE, offset))
            .bind(start)
            .bind(end)
            .fetch_all(pool)
            .await
            .map(|rows| (rows, page.saturating_add(1)))
    }
}

#[serde_as]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChannelInfo {
    /// The outpoint of the channel.
    pub channel_outpoint: String,
    /// The identity public key of the first node.
    pub node1: String,
    /// The identity public key of the second node.
    pub node2: String,
    pub commit_timestamp: String,
    #[serde_as(as = "U64Hex")]
    pub created_timestamp: u64,

    /// The update info from node1 to node2, e.g. timestamp, fee_rate, tlc_expiry_delta, tlc_minimum_value
    pub update_info_of_node1: Option<ChannelUpdateInfo>,

    /// The update info from node2 to node1, e.g. timestamp, fee_rate, tlc_expiry_delta, tlc_minimum_value
    pub update_info_of_node2: Option<ChannelUpdateInfo>,

    /// The capacity of the channel.
    #[serde_as(as = "U128Hex")]
    pub capacity: u128,
    /// The chain hash of the channel.
    pub chain_hash: H256,
    /// The UDT type script of the channel.
    pub udt_type_script: Option<Script>,
}

impl From<HourlyChannelInfoDBRead> for ChannelInfo {
    fn from(info: HourlyChannelInfoDBRead) -> Self {
        ChannelInfo {
            channel_outpoint: format!("0x{}", info.channel_outpoint),
            node1: format!("0x{}", info.node1),
            node2: format!("0x{}", info.node2),
            capacity: {
                let mut capacity_bytes = [0u8; 16];
                faster_hex::hex_decode(info.capacity.as_bytes(), &mut capacity_bytes).unwrap();
                u128::from_le_bytes(capacity_bytes)
            },
            chain_hash: {
                let mut hash_bytes = [0u8; 32];
                faster_hex::hex_decode(info.chain_hash.as_bytes(), &mut hash_bytes).unwrap();
                H256::from(hash_bytes)
            },
            commit_timestamp: info.last_seen_hour.to_rfc3339(),
            created_timestamp: info.created_timestamp.timestamp_millis() as u64,
            update_info_of_node1: info.update_of_node1_timestamp.map(|timestamp| {
                ChannelUpdateInfo {
                    timestamp: timestamp.timestamp_millis() as u64,
                    enabled: info.update_of_node1_enabled.unwrap_or(false),
                    outbound_liquidity: info.update_of_node1_outbound_liquidity.map(|ol| {
                        let mut ol_bytes = [0u8; 16];
                        faster_hex::hex_decode(ol.as_bytes(), &mut ol_bytes).unwrap();
                        u128::from_le_bytes(ol_bytes)
                    }),
                    tlc_expiry_delta: {
                        let mut delta_bytes = [0u8; 8];
                        faster_hex::hex_decode(
                            info.update_of_node1_tlc_expiry_delta
                                .as_ref()
                                .unwrap()
                                .as_bytes(),
                            &mut delta_bytes,
                        )
                        .unwrap();
                        u64::from_le_bytes(delta_bytes)
                    },
                    tlc_minimum_value: {
                        let mut min_value_bytes = [0u8; 16];
                        faster_hex::hex_decode(
                            info.update_of_node1_tlc_minimum_value
                                .as_ref()
                                .unwrap()
                                .as_bytes(),
                            &mut min_value_bytes,
                        )
                        .unwrap();
                        u128::from_le_bytes(min_value_bytes)
                    },
                    fee_rate: {
                        let mut fee_rate_bytes = [0u8; 8];
                        faster_hex::hex_decode(
                            info.update_of_node1_fee_rate.as_ref().unwrap().as_bytes(),
                            &mut fee_rate_bytes,
                        )
                        .unwrap();
                        u64::from_le_bytes(fee_rate_bytes)
                    },
                }
            }),
            update_info_of_node2: info.update_of_node2_timestamp.map(|timestamp| {
                ChannelUpdateInfo {
                    timestamp: timestamp.timestamp_millis() as u64,
                    enabled: info.update_of_node2_enabled.unwrap_or(false),
                    outbound_liquidity: info.update_of_node2_outbound_liquidity.map(|ol| {
                        let mut ol_bytes = [0u8; 16];
                        faster_hex::hex_decode(ol.as_bytes(), &mut ol_bytes).unwrap();
                        u128::from_le_bytes(ol_bytes)
                    }),
                    tlc_expiry_delta: {
                        let mut delta_bytes = [0u8; 8];
                        faster_hex::hex_decode(
                            info.update_of_node2_tlc_expiry_delta
                                .as_ref()
                                .unwrap()
                                .as_bytes(),
                            &mut delta_bytes,
                        )
                        .unwrap();
                        u64::from_le_bytes(delta_bytes)
                    },
                    tlc_minimum_value: {
                        let mut min_value_bytes = [0u8; 16];
                        faster_hex::hex_decode(
                            info.update_of_node2_tlc_minimum_value
                                .as_ref()
                                .unwrap()
                                .as_bytes(),
                            &mut min_value_bytes,
                        )
                        .unwrap();
                        u128::from_le_bytes(min_value_bytes)
                    },
                    fee_rate: {
                        let mut fee_rate_bytes = [0u8; 8];
                        faster_hex::hex_decode(
                            info.update_of_node2_fee_rate.as_ref().unwrap().as_bytes(),
                            &mut fee_rate_bytes,
                        )
                        .unwrap();
                        u64::from_le_bytes(fee_rate_bytes)
                    },
                }
            }),
            udt_type_script: info.udt_hash_type.map(|hash_type| Script {
                code_hash: {
                    let mut code_hash_bytes = [0u8; 32];
                    faster_hex::hex_decode(
                        info.udt_code_hash.as_ref().unwrap().as_bytes(),
                        &mut code_hash_bytes,
                    )
                    .unwrap();
                    H256::from(code_hash_bytes)
                },
                hash_type: match hash_type.as_str() {
                    "type" => ckb_jsonrpc_types::ScriptHashType::Type,
                    "data" => ckb_jsonrpc_types::ScriptHashType::Data,
                    "data1" => ckb_jsonrpc_types::ScriptHashType::Data1,
                    "data2" => ckb_jsonrpc_types::ScriptHashType::Data2,
                    _ => unreachable!("Unknown hash type: {}", hash_type),
                },
                args: {
                    let mut args_bytes = vec![0; info.udt_args.as_ref().unwrap().len() / 2];
                    faster_hex::hex_decode(
                        info.udt_args.as_ref().unwrap().as_bytes(),
                        &mut args_bytes,
                    )
                    .unwrap();
                    JsonBytes::from_vec(args_bytes)
                },
            }),
        }
    }
}

#[derive(Debug, Clone, FromRow)]
pub struct HourlyChannelInfoDBRead {
    pub channel_outpoint: String,
    pub last_seen_hour: DateTime<Utc>,
    pub node1: String,
    pub node2: String,
    pub capacity: String,
    pub chain_hash: String,
    pub created_timestamp: DateTime<Utc>,

    // Node1 updates
    pub update_of_node1_timestamp: Option<DateTime<Utc>>,
    pub update_of_node1_enabled: Option<bool>,
    pub update_of_node1_outbound_liquidity: Option<String>,
    pub update_of_node1_tlc_expiry_delta: Option<String>,
    pub update_of_node1_tlc_minimum_value: Option<String>,
    pub update_of_node1_fee_rate: Option<String>,

    // Node2 updates
    pub update_of_node2_timestamp: Option<DateTime<Utc>>,
    pub update_of_node2_enabled: Option<bool>,
    pub update_of_node2_outbound_liquidity: Option<String>,
    pub update_of_node2_tlc_expiry_delta: Option<String>,
    pub update_of_node2_tlc_minimum_value: Option<String>,
    pub update_of_node2_fee_rate: Option<String>,

    // UDT info (from JOIN)
    pub udt_name: Option<String>,
    pub udt_code_hash: Option<String>,
    pub udt_hash_type: Option<String>,
    pub udt_args: Option<String>,
    pub udt_auto_accept_amount: Option<String>,
}

impl HourlyChannelInfoDBRead {
    /// fetch all active channel information from the database.
    pub async fn fetch_all(pool: &Pool<Postgres>, net: Network) -> Result<Vec<Self>, sqlx::Error> {
        let hour_bucket = Utc::now() - chrono::Duration::hours(3);
        let sql = SELECT_HOURLY_CHANNELS_SQL
            .replace("{1}", net.online_channels_hourly())
            .replace("{2}", net.udt_infos());
        sqlx::query_as::<_, Self>(&sql)
            .bind(hour_bucket)
            .fetch_all(pool)
            .await
    }

    pub async fn fetch_by_page_hourly(
        pool: &Pool<Postgres>,
        page: usize,
        net: Network,
    ) -> Result<(Vec<Self>, usize), sqlx::Error> {
        let offset = page.saturating_mul(PAGE_SIZE);
        let hour_bucket = Utc::now() - chrono::Duration::hours(3);
        let sql = SELECT_HOURLY_CHANNELS_SQL
            .replace("{1}", net.online_channels_hourly())
            .replace("{2}", net.udt_infos());
        sqlx::query_as::<_, Self>(&format!("{} LIMIT {} OFFSET {}", sql, PAGE_SIZE, offset))
            .bind(hour_bucket)
            .fetch_all(pool)
            .await
            .map(|rows| (rows, page.saturating_add(1)))
    }

    pub async fn fetch_by_page_monthly(
        pool: &Pool<Postgres>,
        page: usize,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
        net: Network,
    ) -> Result<(Vec<Self>, usize), sqlx::Error> {
        let offset = page.saturating_mul(PAGE_SIZE);
        let sql = SELECT_MONTHLY_CHANNELS_SQL
            .replace("{1}", net.online_channels_hourly())
            .replace("{2}", net.udt_infos());
        sqlx::query_as::<_, Self>(&format!("{} LIMIT {} OFFSET {}", sql, PAGE_SIZE, offset))
            .bind(start)
            .bind(end)
            .fetch_all(pool)
            .await
            .map(|rows| (rows, page.saturating_add(1)))
    }
}
