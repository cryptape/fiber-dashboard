pub mod http_server;
mod ip_location;
pub mod pg_read;
pub mod pg_write;
mod rpc_client;
pub mod types;

pub use rpc_client::RpcClient;

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
