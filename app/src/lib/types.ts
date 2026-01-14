import { z } from "zod";

// Key Performance Indicators for lightning network
export const KpiDataSchema = z.object({
  totalCapacity: z.number(),
  totalNodes: z.number(),
  totalChannels: z.number(),
  averageChannelCapacity: z.number(),
  maxChannelCapacity: z.number(),
  minChannelCapacity: z.number(),
  medianChannelCapacity: z.number(),
  // 与上周的变化数据（可选）
  totalCapacityChange: z.number().optional(),
  totalNodesChange: z.number().optional(),
  totalChannelsChange: z.number().optional(),
  minChannelCapacityChange: z.number().optional(),
  maxChannelCapacityChange: z.number().optional(),
  averageChannelCapacityChange: z.number().optional(),
  medianChannelCapacityChange: z.number().optional(),
});

export type KpiData = z.infer<typeof KpiDataSchema>;

// 时间序列数据类型
export const TimeSeriesDataSchema = z.object({
  timestamp: z.string(),
  value: z.number(),
});

export const TimeSeriesSchema = z.object({
  label: z.string(),
  data: z.array(TimeSeriesDataSchema),
});

export type TimeSeriesData = z.infer<typeof TimeSeriesDataSchema>;
export type TimeSeries = z.infer<typeof TimeSeriesSchema>;

// 地理节点数据类型
export const GeoNodeSchema = z.object({
  country: z.string(),
  countryCode: z.string(),
  nodeCount: z.number(),
  totalCapacity: z.number(),
});

export type GeoNode = z.infer<typeof GeoNodeSchema>;

// 城市节点数据类型 - 用于精确地理位置显示
export const CityNodeSchema = z.object({
  city: z.string(),
  country: z.string(),
  countryCode: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  nodeCount: z.number(),
  totalCapacity: z.number(),
  nodeIds: z.array(z.string()), // 存储该城市的所有节点ID
});

export type CityNode = z.infer<typeof CityNodeSchema>;

// 单个节点地理位置数据类型
export const NodeLocationSchema = z.object({
  nodeId: z.string(),
  nodeName: z.string(),
  city: z.string(),
  country: z.string(),
  countryCode: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  capacity: z.number(),
});

export type NodeLocation = z.infer<typeof NodeLocationSchema>;

// ISP 排行榜数据类型
export const IspRankingSchema = z.object({
  isp: z.string(),
  nodeCount: z.number(),
  totalCapacity: z.number(),
  averageCapacity: z.number(),
});

export type IspRanking = z.infer<typeof IspRankingSchema>;

// Dashboard 数据聚合类型
export const DashboardDataSchema = z.object({
  timeSeries: z.array(TimeSeriesSchema),
  geoNodes: z.array(GeoNodeSchema),
  cityNodes: z.array(CityNodeSchema), // 新增城市节点数据
  nodeLocations: z.array(NodeLocationSchema), // 新增单个节点位置数据
  ispRankings: z.array(IspRankingSchema),
});

export type DashboardData = z.infer<typeof DashboardDataSchema>;

