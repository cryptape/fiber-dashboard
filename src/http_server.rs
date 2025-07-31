use ckb_jsonrpc_types::{JsonBytes, Script};
use salvo::{Request, Response, handler, macros::Extractible};
use serde::{Deserialize, Serialize};

use crate::{
    get_pg_pool,
    pg_read::{ChannelInfo, HourlyNodeInfo, read_channels_hourly, read_nodes_hourly},
};

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct Page {
    page: usize,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct NodeId {
    node_id: JsonBytes,
}

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "body")))]
struct NodesByUdt {
    udt: Script,
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
    let nodes = read_nodes_hourly(pool, page.page).await.map_err(|e| {
        log::error!("Failed to read nodes: {}", e);
        salvo::Error::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Failed to read nodes",
        ))
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
    let channels = read_channels_hourly(pool, page.page).await.map_err(|e| {
        log::error!("Failed to read channels: {}", e);
        salvo::Error::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Failed to read channels",
        ))
    })?;
    Ok(serde_json::to_string(&ChannelPage {
        next_page: channels.1,
        channels: channels.0,
    })?)
}

#[handler]
pub async fn node_udt_infos(
    req: &mut Request,
    _res: &mut Response,
) -> Result<String, salvo::Error> {
    let node_id = req.extract::<NodeId>().await?;
    let pool = get_pg_pool();
    let udt_infos = crate::pg_read::query_node_udt_relation(pool, node_id.node_id)
        .await
        .map_err(|e| {
            log::error!("Failed to query node UDT relation: {}", e);
            salvo::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Failed to query node UDT relation",
            ))
        })?;
    Ok(serde_json::to_string(&udt_infos)?)
}

#[handler]
pub async fn nodes_by_udt(req: &mut Request, _res: &mut Response) -> Result<String, salvo::Error> {
    let udt = req.extract::<NodesByUdt>().await?;
    let pool = get_pg_pool();
    let nodes = crate::pg_read::query_nodes_by_udt(pool, udt.udt)
        .await
        .map_err(|e| {
            log::error!("Failed to query nodes by UDT: {}", e);
            salvo::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Failed to query nodes by UDT",
            ))
        })?;
    Ok(serde_json::json!({ "nodes": nodes }).to_string())
}
