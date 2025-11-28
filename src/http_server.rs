use chrono::{NaiveDate, Utc};
use ckb_jsonrpc_types::{JsonBytes, Script};
use salvo::{Request, Response, handler, macros::Extractible};
use serde::{Deserialize, Serialize};

use crate::{
    Network, get_pg_pool,
    pg_read::{
        AnalysisParams, ChannelInfo, HourlyNodeInfo, group_channel_by_state,
        group_channel_count_by_state, query_analysis, query_analysis_hourly,
        query_channel_capacity_distribution, query_channel_info, query_channel_state,
        query_channels_by_node_id, query_node_info, query_nodes_by_country,
        query_nodes_fuzzy_by_name, read_channels_hourly, read_channels_monthly, read_nodes_hourly,
        read_nodes_monthly,
    },
    pg_write::DBState,
};

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct Page {
    page: usize,
    #[serde(default)]
    net: Network,
    start: Option<NaiveDate>,
    end: Option<NaiveDate>,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct NodeId {
    node_id: JsonBytes,
    page: usize,
    #[serde(default)]
    net: Network,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct FuzzyNodeName {
    node_name: String,
    page: usize,
    #[serde(default)]
    net: Network,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct NodeByCountry {
    country: String,
    page: usize,
    #[serde(default)]
    net: Network,
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
}

#[derive(Debug, Serialize, Deserialize)]
struct ChannelPage {
    next_page: usize,
    channels: Vec<ChannelInfo>,
}

#[handler]
pub async fn list_nodes_hourly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let page = req.extract::<Page>().await?;
    let pool = get_pg_pool();
    let nodes = read_nodes_hourly(pool, page.page, page.net)
        .await
        .map_err(|e| {
            log::error!("Failed to read nodes: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to read nodes"))
        })?;
    Ok(serde_json::to_string(&NodePage {
        next_page: nodes.1,
        nodes: nodes.0,
    })?)
}

#[handler]
pub async fn list_nodes_monthly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let page = req.extract::<Page>().await?;
    let pool = get_pg_pool();
    let now = Utc::now().date_naive();
    let start = page.start.unwrap_or(now - chrono::Duration::days(30));
    let mut end = page.end.unwrap_or(now);
    if end - start > chrono::Duration::days(30) || start > end {
        end = start + chrono::Duration::days(30);
    }
    let nodes = read_nodes_monthly(
        pool,
        page.page,
        start.and_hms_opt(0, 0, 0).unwrap().and_utc(),
        end.and_hms_opt(0, 0, 0).unwrap().and_utc(),
        page.net,
    )
    .await
    .map_err(|e| {
        log::error!("Failed to read nodes: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to read nodes"))
    })?;
    Ok(serde_json::to_string(&NodePage {
        next_page: nodes.1,
        nodes: nodes.0,
    })?)
}

#[handler]
pub async fn nodes_fuzzy_by_name_or_id(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req.extract::<FuzzyNodeName>().await?;
    let pool = get_pg_pool();

    let nodes = query_nodes_fuzzy_by_name(pool, params.node_name, params.page, params.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query nodes by name or id: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query nodes by name or id"))
        })?;
    Ok(serde_json::to_string(&NodePage {
        next_page: nodes.1,
        nodes: nodes.0,
    })?)
}

#[handler]
pub async fn nodes_by_country(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req.extract::<NodeByCountry>().await?;
    let pool = get_pg_pool();
    let nodes = query_nodes_by_country(pool, params.country, params.page, params.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query nodes by country: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query nodes by country"))
        })?;
    Ok(serde_json::to_string(&NodePage {
        next_page: nodes.1,
        nodes: nodes.0,
    })?)
}

#[handler]
pub async fn list_channels_hourly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let page = req.extract::<Page>().await?;
    let pool = get_pg_pool();
    let channels = read_channels_hourly(pool, page.page, page.net)
        .await
        .map_err(|e| {
            log::error!("Failed to read channels: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to read channels"))
        })?;
    Ok(serde_json::to_string(&ChannelPage {
        next_page: channels.1,
        channels: channels.0,
    })?)
}

#[handler]
pub async fn list_channels_monthly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let page = req.extract::<Page>().await?;
    let pool = get_pg_pool();
    let now = Utc::now().date_naive();
    let start = page.start.unwrap_or(now - chrono::Duration::days(30));
    let mut end = page.end.unwrap_or(now);
    if end - start > chrono::Duration::days(30) || start > end {
        end = start + chrono::Duration::days(30);
    }
    let channels = read_channels_monthly(
        pool,
        page.page,
        start.and_hms_opt(0, 0, 0).unwrap().and_utc(),
        end.and_hms_opt(0, 0, 0).unwrap().and_utc(),
        page.net,
    )
    .await
    .map_err(|e| {
        log::error!("Failed to read channels: {}", e);
        salvo::Error::Io(std::io::Error::other("Failed to read channels"))
    })?;
    Ok(serde_json::to_string(&ChannelPage {
        next_page: channels.1,
        channels: channels.0,
    })?)
}

#[handler]
pub async fn channels_by_node_id(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let node_id = req.extract::<NodeId>().await?;
    let pool = get_pg_pool();
    query_channels_by_node_id(pool, node_id.node_id, node_id.page, node_id.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query channels by node id: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query channels by node id"))
        })
}

#[handler]
pub async fn node_udt_infos(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let node_id = req.extract::<NodeId>().await?;
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
    let node_id = req.extract::<NodeId>().await?;
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
    let udt = req.extract::<NodesByUdt>().await?;
    let pool = get_pg_pool();
    let nodes = crate::pg_read::query_nodes_by_udt(pool, udt.udt, udt.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query nodes by UDT: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query nodes by UDT"))
        })?;
    Ok(serde_json::json!({ "nodes": nodes }).to_string())
}

#[handler]
pub async fn analysis_hourly(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let network_info = req.extract::<NetworkInfo>().await?;
    let pool = get_pg_pool();
    let capacitys = query_analysis_hourly(pool, network_info.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query channel capacity analysis: {}", e);
            salvo::Error::Io(std::io::Error::other(
                "Failed to query channel capacity analysis",
            ))
        })?;
    Ok(serde_json::to_string(&capacitys)?)
}

#[handler]
pub async fn analysis(req: &mut Request, _res: &mut Response) -> Result<String, salvo::Error> {
    let params = req.extract::<AnalysisParams>().await?;
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
    let channel_id = req.extract::<ChannelId>().await?;
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
    let channel_id = req.extract::<ChannelId>().await?;
    let pool = get_pg_pool();
    let info = query_channel_info(pool, channel_id.channel_outpoint, channel_id.net)
        .await
        .map_err(|e| {
            log::error!("Failed to query channel info: {}", e);
            salvo::Error::Io(std::io::Error::other("Failed to query channel info"))
        })?;
    Ok(serde_json::json!({ "channel_info": info }).to_string())
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct ChannelByStateParams {
    state: DBState,
    page: usize,
    #[serde(default)]
    net: Network,
}

#[handler]
pub async fn channel_by_state(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let params = req.extract::<ChannelByStateParams>().await?;
    let pool = get_pg_pool();
    let states = group_channel_by_state(pool, params.state, params.page, params.net)
        .await
        .map_err(|e| {
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
    let params = req.extract::<NetworkInfo>().await?;
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
pub async fn channel_capacity_distribution(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let network_info = req.extract::<NetworkInfo>().await?;
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
