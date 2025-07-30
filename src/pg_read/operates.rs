use sqlx::{Pool, Postgres};

use crate::pg_read::{ChannelInfo, HourlyChannelInfoDBRead, HourlyNodeInfo, HourlyNodeInfoDBRead};

pub async fn read_nodes(
    pool: &Pool<Postgres>,
    page: usize,
) -> Result<(Vec<HourlyNodeInfo>, usize), sqlx::Error> {
    HourlyNodeInfoDBRead::fetch_by_page(pool, page)
        .await
        .map(|(entities, next_page)| {
            (
                entities.into_iter().map(HourlyNodeInfo::from).collect(),
                next_page,
            )
        })
}

pub async fn read_channels(
    pool: &Pool<Postgres>,
    page: usize,
) -> Result<(Vec<ChannelInfo>, usize), sqlx::Error> {
    HourlyChannelInfoDBRead::fetch_by_page(pool, page)
        .await
        .map(|(entities, next_page)| {
            (
                entities.into_iter().map(ChannelInfo::from).collect(),
                next_page,
            )
        })
}
