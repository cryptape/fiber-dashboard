pub mod clock_timer;
pub mod http_server;
mod ip_location;
pub(crate) mod pg_read;
pub mod pg_write;
mod rpc_client;
pub mod types;

pub use rpc_client::{CKB_MAINNET_RPC, CKB_TESTNET_RPC, RpcClient};

use std::env;

const INIT_SQL: &str = include_str!("../db_schema/create_table.sql");

static PG_POOL: std::sync::OnceLock<sqlx::Pool<sqlx::Postgres>> = std::sync::OnceLock::new();

pub async fn create_pg_pool() {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or("postgres://postgres:password@localhost:5432/postgres".to_string());
    let pool = sqlx::Pool::<sqlx::Postgres>::connect(&database_url)
        .await
        .expect("Failed to create Postgres connection pool");
    PG_POOL.set(pool).expect("PG_POOL already set");
}

pub fn get_pg_pool() -> &'static sqlx::Pool<sqlx::Postgres> {
    PG_POOL.get().expect("PG_POOL not initialized")
}

pub async fn init_db(pool: &sqlx::Pool<sqlx::Postgres>) {
    use sqlx::Row;
    let need_init =
        sqlx::query("SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'node_infos')")
            .fetch_one(pool)
            .await
            .map(|row| !row.get::<bool, _>(0))
            .expect("Failed to check if database needs initialization");

    if need_init {
        sqlx::raw_sql(INIT_SQL)
            .execute(pool)
            .await
            .expect("Failed to execute initialization SQL");
    }
}

#[derive(
    Debug, Clone, Copy, Hash, PartialEq, Eq, serde::Serialize, serde::Deserialize, Default,
)]
pub enum Network {
    #[serde(alias = "mainnet")]
    #[default]
    Mainnet,
    #[serde(alias = "testnet")]
    Testnet,
}

impl Network {
    pub fn node_infos(&self) -> &str {
        match self {
            Network::Mainnet => "node_infos",
            Network::Testnet => "node_infos_testnet",
        }
    }

    pub fn channel_infos(&self) -> &str {
        match self {
            Network::Mainnet => "channel_infos",
            Network::Testnet => "channel_infos_testnet",
        }
    }

    pub fn online_nodes_hourly(&self) -> &str {
        match self {
            Network::Mainnet => "online_nodes_hourly",
            Network::Testnet => "online_nodes_hourly_testnet",
        }
    }

    pub fn online_channels_hourly(&self) -> &str {
        match self {
            Network::Mainnet => "online_channels_hourly",
            Network::Testnet => "online_channels_hourly_testnet",
        }
    }

    pub fn mv_online_nodes(&self) -> &str {
        match self {
            Network::Mainnet => "mv_online_nodes",
            Network::Testnet => "mv_online_nodes_testnet",
        }
    }

    pub fn mv_online_channels(&self) -> &str {
        match self {
            Network::Mainnet => "mv_online_channels",
            Network::Testnet => "mv_online_channels_testnet",
        }
    }

    pub fn udt_infos(&self) -> &str {
        match self {
            Network::Mainnet => "udt_infos",
            Network::Testnet => "udt_infos_testnet",
        }
    }

    pub fn udt_dep(&self) -> &str {
        match self {
            Network::Mainnet => "udt_dep",
            Network::Testnet => "udt_dep_testnet",
        }
    }

    pub fn node_udt_relations(&self) -> &str {
        match self {
            Network::Mainnet => "node_udt_relations",
            Network::Testnet => "node_udt_relations_testnet",
        }
    }

    pub fn daily_summarized_data(&self) -> &str {
        match self {
            Network::Mainnet => "daily_summarized_data",
            Network::Testnet => "daily_summarized_data_testnet",
        }
    }

    pub fn channel_states(&self) -> &str {
        match self {
            Network::Mainnet => "channel_states",
            Network::Testnet => "channel_states_testnet",
        }
    }

    pub fn channel_txs(&self) -> &str {
        match self {
            Network::Mainnet => "channel_txs",
            Network::Testnet => "channel_txs_testnet",
        }
    }
}
