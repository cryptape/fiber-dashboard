## Fiber Dashbord

http api default on 8080, method list:

```
/nodes_hourly?page=0
/channels_hourly?page=0
/nodes_nearly_monthly?page=0
/channels_nearly_monthly?page=0
/node_udt_infos?node_id=0x...
/analysis_hourly
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
| fields    | string\[]                     | Required metrics, e.g., `["channels","capacity","nodes"]` (defaults to all if not provided) |
