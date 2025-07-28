use serde::{Deserialize, Serialize};
use serde_with::{serde_as, serde_conv};

use ckb_jsonrpc_types::{DepType, JsonBytes, OutPoint as OutPointWrapper, Script};
use ckb_types::{H256, bytes::Bytes};
use multiaddr::MultiAddr;

#[serde_as]
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct GraphNodesParams {
    #[serde_as(as = "Option<U64Hex>")]
    /// The maximum number of nodes to return.
    pub limit: Option<u64>,
    /// The cursor to start returning nodes from.
    pub after: Option<JsonBytes>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GraphNodesResult {
    /// The list of nodes.
    pub nodes: Vec<NodeInfo>,
    /// The last cursor.
    pub last_cursor: JsonBytes,
}

#[serde_as]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NodeInfo {
    /// The name of the node.
    pub node_name: String,
    /// The addresses of the node.
    pub addresses: Vec<MultiAddr>,
    /// The identity public key of the node.
    pub node_id: Bytes,
    #[serde_as(as = "U64Hex")]
    /// The latest timestamp set by the owner for the node announcement.
    /// When a Node is online this timestamp will be updated to the latest value.
    pub timestamp: u64,
    /// The chain hash of the node.
    pub chain_hash: H256,
    #[serde_as(as = "U64Hex")]
    /// The minimum CKB funding amount for automatically accepting open channel requests.
    pub auto_accept_min_ckb_funding_amount: u64,
    /// The UDT configuration infos of the node.
    pub udt_cfg_infos: UdtCfgInfos,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UdtCfgInfos(
    /// The list of UDT configuration infos.
    pub Vec<UdtArgInfo>,
);

#[serde_as]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UdtArgInfo {
    /// The name of the UDT.
    pub name: String,
    /// The script of the UDT.
    pub script: Script,
    #[serde_as(as = "Option<U128Hex>")]
    /// The minimum amount of the UDT that can be automatically accepted.
    pub auto_accept_amount: Option<u128>,
    /// The cell deps of the UDT.
    pub cell_deps: Vec<UdtDep>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UdtDep {
    /// cell dep described by out_point.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cell_dep: Option<UdtCellDep>,
    /// cell dep described by type ID.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub type_id: Option<Script>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UdtCellDep {
    /// The out point of the cell dep.
    pub out_point: OutPointWrapper,
    /// The type of the cell dep.
    pub dep_type: DepType,
}

#[serde_as]
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct GraphChannelsParams {
    /// The maximum number of channels to return.
    #[serde_as(as = "Option<U64Hex>")]
    pub limit: Option<u64>,
    /// The cursor to start returning channels from.
    pub after: Option<JsonBytes>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GraphChannelsResult {
    /// A list of channels.
    pub channels: Vec<ChannelInfo>,
    /// The last cursor for pagination.
    pub last_cursor: JsonBytes,
}

#[serde_as]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChannelInfo {
    /// The outpoint of the channel.
    pub channel_outpoint: JsonBytes,
    /// The identity public key of the first node.
    pub node1: Bytes,
    /// The identity public key of the second node.
    pub node2: Bytes,
    /// The created timestamp of the channel, which is the block header timestamp of the block
    /// that contains the channel funding transaction.
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

#[serde_as]
#[derive(Copy, Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct ChannelUpdateInfo {
    /// The timestamp is the time when the channel update was received by the node.
    #[serde_as(as = "U64Hex")]
    pub timestamp: u64,
    /// Whether the channel can be currently used for payments (in this one direction).
    pub enabled: bool,
    /// The exact amount of balance that we can send to the other party via the channel.
    #[serde_as(as = "Option<U128Hex>")]
    pub outbound_liquidity: Option<u128>,
    /// The difference in htlc expiry values that you must have when routing through this channel (in milliseconds).
    #[serde_as(as = "U64Hex")]
    pub tlc_expiry_delta: u64,
    /// The minimum value, which must be relayed to the next hop via the channel
    #[serde_as(as = "U128Hex")]
    pub tlc_minimum_value: u128,
    /// The forwarding fee rate for the channel.
    #[serde_as(as = "U64Hex")]
    pub fee_rate: u64,
}

macro_rules! uint_as_hex {
    ($name:ident, $ty:ty) => {
        serde_conv!(
            pub $name,
            $ty,
            |u: &$ty| format!("0x{:x}", u),
            |hex: String| -> Result<$ty, String> {
                let bytes = hex.as_bytes();
                if bytes.len() < 3 || &bytes[..2] != b"0x" {
                    return Err(format!("uint hex string does not start with 0x: {}", hex));
                }
                if bytes.len() > 3 && &bytes[2..3] == b"0" {
                    return Err(format!("uint hex string starts with redundant leading zeros: {}", hex));
                };
                <$ty>::from_str_radix(&hex[2..], 16)
                    .map_err(|err| format!("failed to parse uint hex {}: {:?}", hex, err))
            }
        );
    };
}

uint_as_hex!(U128Hex, u128);
uint_as_hex!(U64Hex, u64);
uint_as_hex!(U32Hex, u32);
uint_as_hex!(U16Hex, u16);
