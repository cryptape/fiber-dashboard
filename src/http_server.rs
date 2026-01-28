use chrono::{DateTime, NaiveDate, Utc};
use ckb_jsonrpc_types::{JsonBytes, Script};
use salvo::{Request, Response, handler, macros::Extractible};
use serde::{Deserialize, Serialize};

use crate::{
    Network, get_pg_pool,
    pg_read::{
        AnalysisParams, ChannelInfo, HourlyNodeInfo, group_channel_by_state,
        group_channel_count_by_state, query_analysis, query_analysis_hourly,
        query_channel_capacity_distribution, query_channel_count_by_asset, query_channel_info,
        query_channel_state, query_channels_by_node_id, query_node_info, query_nodes_by_region,
        query_nodes_fuzzy_by_name, read_channels_hourly, read_channels_monthly, read_nodes_hourly,
        read_nodes_monthly,
    },
    pg_write::DBState,
};

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
pub(crate) struct Page {
    pub(crate) page: usize,
    #[serde(default)]
    pub(crate) net: Network,
    pub(crate) start: Option<NaiveDate>,
    pub(crate) end: Option<NaiveDate>,
    pub(crate) page_size: Option<usize>,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct NodeId {
    node_id: JsonBytes,
    #[serde(default)]
    page: usize,
    #[serde(default)]
    net: Network,
    pub(crate) page_size: Option<usize>,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
pub(crate) struct FuzzyNodeName {
    pub(crate) node_name: String,
    pub(crate) page: usize,
    #[serde(default)]
    pub(crate) net: Network,
    #[serde(default)]
    pub(crate) order: Order,
    #[serde(default)]
    pub(crate) sort_by: ListNodesHourlySortBy,
    pub(crate) page_size: Option<usize>,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
pub(crate) struct NodeByRegion {
    pub(crate) region: String,
    pub(crate) page: usize,
    #[serde(default)]
    pub(crate) net: Network,
    #[serde(default)]
    pub(crate) order: Order,
    #[serde(default)]
    pub(crate) sort_by: ListNodesHourlySortBy,
    pub(crate) page_size: Option<usize>,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "body")))]
struct NodesByUdt {
    udt: Script,
    #[serde(default)]
    net: Network,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct NetworkInfo {
    #[serde(default)]
    net: Network,
}

#[derive(Debug, Serialize, Deserialize)]
struct NodePage {
    next_page: usize,
    nodes: Vec<HourlyNodeInfo>,
    total_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChannelPage {
    next_page: usize,
    channels: Vec<ChannelInfo>,
    total_count: usize,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
pub(crate) struct ListNodesHourlyParams {
    pub(crate) page: usize,
    #[serde(default)]
    pub(crate) net: Network,
    #[serde(default)]
    pub(crate) order: Order,
    #[serde(default)]
    pub(crate) sort_by: ListNodesHourlySortBy,
    pub(crate) page_size: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub(crate) enum ListNodesHourlySortBy {
    #[serde(rename = "region")]
    Region,
    #[default]
    #[serde(rename = "last_seen")]
    LastSeen,
    #[serde(rename = "channel_count")]
    ChannelCount,
}

impl ListNodesHourlySortBy {
    pub fn as_str(&self) -> &str {
        match self {
            ListNodesHourlySortBy::Region => "country_or_region",
            ListNodesHourlySortBy::LastSeen => "last_seen_hour",
            ListNodesHourlySortBy::ChannelCount => "channel_count",
        }
    }
}

#[handler]
pub async fn list_nodes_hourly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req
        .extract::<ListNodesHourlyParams>(&mut Default::default())
        .await?;
    let pool = get_pg_pool();
    let nodes = read_nodes_hourly(pool, params).await.map_err(|e| {
        log::error!("Failed to read nodes: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to read nodes"))
    })?;
    Ok(serde_json::to_string(&NodePage {
        next_page: nodes.1,
        nodes: nodes.0,
        total_count: nodes.2,
    })?)
}

#[handler]
pub async fn list_nodes_monthly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let page = req.extract::<Page>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let nodes = read_nodes_monthly(pool, page).await.map_err(|e| {
        log::error!("Failed to read nodes: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to read nodes"))
    })?;
    Ok(serde_json::to_string(&NodePage {
        next_page: nodes.1,
        nodes: nodes.0,
        total_count: nodes.2,
    })?)
}

#[handler]
pub async fn nodes_fuzzy_by_name_or_id(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req
        .extract::<FuzzyNodeName>(&mut Default::default())
        .await?;
    let pool = get_pg_pool();

    let nodes = query_nodes_fuzzy_by_name(pool, params).await.map_err(|e| {
        log::error!("Failed to query nodes by name or id: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to query nodes by name or id"))
    })?;
    Ok(serde_json::to_string(&NodePage {
        next_page: nodes.1,
        nodes: nodes.0,
        total_count: nodes.2,
    })?)
}