// API 响应类型
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: DashboardDataSchema,
  timestamp: z.string(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

// UDT 相关类型
export const UdtScriptSchema = z.object({
  code_hash: z.string(),
  hash_type: z.string(),
  args: z.string(),
});

export const UdtCellDepSchema = z.object({
  out_point: z.object({
    tx_hash: z.string(),
    index: z.string(),
  }),
  dep_type: z.string(),
});

export const UdtDepSchema = z.object({
  cell_dep: UdtCellDepSchema.optional(),
  type_id: UdtScriptSchema.optional(),
});

export const UdtArgInfoSchema = z.object({
  name: z.string(),
  script: UdtScriptSchema,
  auto_accept_amount: z.string().optional(),
  cell_deps: z.array(UdtDepSchema),
});

export const UdtCfgInfosSchema = z.array(UdtArgInfoSchema);

// 通道容量分析类型
export const ActiveAnalysisSchema = z.object({
  max_capacity: z.string(),
  min_capacity: z.string(),
  avg_capacity: z.string(),
  median_capacity: z.string(),
  total_capacity: z.string(),
  total_nodes: z.string(),
  channel_len: z.string(),
  end: z.string().optional(), // 时间戳字段
});

// Rust backend type schemas
export const RustNodeInfoSchema = z.object({
  node_id: z.string(),
  node_name: z.string(),
  addresses: z.array(z.string()),
  commit_timestamp: z.string(),
  announce_timestamp: z.number(),
  chain_hash: z.string(),
  auto_accept_min_ckb_funding_amount: z.number(),
  country_or_region: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  loc: z.string().optional(),
  channel_count: z.number().optional(),
});

export const RustChannelInfoSchema = z.object({
  channel_outpoint: z.string(),
  node1: z.string(),
  node2: z.string(),
  commit_timestamp: z.string(),
  created_timestamp: z.string(),
  capacity: z.string(),
  chain_hash: z.string(),
  udt_type_script: z.unknown().optional(),
  udt_name: z.string().optional(), // 资产名称，如 "ckb", "btc" 等
  update_info_of_node1: z.unknown().optional(),
  update_info_of_node2: z.unknown().optional(),
});

// Infer types from schemas
export type RustNodeInfo = z.infer<typeof RustNodeInfoSchema>;
export type RustChannelInfo = z.infer<typeof RustChannelInfoSchema>;
export type UdtCfgInfos = z.infer<typeof UdtCfgInfosSchema>;
export type ActiveAnalysis = z.infer<typeof ActiveAnalysisSchema>;
export type UdtScript = z.infer<typeof UdtScriptSchema>;

// Backend API response types
export const NodeResponseSchema = z.object({
  next_page: z.number(),
  nodes: z.array(RustNodeInfoSchema),
  total_count: z.number(),
});

export const ChannelResponseSchema = z.object({
  next_page: z.number(),
  channels: z.array(RustChannelInfoSchema),
  total_count: z.number(),
});

export const NodesByUdtResponseSchema = z.object({
  nodes: z.array(z.string()),
});

export type NodeResponse = z.infer<typeof NodeResponseSchema>;
export type ChannelResponse = z.infer<typeof ChannelResponseSchema>;
export type NodesByUdtResponse = z.infer<typeof NodesByUdtResponseSchema>;

// Analysis request parameters
export interface AnalysisRequestParams {
  start?: string; // %Y-%m-%d format, e.g., "2025-08-01"
  end?: string; // %Y-%m-%d format
  range?: "1M" | "3M" | "6M" | "1Y" | "2Y";
  interval?: "day";
  fields?: string[]; // e.g., ["channels","capacity","nodes"]
}

// History analysis response types
export interface HistoryAnalysisMeta {
  fields: string[];
  start_time: string;
  end_time: string;
  interval: string;
  range: string;
}

// Define specific series types for better type inference
export interface ChannelsSeries {
  name: "Channels";
  points: [timestamp: string, value: number][];
}

export interface CapacitySeries {
  name: "Capacity";
  points: [
    timestamp: string,
    capacity: [
      sum: string,
      avg: string,
      min: string,
      max: string,
      median: string,
    ],
  ][];
}

export interface NodesSeries {
  name: "Nodes";
  points: [timestamp: string, value: number][];
}

export type HistoryAnalysisSeries =
  | ChannelsSeries
  | CapacitySeries
  | NodesSeries;

export interface HistoryAnalysisResponse {
  series: HistoryAnalysisSeries[];
  meta: HistoryAnalysisMeta;
}

// Channel state types
export type ChannelState = "open" | "closed_waiting_onchain_settlement" | "closed_cooperative" | "closed_uncooperative";

// Channel info response (single channel)
export const ChannelInfoResponseSchema = RustChannelInfoSchema;
export type ChannelInfoResponse = z.infer<typeof ChannelInfoResponseSchema>;

// Node info response (single node)
export const NodeInfoResponseSchema = RustNodeInfoSchema;
export type NodeInfoResponse = z.infer<typeof NodeInfoResponseSchema>;

// API response wrappers (actual API response format)
export const ChannelInfoApiResponseSchema = z.object({
  channel_info: ChannelInfoResponseSchema,
});

export const NodeInfoApiResponseSchema = z.object({
  node_info: NodeInfoResponseSchema,
});

// Channel state transaction info
export const ChannelStateTxSchema = z.object({
  tx_hash: z.string(),
  block_number: z.string(),
  timestamp: z.string(),
  witness_args: z.string().nullable(),
  commitment_args: z.string().nullable(),
});

export const ChannelStateInfoSchema = z.object({
  channel_id: z.string(),
  funding_args: z.string(),
  state: z.string(),
  txs: z.array(ChannelStateTxSchema),
});

export type ChannelStateInfo = z.infer<typeof ChannelStateInfoSchema>;

export const ChannelStateApiResponseSchema = z.object({
  funding_args: z.string(),
  state: z.enum(["open", "closed_waiting_onchain_settlement", "closed_cooperative", "closed_uncooperative"]),
  txs: z.array(ChannelStateTxSchema),
});

export type ChannelStateTx = z.infer<typeof ChannelStateTxSchema>;

export type ChannelInfoApiResponse = z.infer<
  typeof ChannelInfoApiResponseSchema
>;
export type NodeInfoApiResponse = z.infer<typeof NodeInfoApiResponseSchema>;
export type ChannelStateApiResponse = z.infer<
  typeof ChannelStateApiResponseSchema
>;

// Group channels by state response
// Basic channel info returned by group_channel_by_state API
export const BasicChannelInfoSchema = z.object({
  channel_outpoint: z.string(),
  funding_args: z.string(),
  last_block_number: z.string(),
  last_tx_hash: z.string(),
  last_commitment_args: z.string().nullable(),
  create_time: z.string(),
  last_commit_time: z.string(),
  capacity: z.string(),
  tx_count: z.number(),
  name: z.string(), // 资产名称（如 "ckb", "rusd" 等）
});

export const GroupChannelsByStateResponseSchema = z.object({
  next_page: z.number(),
  list: z.array(BasicChannelInfoSchema),
  total_count: z.number(),
});

export type BasicChannelInfo = z.infer<typeof BasicChannelInfoSchema>;
export type GroupChannelsByStateResponse = z.infer<
  typeof GroupChannelsByStateResponseSchema
>;

// Channels by node ID response
export const ChannelByNodeSchema = z.object({
  channel_outpoint: z.string(),
  last_seen_hour: z.string(),
  capacity: z.string(),
  created_timestamp: z.string(),
  state: z.string(),
  last_commit_time: z.string(),
});

export const ChannelsByNodeIdResponseSchema = z.object({
  next_page: z.number(),
  channels: z.array(ChannelByNodeSchema),
  total_count: z.number(),
});

export type ChannelByNode = z.infer<typeof ChannelByNodeSchema>;
export type ChannelsByNodeIdResponse = z.infer<typeof ChannelsByNodeIdResponseSchema>;
