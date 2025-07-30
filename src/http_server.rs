use salvo::{Request, Response, handler, macros::Extractible};
use serde::{Deserialize, Serialize};

use crate::{
    get_pg_pool,
    pg_read::{ChannelInfo, HourlyNodeInfo, read_channels, read_nodes},
};

#[derive(Debug, Extractible, Serialize, Deserialize)]
#[salvo(extract(default_source(from = "query")))]
struct Page {
    page: usize,
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
    let nodes = read_nodes(pool, page.page).await.map_err(|e| {
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
    let channels = read_channels(pool, page.page).await.map_err(|e| {
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