#[handler]
pub async fn nodes_by_region(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req.extract::<NodeByRegion>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let nodes = query_nodes_by_region(pool, params).await.map_err(|e| {
        log::error!("Failed to query nodes by region: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to query nodes by region"))
    })?;
    Ok(serde_json::to_string(&NodePage {
        next_page: nodes.1,
        nodes: nodes.0,
        total_count: nodes.2,
    })?)
}

#[handler]
pub async fn list_channels_hourly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let page = req.extract::<Page>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let channels = read_channels_hourly(pool, page).await.map_err(|e| {
        log::error!("Failed to read channels: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to read channels"))
    })?;
    Ok(serde_json::to_string(&ChannelPage {
        next_page: channels.1,
        channels: channels.0,
        total_count: channels.2,
    })?)
}

#[handler]
pub async fn list_channels_monthly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let page = req.extract::<Page>(&mut Default::default()).await?;
    let pool = get_pg_pool();

    let channels = read_channels_monthly(pool, page).await.map_err(|e| {
        log::error!("Failed to read channels: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to read channels"))
    })?;
    Ok(serde_json::to_string(&ChannelPage {
        next_page: channels.1,
        channels: channels.0,
        total_count: channels.2,
    })?)
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
pub(crate) struct ChannelByNodeIdParams {
    pub(crate) node_id: JsonBytes,
    pub(crate) page: usize,
    #[serde(default)]
    pub(crate) sort_by: ChannelSortBy,
    #[serde(default)]
    pub(crate) order: Order,
    #[serde(default)]
    pub(crate) net: Network,
    pub(crate) page_size: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub(crate) enum ChannelSortBy {
    #[serde(rename = "create_time")]
    CreateTime,
    #[default]
    #[serde(rename = "last_commit_time")]
    LastCommitTime,
    #[serde(rename = "capacity")]
    Capacity,
}

impl ChannelSortBy {
    pub fn as_str(&self) -> &str {
        match self {
            ChannelSortBy::CreateTime => "n.created_timestamp",
            ChannelSortBy::LastCommitTime => "c.last_commit_time",
            ChannelSortBy::Capacity => "n.capacity",
        }
    }
}

#[handler]
pub async fn channels_by_node_id(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req
        .extract::<ChannelByNodeIdParams>(&mut Default::default())
        .await?;
    let pool = get_pg_pool();
    query_channels_by_node_id(pool, params).await.map_err(|e| {
        log::error!("Failed to query channels by node id: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to query channels by node id"))
    })
}

#[handler]
pub async fn node_udt_infos(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let node_id = req.extract::<NodeId>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let udt_infos = crate::pg_read::query_node_udt_relation(pool, node_id.node_id, node_id.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query node UDT relation: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query node UDT relation"))
        })?;
    Ok(serde_json::to_string(&udt_infos)?)
}

#[handler]
pub async fn node_info(req: &mut Request, _res: &mut Response) -> Result<String, salvo::Error> {
    let node_id = req.extract::<NodeId>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let info = query_node_info(pool, node_id.node_id, node_id.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query node info: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query node info"))
        })?;
    Ok(serde_json::json!({ "node_info": info }).to_string())
}

#[handler]
pub async fn nodes_by_udt(req: &mut Request, _res: &mut Response) -> Result<String, salvo::Error> {
    let udt = req.extract::<NodesByUdt>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let nodes = crate::pg_read::query_nodes_by_udt(pool, udt.udt, udt.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query nodes by UDT: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query nodes by UDT"))
        })?;
    Ok(serde_json::json!({ "nodes": nodes }).to_string())
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
pub(crate) struct AnalysisHourlyParams {
    #[serde(default)]
    pub net: Network,
    pub end: Option<DateTime<Utc>>,
}

#[handler]
pub async fn analysis_hourly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req
        .extract::<AnalysisHourlyParams>(&mut Default::default())
        .await?;
    let pool = get_pg_pool();
    let capacitys = query_analysis_hourly(pool, params).await.map_err(|e| {
        log::error!("Failed to query channel capacity analysis: {}", e);
        salvo::Error::Io(std::io::Error::other(
            "Failed to query channel capacity analysis",
        ))
    })?;
    Ok(serde_json::to_string(&capacitys)?)
}

