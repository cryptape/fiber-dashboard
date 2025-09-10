use reqwest::{Client, Url};

use std::{
    future::Future,
    io,
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
    },
};

use crate::types::{GraphChannelsParams, GraphChannelsResult, GraphNodesParams, GraphNodesResult};

macro_rules! jsonrpc {
    ($method:expr, $self:ident, $url:expr, $return:ty$(, $params:ident$(,)?)*) => {{
        let old = $self.id.fetch_add(1, Ordering::AcqRel);
        let data = format!(
            r#"{{"id": {}, "jsonrpc": "2.0", "method": "{}", "params": {}}}"#,
            old,
            $method,
            serde_json::to_value(($($params,)*)).unwrap()
        );

        let req_json: serde_json::Value = serde_json::from_str(&data).unwrap();

        let c = $self.raw.post($url).json(&req_json);
        async {
            let resp = c
                .send()
                .await
                .map_err::<io::Error, _>(|e| io::Error::new(io::ErrorKind::ConnectionAborted, format!("{:?}", e)))?;
            let output = resp
                .json::<jsonrpc_core::response::Output>()
                .await
                .map_err::<io::Error, _>(|e| io::Error::new(io::ErrorKind::InvalidData, format!("{:?}", e)))?;

            match output {
                jsonrpc_core::response::Output::Success(success) => {
                    Ok(serde_json::from_value::<$return>(success.result).unwrap())
                }
                jsonrpc_core::response::Output::Failure(e) => {
                    Err(io::Error::new(io::ErrorKind::InvalidData, format!("{:?}", e)))
                }
            }
        }
    }}
}

// Default implementation of ckb Rpc client
#[derive(Clone)]
pub struct RpcClient {
    raw: Client,
    id: Arc<AtomicU64>,
}

impl RpcClient {
    pub fn new() -> Self {
        RpcClient {
            raw: Client::new(),
            id: Arc::new(AtomicU64::new(0)),
        }
    }

    pub fn get_node_graph(
        &self,
        url: Url,
        params: GraphNodesParams,
    ) -> impl Future<Output = Result<GraphNodesResult, io::Error>> {
        let task = jsonrpc!("graph_nodes", self, url, GraphNodesResult, params);
        async {
            let res = task.await?;
            Ok(res)
        }
    }

    pub fn get_channel_graph(
        &self,
        url: Url,
        params: GraphChannelsParams,
    ) -> impl Future<Output = Result<GraphChannelsResult, io::Error>> {
        let task = jsonrpc!("graph_channels", self, url, GraphChannelsResult, params);
        async {
            let res = task.await?;
            Ok(res)
        }
    }
}
