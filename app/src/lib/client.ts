import { API_CONFIG, SHANNONS_PER_CKB } from "./const";
import { z } from "zod";
import {
  DashboardData,
  GeoNode,
  CityNode,
  NodeLocation,
  IspRanking,
  RustNodeInfo,
  RustChannelInfo,
  NodeResponse,
  ChannelResponse,
  UdtCfgInfos,
  ActiveAnalysis,
  NodesByUdtResponse,
  UdtScript,
  UdtCfgInfosSchema,
  ActiveAnalysisSchema,
  NodesByUdtResponseSchema,
  NodeResponseSchema,
  ChannelResponseSchema,
  KpiData,
  TimeSeriesData,
  AnalysisRequestParams,
  HistoryAnalysisResponse,
  ChannelState,
  ChannelStateInfo,
  ChannelStateInfoSchema,
  ChannelInfoResponse,
  NodeInfoResponse,
  ChannelInfoApiResponse,
  ChannelInfoApiResponseSchema,
  NodeInfoApiResponse,
  NodeInfoApiResponseSchema,
  ChannelStateApiResponse,
  ChannelStateApiResponseSchema,
  GroupChannelsByStateResponse,
  GroupChannelsByStateResponseSchema,
  ChannelsByNodeIdResponse,
  ChannelsByNodeIdResponseSchema,
} from "./types";
import { hexToDecimal, u128LittleEndianToDecimal } from "./utils";

export class APIClient {
  constructor(
    public baseUrl: string = API_CONFIG.baseUrl,
    public net: "mainnet" | "testnet" = "mainnet"
  ) {}