#[handler]
pub async fn analysis(req: &mut Request, _res: &mut Response) -> Result<String, salvo::Error> {
    let params = req
        .extract::<AnalysisParams>(&mut Default::default())
        .await?;
    let pool = get_pg_pool();
    let capacitys = query_analysis(pool, &params).await.map_err(|e| {
        log::error!("Failed to query channel capacity analysis: {}", e);
        salvo::Error::Io(std::io::Error::other(
            "Failed to query channel capacity analysis",
        ))
    })?;
    Ok(capacitys)
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct ChannelId {
    channel_outpoint: JsonBytes,
    #[serde(default)]
    net: Network,
}

#[handler]
pub async fn channel_state(req: &mut Request, _res: &mut Response) -> Result<String, salvo::Error> {
    let channel_id = req.extract::<ChannelId>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let state = query_channel_state(pool, channel_id.channel_outpoint, channel_id.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query channel state: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query channel state"))
        })?;
    Ok(state)
}

#[handler]
pub async fn channel_info(req: &mut Request, _res: &mut Response) -> Result<String, salvo::Error> {
    let channel_id = req.extract::<ChannelId>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let info = query_channel_info(pool, channel_id.channel_outpoint, channel_id.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query channel info: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query channel info"))
        })?;
    Ok(serde_json::json!({ "channel_info": info }).to_string())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(untagged)]
pub enum State {
    Single(DBState),
    Multiple(Vec<DBState>),
}

impl State {
    pub fn to_sql(&self) -> Vec<&str> {
        match self {
            State::Single(state) => vec![state.to_sql()],
            State::Multiple(states) => states.iter().map(|s| s.to_sql()).collect(),
        }
    }
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
pub(crate) struct ChannelByStateParams {
    pub(crate) state: State,
    pub(crate) page: usize,
    #[serde(default)]
    pub(crate) net: Network,
    #[serde(default)]
    pub(crate) sort_by: ChannelStateSortBy,
    #[serde(default)]
    pub(crate) order: Order,
    pub(crate) fuzz_name: Option<String>,
    pub(crate) asset_name: Option<String>,
    pub(crate) page_size: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub(crate) enum ChannelStateSortBy {
    #[serde(rename = "create_time")]
    CreateTime,
    #[default]
    #[serde(rename = "last_commit_time")]
    LastCommitTime,
    #[serde(rename = "capacity")]
    Capacity,
}

impl ChannelStateSortBy {
    pub fn as_str(&self) -> &str {
        match self {
            ChannelStateSortBy::CreateTime => "create_time",
            ChannelStateSortBy::LastCommitTime => "last_commit_time",
            ChannelStateSortBy::Capacity => "capacity",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub(crate) enum Order {
    #[serde(rename = "asc")]
    Asc,
    #[default]
    #[serde(rename = "desc")]
    Desc,
}

impl Order {
    pub fn as_str(&self) -> &str {
        match self {
            Order::Asc => "ASC",
            Order::Desc => "DESC",
        }
    }
}

#[handler]
pub async fn channel_by_state(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req
        .extract::<ChannelByStateParams>(&mut Default::default())
        .await?;
    let pool = get_pg_pool();
    let states = group_channel_by_state(pool, params).await.map_err(|e| {
        log::error!("Failed to query channels by state: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to query channels by state"))
    })?;
    Ok(states)
}

#[handler]
pub async fn channel_count_by_state(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req.extract::<NetworkInfo>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let counts = group_channel_count_by_state(pool, params.net)
        .await
        .map_err(|e| {
            log::error!("Failed to count channels by state: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to count channels by state"))
        })?;
    Ok(counts)
}

#[handler]
pub async fn channel_count_by_asset(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req.extract::<NetworkInfo>(&mut Default::default()).await?;
    let pool = get_pg_pool();

    let counts = query_channel_count_by_asset(pool, params.net)
        .await
        .map_err(|e| {
            log::error!("Failed to count channels by asset: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to count channels by asset"))
        })?;

    Ok(counts)
}

#[handler]
pub async fn channel_capacity_distribution(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let network_info = req.extract::<NetworkInfo>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let distribution = query_channel_capacity_distribution(pool, network_info.net)
        .await
        .map_err(|e| {
            log::error!("Failed to get channel capacity distribution: {}", e);
            salvo::Error::Io(std::io::Error::other(
                "Failed to get channel capacity distribution",
            ))
        })?;
    Ok(distribution)
}

#[handler]
pub async fn all_region(req: &mut Request, _res: &mut Response) -> Result<String, salvo::Error> {
    let network_info = req.extract::<NetworkInfo>(&mut Default::default()).await?;
    let pool = get_pg_pool();
    let regions = crate::pg_read::query_nodes_all_regions(pool, network_info.net)
        .await
        .map_err(|e| {
            log::error!("Failed to get all regions: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to get all regions"))
        })?;
    Ok(regions)
}
