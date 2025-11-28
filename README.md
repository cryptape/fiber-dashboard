## Fiber Dashbord

http api default on 8080, method list:

```
/nodes_hourly?page=0
/channels_hourly?page=0
/nodes_nearly_monthly?page=0&start=%Y-%m-%d&end=%Y-%m-%d start/end is optional
/channels_nearly_monthly?page=0&start=%Y-%m-%d&end=%Y-%m-%d start/end is optional
/node_udt_infos?node_id=0x...
/analysis_hourly
/channel_state?channel_outpoint=0x..
/group_channel_by_state?state=open/commitment/closed&page=0
/channel_count_by_state
/channel_info?channel_outpoint=0x..
/node_info?node_id=0x..
/channels_by_node_id?node_id=0x..
/nodes_by_country?country=HK
/nodes_fuzzy_by_name?node_name=Cr
/channel_capacity_distribution
post /nodes_by_udt body={ udt: Script }
post /analysis need json body
```


/analysis body:
| Parameter | Type                          | Description                                                    |
| --------- | ----------------------------- | -------------------------------------------------------------- |
| start     | string(%Y-%m-%d)              | Start date (e.g., `2025-08-01`) (optional, defaults to today) |
| end       | string(%Y-%m-%d)              | End date (optional)                                            |
| range     | enum                          | Time span, frontend passes `1M/3M/6M/1Y/2Y` (optional, auto-calculates start/end if provided) |
| interval  | enum                          | Aggregation granularity: `day` (default)                      |
| fields    | string\[]                     | Required metrics, e.g., `["channels","capacity","nodes"]` (defaults to all if not provided), capacity point is [sum, avg, min, max, median] |


All APIs have a parameter called `net`, which can be testnet or mainnet. The default is mainnet.