  private async apiRequest<T>(
    endpoint: string,
    options?: RequestInit,
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    // Add net parameter to all requests
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${this.baseUrl}${endpoint}${separator}net=${this.net}`;

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const json = await response.json();
      console.log(`API response for ${endpoint}:`, json);

      // Check if this is an error response
      if (
        json &&
        typeof json === "object" &&
        "success" in json &&
        json.success === false
      ) {
        console.log("API returned error response:", json);
        throw new Error(json.message || "API returned error");
      }

      if (schema) {
        const parsed = schema.parse(json);
        return parsed;
      }
      return json as T;
    } catch (error) {
      console.error("API request error:", error);
      throw error;
    }
  }

  async getActiveNodesByPage(
    page: number = 0,
    sortBy?: string,
    order?: string,
    pageSize: number = 10
  ): Promise<NodeResponse> {
    let endpoint = `/nodes_hourly?page=${page}&page_size=${pageSize}`;
    if (sortBy) endpoint += `&sort_by=${sortBy}`;
    if (order) endpoint += `&order=${order}`;
    return this.apiRequest<NodeResponse>(
      endpoint,
      undefined,
      NodeResponseSchema
    );
  }

  async searchNodesByName(
    nodeName: string,
    page: number = 0,
    sortBy?: string,
    order?: string,
    pageSize: number = 10
  ): Promise<NodeResponse> {
    let endpoint = `/nodes_fuzzy_by_name?node_name=${encodeURIComponent(nodeName)}&page=${page}&page_size=${pageSize}`;
    if (sortBy) endpoint += `&sort_by=${sortBy}`;
    if (order) endpoint += `&order=${order}`;
    return this.apiRequest<NodeResponse>(
      endpoint,
      undefined,
      NodeResponseSchema
    );
  }

  async getNodesByRegion(
    region: string,
    page: number = 0,
    sortBy?: string,
    order?: string,
    pageSize: number = 10
  ): Promise<NodeResponse> {
    let endpoint = `/nodes_by_region?region=${encodeURIComponent(region)}&page=${page}&page_size=${pageSize}`;
    if (sortBy) endpoint += `&sort_by=${sortBy}`;
    if (order) endpoint += `&order=${order}`;
    return this.apiRequest<NodeResponse>(
      endpoint,
      undefined,
      NodeResponseSchema
    );
  }

  async getAllRegions(): Promise<string[]> {
    return this.apiRequest<string[]>('/all_region');
  }

  async getHistoricalNodesByPage(
    page: number = 0,
    start?: string,
    end?: string,
    pageSize: number = 10
  ): Promise<NodeResponse> {
    let endpoint = `/nodes_nearly_monthly?page=${page}&page_size=${pageSize}`;
    if (start) endpoint += `&start=${start}`;
    if (end) endpoint += `&end=${end}`;
    return this.apiRequest<NodeResponse>(
      endpoint,
      undefined,
      NodeResponseSchema
    );
  }

  async getActiveChannelsByPage(
    page: number = 0,
    pageSize: number = 10
  ): Promise<ChannelResponse> {
    return this.apiRequest<ChannelResponse>(
      `/channels_hourly?page=${page}&page_size=${pageSize}`,
      undefined,
      ChannelResponseSchema
    );
  }

  async getHistoricalChannelsByPage(
    page: number = 0,
    start?: string,
    end?: string,
    pageSize: number = 10
  ): Promise<ChannelResponse> {
    let endpoint = `/channels_nearly_monthly?page=${page}&page_size=${pageSize}`;
    if (start) endpoint += `&start=${start}`;
    if (end) endpoint += `&end=${end}`;
    return this.apiRequest<ChannelResponse>(
      endpoint,
      undefined,
      ChannelResponseSchema
    );
  }

  async getNodeUdtInfos(nodeId: string): Promise<UdtCfgInfos> {
    return this.apiRequest<UdtCfgInfos>(
      `/node_udt_infos?node_id=${encodeURIComponent(nodeId)}`,
      undefined,
      UdtCfgInfosSchema
    );
  }

  async getNodesByUdt(udtScript: UdtScript): Promise<NodesByUdtResponse> {
    return this.apiRequest<NodesByUdtResponse>(
      `/nodes_by_udt`,
      {
        method: "POST",
        body: JSON.stringify({ udt: udtScript }),
      },
      NodesByUdtResponseSchema
    );
  }

  async getActiveAnalysis(end?: string): Promise<ActiveAnalysis> {
    let endpoint = `/analysis_hourly`;
    if (end) {
      endpoint += `?end=${encodeURIComponent(end)}`;
    }
    return this.apiRequest<ActiveAnalysis>(
      endpoint,
      undefined,
      ActiveAnalysisSchema
    );
  }

  async getHistoryAnalysis(
    params?: AnalysisRequestParams
  ): Promise<HistoryAnalysisResponse> {
    const response = await this.apiRequest<HistoryAnalysisResponse>(
      `/analysis`,
      {
        method: "POST",
        body: JSON.stringify(params || {}),
      }
    );
    return response;
  }

  async getChannelState(channelId: string): Promise<ChannelStateInfo> {
    console.log("getChannelState called with channelId:", channelId);
    const rawResponse = await this.apiRequest<ChannelStateApiResponse>(
      `/channel_state?channel_outpoint=${encodeURIComponent(channelId)}`,
      undefined,
      ChannelStateApiResponseSchema
    );
    console.log("getChannelState raw response:", rawResponse);

    // Include all fields from the API response
    const mappedResponse = {
      channel_id: channelId,
      funding_args: rawResponse.funding_args,
      state: rawResponse.state,
      txs: rawResponse.txs,
    };
    return ChannelStateInfoSchema.parse(mappedResponse);
  }

  async getGroupChannelsByState(
    state: ChannelState,
    page: number = 0,
    pageSize: number = 10
  ): Promise<GroupChannelsByStateResponse> {
    return this.apiRequest<GroupChannelsByStateResponse>(
      `/group_channel_by_state?state=${state}&page=${page}&page_size=${pageSize}`,
      undefined,
      GroupChannelsByStateResponseSchema
    );
  }

  async getChannelInfo(channelId: string): Promise<ChannelInfoResponse> {
    console.log("getChannelInfo called with channelId:", channelId);
    const rawResponse = await this.apiRequest<ChannelInfoApiResponse>(
      `/channel_info?channel_outpoint=${encodeURIComponent(channelId)}`,
      undefined,
      ChannelInfoApiResponseSchema
    );
    console.log("getChannelInfo raw response:", rawResponse);

    // The API returns { channel_info: { ...actual channel data... } }
    return rawResponse.channel_info;
  }

  async getNodeInfo(nodeId: string): Promise<NodeInfoResponse> {
    console.log("getNodeInfo called with nodeId:", nodeId);
    const rawResponse = await this.apiRequest<NodeInfoApiResponse>(
      `/node_info?node_id=${encodeURIComponent(nodeId)}`,
      undefined,
      NodeInfoApiResponseSchema
    );
    console.log("getNodeInfo raw response:", rawResponse);

    // The API returns { node_info: { ...actual node data... } }
    return rawResponse.node_info;
  }

  async getChannelCapacityDistribution(): Promise<Record<string, number>> {
    return this.apiRequest<Record<string, number>>(
      `/channel_capacity_distribution`
    );
  }

  async getChannelCountByState(): Promise<Record<string, number>> {
    return this.apiRequest<Record<string, number>>(
      `/channel_count_by_state`
    );
  }

  async getChannelsByNodeId(
    nodeId: string,
    page: number = 0,
    sortBy: "create_time" | "last_commit_time" = "last_commit_time",
    order: "asc" | "desc" = "desc",
    pageSize: number = 10
  ): Promise<ChannelsByNodeIdResponse> {
    return this.apiRequest<ChannelsByNodeIdResponse>(
      `/channels_by_node_id?node_id=${encodeURIComponent(nodeId)}&page=${page}&sort_by=${sortBy}&order=${order}&page_size=${pageSize}`,
      undefined,
      ChannelsByNodeIdResponseSchema
    );
  }

  async fetchAllActiveNodes(): Promise<RustNodeInfo[]> {
    const allNodes: RustNodeInfo[] = [];
    let page = 0;
    let hasMore = true;
    const PAGE_SIZE = 500;

    while (hasMore) {
      try {
        const response = await this.getActiveNodesByPage(page, undefined, undefined, PAGE_SIZE);
        const nodes = response.nodes || [];
        allNodes.push(...nodes);

        // 使用后端返回的 next_page 控制分页
        const nextPage = response.next_page;
        // 如果没有数据或 next_page 不合法，停止分页
        if (nodes.length === 0 || typeof nextPage !== "number" || nextPage <= page) {
          hasMore = false;
        } else {
          page = nextPage;
        }
      } catch (error) {
        console.error(`Failed to fetch ${page} active nodes:`, error);
        break;
      }
    }

    return allNodes;
  }

  async fetchAllActiveChannels(): Promise<RustChannelInfo[]> {
    const allChannels: RustChannelInfo[] = [];
    let page = 0;
    let hasMore = true;
    const PAGE_SIZE = 500;

    while (hasMore) {
      try {
        const response = await this.getActiveChannelsByPage(page, PAGE_SIZE);
        const channels = response.channels || [];
        allChannels.push(...channels);

        // 使用后端返回的 next_page 控制分页
        const nextPage = response.next_page;
        // 如果没有数据或 next_page 不合法，停止分页
        if (channels.length === 0 || typeof nextPage !== "number" || nextPage <= page) {
          hasMore = false;
        } else {
          page = nextPage;
        }
      } catch (error) {
        console.error(`Failed to fetch ${page} active channels:`, error);
        break;
      }
    }

    return allChannels;
  }

  async fetchAllHistoricalNodes(
    start?: string,
    end?: string
  ): Promise<RustNodeInfo[]> {
    const allNodes: RustNodeInfo[] = [];
    let page = 0;
    let hasMore = true;
    const PAGE_SIZE = 500;

    while (hasMore) {
      try {
        const response = await this.getHistoricalNodesByPage(page, start, end);
        const nodes = response.nodes || [];
        allNodes.push(...nodes);

        hasMore = nodes.length === PAGE_SIZE;
        page++;
      } catch (error) {
        console.error(`Failed to fetch ${page} historical nodes:`, error);
        break;
      }
    }

    return allNodes;
  }

  async fetchAllHistoricalChannels(
    start?: string,
    end?: string
  ): Promise<RustChannelInfo[]> {
    const allChannels: RustChannelInfo[] = [];
    let page = 0;
    let hasMore = true;
    const PAGE_SIZE = 500;

    while (hasMore) {
      try {
        const response = await this.getHistoricalChannelsByPage(
          page,
          start,
          end
        );
        const channels = response.channels || [];
        allChannels.push(...channels);

        hasMore = channels.length === PAGE_SIZE;
        page++;
      } catch (error) {
        console.error(`Failed to fetch ${page} historical channels:`, error);
        break;
      }
    }

    return allChannels;
  }

  async fetchKpiData(): Promise<KpiData> {
    const channelCapacities = await this.getActiveAnalysis();

    const totalNodes = +channelCapacities.total_nodes;
    const totalChannels = +channelCapacities.channel_len;
    const totalCapacity = APIUtils.parseChannelCapacityToCKB(
      channelCapacities.total_capacity
    );
    const averageChannelCapacity = APIUtils.parseChannelCapacityToCKB(
      channelCapacities.avg_capacity
    );
    const maxChannelCapacity = APIUtils.parseChannelCapacityToCKB(
      channelCapacities.max_capacity
    );
    const minChannelCapacity = APIUtils.parseChannelCapacityToCKB(
      channelCapacities.min_capacity
    );
    const medianChannelCapacity = APIUtils.parseChannelCapacityToCKB(
      channelCapacities.median_capacity
    );

    return {
      totalCapacity,
      totalNodes,
      totalChannels,
      averageChannelCapacity,
      maxChannelCapacity,
      minChannelCapacity,
      medianChannelCapacity,
    };
  }

  async fetchKpiDataByTimeRange(
    timeRange: "hourly" | "monthly" | "yearly"
  ): Promise<KpiData> {
    if (timeRange === "hourly") {
      // Use active analysis for hourly data and compare with last week
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch current data and last week data in parallel
      const [currentData, lastWeekData] = await Promise.all([
        this.getActiveAnalysis(),
        this.getActiveAnalysis(oneWeekAgo.toISOString()),
      ]);

      const totalNodes = +currentData.total_nodes;
      const totalChannels = +currentData.channel_len;
      const totalCapacity = APIUtils.parseChannelCapacityToCKB(
        currentData.total_capacity
      );
      const averageChannelCapacity = APIUtils.parseChannelCapacityToCKB(
        currentData.avg_capacity
      );
      const maxChannelCapacity = APIUtils.parseChannelCapacityToCKB(
        currentData.max_capacity
      );
      const minChannelCapacity = APIUtils.parseChannelCapacityToCKB(
        currentData.min_capacity
      );
      const medianChannelCapacity = APIUtils.parseChannelCapacityToCKB(
        currentData.median_capacity
      );

      // Calculate changes from last week
      const lastWeekTotalCapacity = APIUtils.parseChannelCapacityToCKB(
        lastWeekData.total_capacity
      );
      const lastWeekTotalNodes = +lastWeekData.total_nodes;
      const lastWeekTotalChannels = +lastWeekData.channel_len;
      const lastWeekAvgCapacity = APIUtils.parseChannelCapacityToCKB(
        lastWeekData.avg_capacity
      );
      const lastWeekMaxCapacity = APIUtils.parseChannelCapacityToCKB(
        lastWeekData.max_capacity
      );
      const lastWeekMinCapacity = APIUtils.parseChannelCapacityToCKB(
        lastWeekData.min_capacity
      );
      const lastWeekMedianCapacity = APIUtils.parseChannelCapacityToCKB(
        lastWeekData.median_capacity
      );

      return {
        totalCapacity,
        totalNodes,
        totalChannels,
        averageChannelCapacity,
        maxChannelCapacity,
        minChannelCapacity,
        medianChannelCapacity,
        // Calculate percentage changes (rounded to 2 decimal places)
        totalCapacityChange:
          lastWeekTotalCapacity > 0
            ? parseFloat((((totalCapacity - lastWeekTotalCapacity) / lastWeekTotalCapacity) * 100).toFixed(2))
            : 0,
        totalNodesChange:
          lastWeekTotalNodes > 0
            ? parseFloat((((totalNodes - lastWeekTotalNodes) / lastWeekTotalNodes) * 100).toFixed(2))
            : 0,
        totalChannelsChange:
          lastWeekTotalChannels > 0
            ? parseFloat((((totalChannels - lastWeekTotalChannels) / lastWeekTotalChannels) * 100).toFixed(2))
            : 0,
        averageChannelCapacityChange:
          lastWeekAvgCapacity > 0
            ? parseFloat((((averageChannelCapacity - lastWeekAvgCapacity) / lastWeekAvgCapacity) * 100).toFixed(2))
            : 0,
        maxChannelCapacityChange:
          lastWeekMaxCapacity > 0
            ? parseFloat((((maxChannelCapacity - lastWeekMaxCapacity) / lastWeekMaxCapacity) * 100).toFixed(2))
            : 0,
        minChannelCapacityChange:
          lastWeekMinCapacity > 0
            ? parseFloat((((minChannelCapacity - lastWeekMinCapacity) / lastWeekMinCapacity) * 100).toFixed(2))
            : 0,
        medianChannelCapacityChange:
          lastWeekMedianCapacity > 0
            ? parseFloat((((medianChannelCapacity - lastWeekMedianCapacity) / lastWeekMedianCapacity) * 100).toFixed(2))
            : 0,
      };
    } else {
      // Use history analysis for monthly/yearly data
      // monthly: 最近3个月, yearly: 最近2年
      const range = timeRange === "monthly" ? "3M" : "2Y";
      const historyAnalysis = await this.getHistoryAnalysis({
        range,
        interval: "day", // 后端目前只支持day级别的interval
        fields: ["capacity", "channels", "nodes"],
      });

      const capacitySeries = historyAnalysis.series.find(
        s => s.name === "Capacity"
      );
      const channelsSeries = historyAnalysis.series.find(
        s => s.name === "Channels"
      );
      const nodesSeries = historyAnalysis.series.find(
        s => s.name === "Nodes"
      );

      // Get the last data point
      const lastCapacityPoint =
        capacitySeries &&
        capacitySeries.points[capacitySeries.points.length - 1];
      const lastChannelsPoint =
        channelsSeries &&
        channelsSeries.points[channelsSeries.points.length - 1];
      const lastNodesPoint =
        nodesSeries && nodesSeries.points[nodesSeries.points.length - 1];

      // Capacity aggregation: [sum, avg, min, max, median]
      const capAgg = lastCapacityPoint
        ? lastCapacityPoint[1]
        : ["0", "0", "0", "0", "0"];

      return {
        totalCapacity: APIUtils.parseChannelCapacityToCKB(capAgg[0]),
        averageChannelCapacity: APIUtils.parseChannelCapacityToCKB(capAgg[1]),
        minChannelCapacity: APIUtils.parseChannelCapacityToCKB(capAgg[2]),
        maxChannelCapacity: APIUtils.parseChannelCapacityToCKB(capAgg[3]),
        medianChannelCapacity: APIUtils.parseChannelCapacityToCKB(capAgg[4]),
        totalChannels: lastChannelsPoint ? lastChannelsPoint[1] : 0,
        totalNodes: lastNodesPoint ? lastNodesPoint[1] : 0,
      };
    }
  }

  async fetchChannelCapacityHistoryTimeSeries() {
    // Use the new getHistoryAnalysis API to get time series data
    const historyAnalysis = await this.getHistoryAnalysis({
      range: "1M", // Get last month of data
      interval: "day",
      fields: ["channels", "capacity"],
    });

    // Extract capacity and channels series from the response
    const capacitySeries = historyAnalysis.series.find(
      s => s.name === "Capacity"
    );
    const channelsSeries = historyAnalysis.series.find(
      s => s.name === "Channels"
    );

    // Convert the data format to match the expected TimeSeries format
    // Capacity now returns [sum, avg, min, max, median], we'll use sum for total capacity
    const capacityTimeSeries: TimeSeriesData[] =
      capacitySeries?.points.map(point => {
        return {
          timestamp: point[0],
          value: APIUtils.parseChannelCapacityToCKB(point[1][0]), // Use sum (first element)
        };
      }) || [];

    const channelsTimeSeries: TimeSeriesData[] =
      channelsSeries?.points.map(point => ({
        timestamp: point[0],
        value: point[1],
      })) || [];

    return {
      capacity: {
        label: "Total Capacity (CKB)",
        data: capacityTimeSeries,
      },
      channels: {
        label: "Total Channels",
        data: channelsTimeSeries,
      },
    };
  }

  async fetchCapacityHistoryTimeSeriesWithAggregation(
    aggregationType: "sum" | "avg" | "min" | "max" | "median" = "sum",
    range: "1M" | "3M" | "6M" | "1Y" | "2Y" = "1M",
    interval: "day" = "day"
  ) {
    // Use the new getHistoryAnalysis API to get time series data
    const historyAnalysis = await this.getHistoryAnalysis({
      range,
      interval,
      fields: ["capacity"],
    });

    // Extract capacity series from the response
    const capacitySeries = historyAnalysis.series.find(
      s => s.name === "Capacity"
    );

    const aggregationIndex = {
      sum: 0,
      avg: 1,
      min: 2,
      max: 3,
      median: 4,
    }[aggregationType];

    // Convert the data format to match the expected TimeSeries format
    const capacityTimeSeries: TimeSeriesData[] =
      capacitySeries?.points.map(point => {
        return {
          timestamp: point[0],
          value: APIUtils.parseChannelCapacityToCKB(point[1][aggregationIndex]),
        };
      }) || [];

    return {
      capacity: {
        label: `${aggregationType.charAt(0).toUpperCase() + aggregationType.slice(1)} Capacity (CKB)`,
        data: capacityTimeSeries,
      },
    };
  }

  async fetchNodeHistoryTimeSeries() {
    // Use the new getHistoryAnalysis API to get time series data
    const historyAnalysis = await this.getHistoryAnalysis({
      range: "1M", // Get last month of data
      interval: "day",
      fields: ["nodes"],
    });

    // Extract nodes series from the response
    const nodesSeries = historyAnalysis.series.find(s => s.name === "Nodes");

    // Convert the data format to match the expected TimeSeries format
    const nodesTimeSeries: TimeSeriesData[] =
      nodesSeries?.points.map(point => ({
        timestamp: point[0],
        value: point[1],
      })) || [];

    return {
      nodes: {
        label: "Total Nodes",
        data: nodesTimeSeries,
      },
    };
  }

  async fetchTimeSeriesDataByTimeRange(
    timeRange: "hourly" | "monthly" | "yearly"
  ) {
    // Map timeRange to API range parameter
    // hourly: 最近1个月的数据（API支持的最短时间范围）
    // monthly: 最近3个月的数据
    // yearly: 最近3年的数据
    const rangeMap = {
      hourly: "1M" as const,
      monthly: "3M" as const,
      yearly: "2Y" as const, // 使用2Y获取最近2年数据
    };

    const range = rangeMap[timeRange];
    const historyAnalysis = await this.getHistoryAnalysis({
      range,
      interval: "day", // 后端目前只支持day级别的interval
      fields: ["capacity", "channels", "nodes"],
    });

    const capacitySeries = historyAnalysis.series.find(
      s => s.name === "Capacity"
    );
    const channelsSeries = historyAnalysis.series.find(
      s => s.name === "Channels"
    );
    const nodesSeries = historyAnalysis.series.find(s => s.name === "Nodes");

    // Convert capacity series (using sum aggregation)
    const capacityTimeSeries: TimeSeriesData[] =
      capacitySeries?.points.map(point => ({
        timestamp: point[0],
        value: APIUtils.parseChannelCapacityToCKB(point[1][0]), // sum
      })) || [];

    // Convert channels series
    const channelsTimeSeries: TimeSeriesData[] =
      channelsSeries?.points.map(point => ({
        timestamp: point[0],
        value: point[1],
      })) || [];

    // Convert nodes series
    const nodesTimeSeries: TimeSeriesData[] =
      nodesSeries?.points.map(point => ({
        timestamp: point[0],
        value: point[1],
      })) || [];

    return {
      capacity: {
        label: "Total capacity",
        data: capacityTimeSeries,
      },
      channels: {
        label: "Total channels",
        data: channelsTimeSeries,
      },
      nodes: {
        label: "Total active nodes",
        data: nodesTimeSeries,
      },
    };
  }

  async fetchDashboardData(): Promise<DashboardData> {
    const [nodes, channels, channelCapacities] = await Promise.all([
      this.fetchAllActiveNodes(),
      this.fetchAllActiveChannels(),
      this.getActiveAnalysis(),
    ]);

    const totalCapacity = APIUtils.parseChannelCapacityToCKB(
      channelCapacities.total_capacity
    );

    const geoNodes = APIUtils.calculateGeographicalDistribution(
      nodes,
      channels
    );

    const cityNodes = APIUtils.calculateCityGeographicalDistribution(
      nodes,
      channels
    );

    const nodeLocations = APIUtils.getNodeLocations(nodes, channels);

    const ispRankings = APIUtils.getISPRankings(nodes, channels);

    const timeSeriesData = APIUtils.getTimeSeriesData(totalCapacity);

    return {
      timeSeries: [
        {
          label: "Network Capacity (CKB)",
          data: timeSeriesData,
        },
      ],
      geoNodes,
      cityNodes,
      nodeLocations,
      ispRankings,
    };
  }

  async fetchTopNodesByCapacity(
    limit: number = 3,
    timeRange: "hourly" | "monthly" = "hourly",
    start?: string,
    end?: string
  ) {
    // 使用 nodes_hourly 接口的排序功能，按 channel_count 排序获取前 limit 个节点
    // 服务端已经提供了 channel_count 字段和排序功能，不需要再调用 channels_hourly 接口合并数据
    if (timeRange === "hourly") {
      // 使用服务端排序：sort_by=channel_count&order=desc
      const response = await this.getActiveNodesByPage(0, "channel_count", "desc");
      const nodes = response.nodes || [];
      
      // 服务端已按 channel_count 降序排序，直接取前 limit 个
      return nodes
        .slice(0, limit)
        .map(node => ({
          id: node.node_id,
          node_id: node.node_id,
          channel_count: node.channel_count || 0,
        }));
    } else {
      // monthly 模式暂时保持原有逻辑
      const [nodes, channels] = await Promise.all([
        this.fetchAllHistoricalNodes(start, end),
        this.fetchAllHistoricalChannels(start, end),
      ]);

      const nodesWithInfo = APIUtils.getNodeChannelInfoFromChannels(
        nodes,
        channels
      );

      // 按 channel_count 降序排序，取前 limit 个
      return nodesWithInfo
        .sort((a, b) => b.totalChannels - a.totalChannels)
        .slice(0, limit)
        .map(node => ({
          id: node.node_id,
          node_id: node.node_id,
          channel_count: node.totalChannels,
        }));
    }
  }

  async fetchHistoricalDashboardData(
    start?: string,
    end?: string
  ): Promise<DashboardData> {
    const [nodes, channels] = await Promise.all([
      this.fetchAllHistoricalNodes(start, end),
      this.fetchAllHistoricalChannels(start, end),
    ]);

    const geoNodes = APIUtils.calculateGeographicalDistribution(
      nodes,
      channels
    );

    const cityNodes = APIUtils.calculateCityGeographicalDistribution(
      nodes,
      channels
    );

    const nodeLocations = APIUtils.getNodeLocations(nodes, channels);

    const ispRankings = APIUtils.getISPRankings(nodes, channels);

    const timeSeriesData = APIUtils.getHistoricalTimeSeriesData(nodes);

    return {
      timeSeries: [
        {
          label: "Network Capacity (CKB)",
          data: timeSeriesData,
        },
      ],
      geoNodes,
      cityNodes,
      nodeLocations,
      ispRankings,
    };
  }
}

export class MainnetAPIClient extends APIClient {
  constructor(baseUrl?: string) {
    super(baseUrl, "mainnet");
  }
}

export class TestnetAPIClient extends APIClient {
  constructor(baseUrl?: string) {
    super(baseUrl, "testnet");
  }
}

export class APIUtils {
  static filterChannelsByValidNodes(
    nodes: RustNodeInfo[],
    channels: RustChannelInfo[]
  ): RustChannelInfo[] {
    const validNodeIds = new Set(nodes.map(node => node.node_id));
    const validChannels = channels.filter(
      channel =>
        validNodeIds.has(channel.node1) && validNodeIds.has(channel.node2)
    );

    if (validChannels.length !== channels.length) {
      console.warn(
        `APIUtils: Filtered out ${channels.length - validChannels.length} channels with missing nodes. Total channels: ${channels.length}, Valid channels: ${validChannels.length}`
      );
    }

    return validChannels;
  }

  private static reduceChannelTotalCapacity(
    sum: number,
    channel: RustChannelInfo
  ) {
    try {
      const capacity = channel.capacity;
      return sum + APIUtils.parseChannelCapacityToCKB(capacity);
    } catch (error) {
      console.warn("Error parsing channel capacity:", error, channel);
      return sum;
    }
  }

  static getTotalCapacityFromChannels(channels: RustChannelInfo[]) {
    return channels.reduce(APIUtils.reduceChannelTotalCapacity, 0);
  }

  static addGroupToChannels(channels: RustChannelInfo[]) {
    const groupMap = new Map<string, number>();
    let groupCounter = 0;

    return channels.map(channel => {
      // canonical key (only used in the Map)
      const key = [channel.node1, channel.node2].sort().join("|");

      let groupId = groupMap.get(key);
      if (groupId === undefined) {
        groupId = groupCounter++;
        groupMap.set(key, groupId);
      }

      return { ...channel, group: groupId };
    });
  }

  static getNodeChannelInfoFromChannels(
    nodes: RustNodeInfo[],
    channels: RustChannelInfo[]
  ) {
    const nodeCapacity = new Map<string, number>();
    const nodeChannelCount = new Map<string, number>();

    channels.forEach(channel => {
      try {
        const capacityInCKB = APIUtils.parseChannelCapacityToCKB(
          channel.capacity
        );
        // Add full channel capacity to both nodes
        nodeCapacity.set(
          channel.node1,
          (nodeCapacity.get(channel.node1) || 0) + capacityInCKB
        );
        nodeCapacity.set(
          channel.node2,
          (nodeCapacity.get(channel.node2) || 0) + capacityInCKB
        );

        // Count channels for each node
        nodeChannelCount.set(
          channel.node1,
          (nodeChannelCount.get(channel.node1) || 0) + 1
        );
        nodeChannelCount.set(
          channel.node2,
          (nodeChannelCount.get(channel.node2) || 0) + 1
        );
      } catch (error) {
        console.warn("Error processing channel for node data:", error, channel);
      }
    });

    return nodes.map(node => {
      const totalCapacity = Math.max(0, nodeCapacity.get(node.node_id) || 0);
      const totalChannels = nodeChannelCount.get(node.node_id) || 0;

      return {
        ...{
          totalCapacity,
          totalChannels,
        },
        ...node,
      };
    });
  }

  static getAverageChannelCapacity(
    totalCapacity: number,
    totalChannels: number
  ) {
    return totalChannels > 0 ? totalCapacity / totalChannels : 0;
  }

  static calculateGeographicalDistribution(
    nodes: RustNodeInfo[],
    channels: RustChannelInfo[]
  ): GeoNode[] {
    // country -> node count
    const nodeCountByCountry = new Map<string, number>();
    nodes.forEach(node => {
      const country = node.country_or_region || "Unknown";
      nodeCountByCountry.set(
        country,
        (nodeCountByCountry.get(country) || 0) + 1
      );
    });

    // node_id -> country
    const nodeToCountry = new Map<string, string>();
    nodes.forEach(node => {
      nodeToCountry.set(node.node_id, node.country_or_region || "Unknown");
    });

    // node_id -> capacity
    const capacityByCountry = new Map<string, number>();
    channels.forEach(channel => {
      try {
        const capacityInCKB = APIUtils.parseChannelCapacityToCKB(
          channel.capacity
        );
        const node1Country = nodeToCountry.get(channel.node1) || "Unknown";
        const node2Country = nodeToCountry.get(channel.node2) || "Unknown";

        // Distribute capacity equally between both countries
        capacityByCountry.set(
          node1Country,
          (capacityByCountry.get(node1Country) || 0) + capacityInCKB / 2
        );
        capacityByCountry.set(
          node2Country,
          (capacityByCountry.get(node2Country) || 0) + capacityInCKB / 2
        );
      } catch (error) {
        console.warn("Error processing channel for geo data:", error, channel);
      }
    });

    // Convert to GeoNode array and filter/sort
    return Array.from(nodeCountByCountry.entries())
      .map(([countryCode, nodeCount]) => ({
        country: getCountryName(countryCode),
        countryCode,
        nodeCount,
        totalCapacity:
          Math.round(
            Math.max(0, capacityByCountry.get(countryCode) || 0) * 100
          ) / 100,
      }))
      .filter(
        geoNode =>
          geoNode.country !== "Unknown" &&
          geoNode.country !== "undefined" &&
          geoNode.countryCode !== "Unknown"
      )
      .sort((a, b) => b.nodeCount - a.nodeCount);
  }

  // 新增：计算城市级别的地理分布
  static calculateCityGeographicalDistribution(
    nodes: RustNodeInfo[],
    channels: RustChannelInfo[]
  ): CityNode[] {
    // 解析坐标的辅助函数
    const parseCoordinates = (
      loc: string | undefined
    ): [number, number] | null => {
      if (!loc) return null;
      try {
        const [lat, lng] = loc
          .split(",")
          .map(coord => parseFloat(coord.trim()));
        if (isNaN(lat) || isNaN(lng)) return null;
        return [lat, lng];
      } catch {
        return null;
      }
    };

    // 城市 -> 节点信息映射
    const cityMap = new Map<
      string,
      {
        country: string;
        countryCode: string;
        nodeIds: string[];
        coordinates: [number, number] | null;
      }
    >();

    // 处理节点数据
    nodes.forEach(node => {
      const city = node.city || "Unknown City";
      const country = node.country_or_region || "Unknown";
      const countryCode = getCountryCode(country);
      const coordinates = parseCoordinates(node.loc);

      if (!cityMap.has(city)) {
        cityMap.set(city, {
          country,
          countryCode,
          nodeIds: [],
          coordinates,
        });
      }

      const cityInfo = cityMap.get(city)!;
      cityInfo.nodeIds.push(node.node_id);

      // 如果这个节点有坐标信息，更新城市坐标
      if (coordinates && !cityInfo.coordinates) {
        cityInfo.coordinates = coordinates;
      }
    });

    // node_id -> country 映射（用于容量计算）
    const nodeToCountry = new Map<string, string>();
    nodes.forEach(node => {
      nodeToCountry.set(node.node_id, node.country_or_region || "Unknown");
    });

    // 城市 -> 容量映射
    const capacityByCity = new Map<string, number>();
    channels.forEach(channel => {
      try {
        const capacityInCKB = APIUtils.parseChannelCapacityToCKB(
          channel.capacity
        );

        // 找到对应的城市
        const node1City =
          nodes.find(n => n.node_id === channel.node1)?.city || "Unknown City";
        const node2City =
          nodes.find(n => n.node_id === channel.node2)?.city || "Unknown City";

        // 分配容量到城市
        capacityByCity.set(
          node1City,
          (capacityByCity.get(node1City) || 0) + capacityInCKB / 2
        );
        capacityByCity.set(
          node2City,
          (capacityByCity.get(node2City) || 0) + capacityInCKB / 2
        );
      } catch (error) {
        console.warn(
          "Error processing channel for city geo data:",
          error,
          channel
        );
      }
    });

    // 转换为 CityNode 数组
    return Array.from(cityMap.entries())
      .map(([city, cityInfo]) => {
        const coordinates = cityInfo.coordinates || [0, 0]; // 默认坐标
        return {
          city,
          country: cityInfo.country,
          countryCode: cityInfo.countryCode,
          latitude: coordinates[0],
          longitude: coordinates[1],
          nodeCount: cityInfo.nodeIds.length,
          totalCapacity:
            Math.round(Math.max(0, capacityByCity.get(city) || 0) * 100) / 100,
          nodeIds: cityInfo.nodeIds,
        };
      })
      .filter(
        cityNode =>
          cityNode.city !== "Unknown City" &&
          cityNode.country !== "Unknown" &&
          cityNode.countryCode !== "Unknown" &&
          (cityNode.latitude !== 0 || cityNode.longitude !== 0) // 过滤掉没有有效坐标的城市
      )
      .sort((a, b) => b.nodeCount - a.nodeCount);
  }

  // 新增：获取单个节点的位置信息
  static getNodeLocations(
    nodes: RustNodeInfo[],
    channels: RustChannelInfo[]
  ): NodeLocation[] {
    // 解析坐标的辅助函数
    const parseCoordinates = (
      loc: string | undefined
    ): [number, number] | null => {
      if (!loc) return null;
      try {
        const [lat, lng] = loc
          .split(",")
          .map(coord => parseFloat(coord.trim()));
        if (isNaN(lat) || isNaN(lng)) return null;
        return [lat, lng];
      } catch {
        return null;
      }
    };

    // node_id -> capacity mapping
    const nodeCapacity = new Map<string, number>();
    channels.forEach(channel => {
      try {
        const capacityInCKB = APIUtils.parseChannelCapacityToCKB(
          channel.capacity
        );
        // 将容量分配给两个节点
        nodeCapacity.set(
          channel.node1,
          (nodeCapacity.get(channel.node1) || 0) + capacityInCKB / 2
        );
        nodeCapacity.set(
          channel.node2,
          (nodeCapacity.get(channel.node2) || 0) + capacityInCKB / 2
        );
      } catch (error) {
        console.warn(
          "Error processing channel for node location:",
          error,
          channel
        );
      }
    });

    return nodes
      .map(node => {
        const coordinates = parseCoordinates(node.loc);
        if (!coordinates) return null;

        return {
          nodeId: node.node_id,
          nodeName: node.node_name,
          city: node.city || "Unknown City",
          country: node.country_or_region || "Unknown",
          countryCode: getCountryCode(node.country_or_region || "Unknown"),
          latitude: coordinates[0],
          longitude: coordinates[1],
          capacity:
            Math.round(Math.max(0, nodeCapacity.get(node.node_id) || 0) * 100) /
            100,
        };
      })
      .filter(
        (node): node is NodeLocation =>
          node !== null &&
          node.city !== "Unknown City" &&
          node.country !== "Unknown" &&
          node.countryCode !== "Unknown"
      )
      .sort((a, b) => b.capacity - a.capacity);
  }

  static getISPRankings(
    nodes: RustNodeInfo[],
    channels: RustChannelInfo[]
  ): IspRanking[] {
    // 计算ISP分布 - 从地址中提取ISP信息
    const ispMap = new Map<string, { count: number; capacity: number }>();

    // 初始化ISP映射
    nodes.forEach((node: RustNodeInfo) => {
      const isp =
        extractISPFromAddresses(node.addresses || []) || "Unknown ISP";
      if (!ispMap.has(isp)) {
        ispMap.set(isp, { count: 0, capacity: 0 });
      }
      ispMap.get(isp)!.count++;
    });

    // 分配容量到ISP
    channels.forEach((channel: RustChannelInfo) => {
      try {
        const capacity = channel.capacity;
        const capacityInCKB = APIUtils.parseChannelCapacityToCKB(capacity);

        // 获取节点对应的ISP
        const node1 = nodes.find(
          (n: RustNodeInfo) => n.node_id === channel.node1
        );
        const node2 = nodes.find(
          (n: RustNodeInfo) => n.node_id === channel.node2
        );

        const isp1 =
          extractISPFromAddresses(node1?.addresses || []) || "Unknown ISP";
        const isp2 =
          extractISPFromAddresses(node2?.addresses || []) || "Unknown ISP";

        if (ispMap.has(isp1)) {
          ispMap.get(isp1)!.capacity += capacityInCKB / 2;
        }
        if (ispMap.has(isp2)) {
          ispMap.get(isp2)!.capacity += capacityInCKB / 2;
        }
      } catch (error) {
        console.warn("Error processing channel for ISP data:", error, channel);
      }
    });

    const ispRankings: IspRanking[] = Array.from(ispMap.entries())
      .map(([isp, data]) => ({
        isp,
        nodeCount: data.count,
        totalCapacity: Math.round(data.capacity * 100) / 100, // Round to 2 decimal places
        averageCapacity:
          data.count > 0
            ? Math.round((data.capacity / data.count) * 100) / 100
            : 0,
      }))
      .sort((a, b) => b.nodeCount - a.nodeCount)
      .slice(0, 10);
    return ispRankings;
  }

  static getTimeSeriesData(totalCapacity: number) {
    // 生成时间序列数据 - 使用最近的数据模拟
    const now = new Date();
    const timeSeriesData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      timeSeriesData.push({
        timestamp: date.toISOString(),
        value: Math.floor(totalCapacity * (0.8 + Math.random() * 0.4)),
      });
    }
    return timeSeriesData;
  }

  /**
   * 基于历史节点数据生成真实的时间序列数据
   */
  static getHistoricalTimeSeriesData(nodes: RustNodeInfo[]) {
    const dailyMap = new Map<string, Set<string>>();

    // 按日期分组，统计每天的唯一节点
    nodes.forEach(node => {
      const date = new Date(node.commit_timestamp).toISOString().split("T")[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, new Set());
      }
      dailyMap.get(date)!.add(node.node_id);
    });

    // 转换为时间序列格式
    return Array.from(dailyMap.entries())
      .map(([date, nodeIds]) => ({
        timestamp: new Date(date).toISOString(),
        value: nodeIds.size,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  static parseChannelCapacityToCKB(capacity: string | number): number {
    const capacityInShannons =
      typeof capacity === "string"
        ? capacity.startsWith("0x") && capacity.length === 34
          ? u128LittleEndianToDecimal(capacity)
          : hexToDecimal(capacity)
        : BigInt(capacity);
    return Number(capacityInShannons) / SHANNONS_PER_CKB;
  }

  /**
   * Filters out duplicate channels based on channel_outpoint
   * channel_outpoint is the most unique identifier for a channel as it represents
   * the specific transaction output that created the channel
   */
  static getUniqueChannels(channels: RustChannelInfo[]): RustChannelInfo[] {
    const seenOutpoints = new Set<string>();
    const uniqueChannels: RustChannelInfo[] = [];

    channels.forEach(channel => {
      if (!seenOutpoints.has(channel.channel_outpoint)) {
        seenOutpoints.add(channel.channel_outpoint);
        uniqueChannels.push(channel);
      }
    });

    return uniqueChannels;
  }

  /**
   * Filters out duplicate nodes based on node_id
   * node_id is the unique identifier for a node
   */
  static getUniqueNodes(nodes: RustNodeInfo[]): RustNodeInfo[] {
    const seenNodeIds = new Set<string>();
    const uniqueNodes: RustNodeInfo[] = [];

    nodes.forEach(node => {
      if (!seenNodeIds.has(node.node_id)) {
        seenNodeIds.add(node.node_id);
        uniqueNodes.push(node);
      }
    });

    return uniqueNodes;
  }

  /**
   * Aggregates historical channel data into daily intervals
   * Filters out duplicate channels based on channel_outpoint
   */
  static aggregateChannelDataByDay(channels: RustChannelInfo[]) {
    const dailyData = new Map<string, { channels: number; capacity: number }>();

    // Get unique channels first
    const uniqueChannels = APIUtils.getUniqueChannels(channels);

    // Aggregate by day
    uniqueChannels.forEach(channel => {
      const date = new Date(channel.commit_timestamp)
        .toISOString()
        .split("T")[0];

      if (!dailyData.has(date)) {
        dailyData.set(date, { channels: 0, capacity: 0 });
      }

      const dayData = dailyData.get(date)!;
      dayData.channels += 1;
      dayData.capacity += APIUtils.parseChannelCapacityToCKB(channel.capacity);
    });

    return dailyData;
  }

  /**
   * Converts daily aggregated data to cumulative time series
   */
  static convertToCumulativeTimeSeries(
    dailyData: Map<string, { channels: number; capacity: number }>
  ) {
    const sortedDates = Array.from(dailyData.keys()).sort();

    let cumulativeChannels = 0;
    let cumulativeCapacity = 0;

    const capacityTimeSeries: TimeSeriesData[] = sortedDates.map(date => {
      cumulativeCapacity += dailyData.get(date)!.capacity;
      return {
        timestamp: new Date(date).toISOString(),
        value: Math.round(cumulativeCapacity * 100) / 100,
      };
    });

    const channelsTimeSeries: TimeSeriesData[] = sortedDates.map(date => {
      cumulativeChannels += dailyData.get(date)!.channels;
      return {
        timestamp: new Date(date).toISOString(),
        value: cumulativeChannels,
      };
    });

    return { capacityTimeSeries, channelsTimeSeries };
  }

  /**
   * Aggregates historical node data into daily intervals
   * Filters out duplicate nodes based on node_id
   */
  static aggregateNodeDataByDay(nodes: RustNodeInfo[]) {
    const dailyData = new Map<string, { nodes: number }>();

    // Get unique nodes first
    const uniqueNodes = APIUtils.getUniqueNodes(nodes);

    // Aggregate by day
    uniqueNodes.forEach(node => {
      const date = new Date(node.commit_timestamp).toISOString().split("T")[0];

      if (!dailyData.has(date)) {
        dailyData.set(date, { nodes: 0 });
      }

      const dayData = dailyData.get(date)!;
      dayData.nodes += 1;
    });

    return dailyData;
  }

  /**
   * Converts daily node data to cumulative time series
   */
  static convertNodeDataToCumulativeTimeSeries(
    dailyData: Map<string, { nodes: number }>
  ) {
    const sortedDates = Array.from(dailyData.keys()).sort();

    let cumulativeNodes = 0;

    const nodesTimeSeries: TimeSeriesData[] = sortedDates.map(date => {
      cumulativeNodes += dailyData.get(date)!.nodes;
      return {
        timestamp: new Date(date).toISOString(),
        value: cumulativeNodes,
      };
    });

    return nodesTimeSeries;
  }
}

function getCountryCode(country: string): string {
  // If already a 2-letter country code, return as-is
  if (country && country.length === 2) {
    return country.toUpperCase();
  }

  // Map full country names to codes
  const countryCodes: Record<string, string> = {
    USA: "US",
    "United States": "US",
    Germany: "DE",
    Netherlands: "NL",
    England: "GB",
    "United Kingdom": "GB",
    China: "CN",
    Canada: "CA",
    France: "FR",
    Japan: "JP",
    Australia: "AU",
    Switzerland: "CH",
    Singapore: "SG",
    Russia: "RU",
    Brazil: "BR",
    India: "IN",
    "South Korea": "KR",
    "Hong Kong": "HK",
    "South Africa": "ZA",
    Indonesia: "ID",
    Italy: "IT",
    Spain: "ES",
    Sweden: "SE",
    Norway: "NO",
    Finland: "FI",
    Denmark: "DK",
    Belgium: "BE",
    Austria: "AT",
    Poland: "PL",
    Ireland: "IE",
  };
  return countryCodes[country] || country || "Unknown";
}

function getCountryName(country: string): string {
  // Map 2-letter codes to full country names for world map (matching GeoJSON)
  const countryNames: Record<string, string> = {
    US: "USA", // GeoJSON uses "USA", not "United States"
    HK: "China", // Hong Kong is part of China in this GeoJSON
    SG: "China", // Singapore not available, mapping to China as fallback
    DE: "Germany",
    AU: "Australia",
    ZA: "South Africa",
    BR: "Brazil",
    ID: "Indonesia",
    JP: "Japan",
    CN: "China",
    RU: "Russia",
    GB: "England", // GeoJSON uses "England" instead of "United Kingdom"
    CA: "Canada",
    FR: "France",
    CH: "Switzerland",
    IN: "India",
    KR: "South Korea",
    NL: "Netherlands",
    IT: "Italy",
    ES: "Spain",
    SE: "Sweden",
    NO: "Norway",
    FI: "Finland",
    DK: "Denmark",
    BE: "Belgium",
    AT: "Austria",
    PL: "Poland",
    IE: "Ireland",
  };
  return countryNames[country] || country || "Unknown";
}

function extractISPFromAddresses(addresses: string[]): string {
  if (!addresses || addresses.length === 0) return "Unknown ISP";

  const address = addresses[0];
  if (address.includes("cloudflare")) return "Cloudflare";
  if (address.includes("digitalocean")) return "DigitalOcean";
  if (address.includes("amazon") || address.includes("aws")) return "AWS";
  if (address.includes("ovh")) return "OVH";
  if (address.includes("hetzner")) return "Hetzner";
  if (address.includes("linode")) return "Linode";
  if (address.includes("vultr")) return "Vultr";
  if (address.includes("google")) return "Google Cloud";
  if (address.includes("azure") || address.includes("microsoft"))
    return "Azure";

  return "Other ISP";
}
