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
  ActiveAnalysisHourlyResponse,
  AssetAnalysis,
  AssetCapacityData,
  NodesByUdtResponse,
  UdtScript,
  UdtCfgInfosSchema,
  ActiveAnalysisSchema,
  ActiveAnalysisHourlyResponseSchema,
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
import { hexToDecimal } from "./utils";
import { isSupportedAsset, SUPPORTED_ASSETS } from "./config/assets";

export class APIClient {
  constructor(
    public baseUrl: string = API_CONFIG.baseUrl,
    public net: "mainnet" | "testnet" = "mainnet"
  ) {}

  private async apiRequest<T>(
    endpoint: string,
    options?: RequestInit,
    schema?: z.ZodSchema<T>,
    skipNetParam: boolean = false
  ): Promise<T> {
    // Add net parameter to URL unless skipNetParam is true
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = skipNetParam 
      ? `${this.baseUrl}${endpoint}`
      : `${this.baseUrl}${endpoint}${separator}net=${this.net}`;

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

  /**
   * 获取按资产分组的通道分析数据（新版 API）
   */
  async getActiveAnalysisHourly(end?: string): Promise<ActiveAnalysisHourlyResponse> {
    let endpoint = `/analysis_hourly`;
    if (end) {
      endpoint += `?end=${encodeURIComponent(end)}`;
    }
    return this.apiRequest<ActiveAnalysisHourlyResponse>(
      endpoint,
      undefined,
      ActiveAnalysisHourlyResponseSchema
    );
  }

  /**
   * 聚合多个资产的分析数据
   * @param assets - 资产分析数据数组
   * @param filterAsset - 要过滤的资产名称（小写），为空则聚合所有支持的资产
   */
  private aggregateAssetAnalysis(
    assets: AssetAnalysis[],
    filterAsset?: string
  ): Omit<AssetAnalysis, "name"> {
    // 过滤出支持的资产（ckb 和 usdi）
    let filteredAssets = assets.filter(asset => 
      isSupportedAsset(asset.name.toLowerCase())
    );

    // 如果指定了特定资产，只保留该资产
    if (filterAsset) {
      const normalizedFilter = filterAsset.toLowerCase();
      filteredAssets = filteredAssets.filter(
        asset => asset.name.toLowerCase() === normalizedFilter
      );
    }

    // 如果没有匹配的资产，返回空数据
    if (filteredAssets.length === 0) {
      return {
        max: "0",
        min: "0",
        avg: "0",
        median: "0",
        total: "0",
        channel_len: "0",
      };
    }

    // 如果只有一个资产，直接返回
    if (filteredAssets.length === 1) {
      const asset = filteredAssets[0];
      return {
        max: asset.max,
        min: asset.min,
        avg: asset.avg,
        median: asset.median,
        total: asset.total,
        channel_len: asset.channel_len,
      };
    }

    // 聚合多个资产的数据
    const totalCapacity = filteredAssets.reduce(
      (sum, asset) => sum + BigInt(asset.total),
      BigInt(0)
    );
    const totalChannels = filteredAssets.reduce(
      (sum, asset) => sum + BigInt(asset.channel_len),
      BigInt(0)
    );
    const maxCapacity = filteredAssets.reduce(
      (max, asset) => {
        const assetMax = BigInt(asset.max);
        return assetMax > max ? assetMax : max;
      },
      BigInt(0)
    );
    const minCapacity = filteredAssets.reduce(
      (min, asset) => {
        const assetMin = BigInt(asset.min);
        return min === BigInt(0) || assetMin < min ? assetMin : min;
      },
      BigInt(0)
    );

    // 计算加权平均值
    const weightedAvgSum = filteredAssets.reduce(
      (sum, asset) => sum + BigInt(asset.avg) * BigInt(asset.channel_len),
      BigInt(0)
    );
    const avgCapacity = totalChannels > BigInt(0) 
      ? weightedAvgSum / totalChannels 
      : BigInt(0);

    // 中位数简单取平均（更精确的计算需要所有通道数据）
    const medianSum = filteredAssets.reduce(
      (sum, asset) => sum + BigInt(asset.median),
      BigInt(0)
    );
    const medianCapacity = medianSum / BigInt(filteredAssets.length);

    return {
      max: maxCapacity.toString(),
      min: minCapacity.toString(),
      avg: avgCapacity.toString(),
      median: medianCapacity.toString(),
      total: totalCapacity.toString(),
      channel_len: totalChannels.toString(),
    };
  }

  async getHistoryAnalysis(
    params?: AnalysisRequestParams
  ): Promise<HistoryAnalysisResponse> {
    // 将 net 参数放入 body 而不是 URL
    const bodyParams = {
      ...params,
      net: this.net,
    };
    
    const response = await this.apiRequest<HistoryAnalysisResponse>(
      `/analysis`,
      {
        method: "POST",
        body: JSON.stringify(bodyParams),
      },
      undefined,
      true // skipNetParam: true - 不在 URL 上添加 net 参数
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
    states: ChannelState | ChannelState[],
    page: number = 0,
    pageSize: number = 10,
    sortBy: string = 'last_commit_time',
    order: 'asc' | 'desc' = 'desc',
    fuzzName?: string, // 模糊搜索 channel outpoint
    assetName?: string // 资产名称过滤
  ): Promise<GroupChannelsByStateResponse> {
    // 如果是数组，则拼接多个 state 参数
    const stateArray = Array.isArray(states) ? states : [states];
    const stateParams = stateArray.map(s => `state=${s}`).join('&');
    
    // 构建 URL，如果有 fuzzName 则添加
    let url = `/group_channel_by_state?${stateParams}&page=${page}&page_size=${pageSize}&sort_by=${sortBy}&order=${order}`;
    if (fuzzName && fuzzName.trim()) {
      url += `&fuzz_name=${encodeURIComponent(fuzzName.trim())}`;
    }
    if (assetName && assetName.trim()) {
      url += `&asset_name=${encodeURIComponent(assetName.trim())}`;
    }
    
    return this.apiRequest<GroupChannelsByStateResponse>(
      url,
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

  async getNodeInfo(nodeId: string): Promise<NodeInfoResponse | null> {
    console.log("getNodeInfo called with nodeId:", nodeId);
    const rawResponse = await this.apiRequest<NodeInfoApiResponse>(
      `/node_info?node_id=${encodeURIComponent(nodeId)}`,
      undefined,
      NodeInfoApiResponseSchema
    );
    console.log("getNodeInfo raw response:", rawResponse);

    // The API returns { node_info: { ...actual node data... } } or { node_info: null }
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

  async getChannelCountByAsset(): Promise<Record<string, number>> {
    return this.apiRequest<Record<string, number>>(
      `/channel_count_by_asset`
    );
  }

  async getChannelsByNodeId(
    nodeId: string,
    page: number = 0,
    sortBy: "create_time" | "last_commit_time" | "capacity" = "last_commit_time",
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
    timeRange: "hourly" | "monthly" | "yearly",
    filterAsset?: string, // 要过滤的资产名称（小写），为空则聚合所有支持的资产
    metricType?: "capacity" | "liquidity" // 指标类型: capacity=通道占用空间, liquidity=资产真实金额
  ): Promise<KpiData> {
    if (timeRange === "hourly") {
      // Use new analysis_hourly API with asset grouping
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch current data and last week data in parallel
      const [currentResponse, lastWeekResponse] = await Promise.all([
        this.getActiveAnalysisHourly(),
        this.getActiveAnalysisHourly(oneWeekAgo.toISOString()),
      ]);

      // 根据 metricType 选择使用 asset_analysis 或 capacity_analysis
      // 对于 All assets 或 CKB: 总是使用 capacity_analysis (因为 asset 和 capacity 相同)
      // 对于非 CKB: 
      //   - metricType === "capacity": 使用 capacity_analysis (通道占用的 CKB 空间)
      //   - metricType === "liquidity": 使用 asset_analysis (资产的真实金额)
      const useCapacityAnalysis = !filterAsset || filterAsset === "ckb" || metricType === "capacity";
      const analysisField = useCapacityAnalysis ? "capacity_analysis" : "asset_analysis";

      // Aggregate asset data based on filter
      const currentData = this.aggregateAssetAnalysis(
        currentResponse[analysisField],
        filterAsset
      );
      const lastWeekData = this.aggregateAssetAnalysis(
        lastWeekResponse[analysisField],
        filterAsset
      );

      // 确定资产名称和单位
      const assetName = filterAsset || ""; // 空字符串表示聚合所有资产
      
      // 根据模式确定单位和是否需要转换
      // Channel capacity 模式: 单位是 CKB，需要从 shannons 转换
      // Asset liquidity 模式: 单位是资产名称(如 USDI)，不需要转换
      const capacityUnit = useCapacityAnalysis 
        ? "CKB"  // capacity 模式总是 CKB
        : (isSupportedAsset(filterAsset || "") 
            ? SUPPORTED_ASSETS.find((a) => a.value === filterAsset?.toLowerCase())?.unit || "CKB"
            : "CKB");

      const totalNodes = +currentResponse.total_nodes;
      const totalChannels = +currentData.channel_len;
      
      // parseChannelCapacity 的第二个参数:
      // - 如果是空字符串或 "ckb": 会从 shannons 转换为 CKB
      // - 如果是其他资产名(如 "usdi"): 不转换，直接使用十进制数值
      const parseAssetName = useCapacityAnalysis ? "" : assetName;
      
      // aggregateAssetAnalysis 返回的已经是字符串格式的十进制数（不是十六进制）
      // 需要直接转换，不能再用 hexToDecimal
      const parseAggregatedValue = (value: string, assetName?: string): number => {
        const capacityInBase = BigInt(value);
        const normalizedAsset = assetName?.trim().toLowerCase();
        if (!normalizedAsset || normalizedAsset === "ckb") {
          return Number(capacityInBase) / SHANNONS_PER_CKB;
        }
        return Number(capacityInBase);
      };
      
      const totalCapacity = parseAggregatedValue(currentData.total, parseAssetName);
      const averageChannelCapacity = parseAggregatedValue(currentData.avg, parseAssetName);
      const maxChannelCapacity = parseAggregatedValue(currentData.max, parseAssetName);
      const minChannelCapacity = parseAggregatedValue(currentData.min, parseAssetName);
      const medianChannelCapacity = parseAggregatedValue(currentData.median, parseAssetName);

      // Calculate changes from last week
      const lastWeekTotalCapacity = parseAggregatedValue(lastWeekData.total, parseAssetName);
      const lastWeekTotalNodes = +lastWeekResponse.total_nodes;
      const lastWeekTotalChannels = +lastWeekData.channel_len;
      const lastWeekAvgCapacity = parseAggregatedValue(lastWeekData.avg, parseAssetName);
      const lastWeekMaxCapacity = parseAggregatedValue(lastWeekData.max, parseAssetName);
      const lastWeekMinCapacity = parseAggregatedValue(lastWeekData.min, parseAssetName);
      const lastWeekMedianCapacity = parseAggregatedValue(lastWeekData.median, parseAssetName);

      return {
        totalCapacity,
        totalNodes,
        totalChannels,
        averageChannelCapacity,
        maxChannelCapacity,
        minChannelCapacity,
        medianChannelCapacity,
        assetName,
        capacityUnit,
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
        fields: ["capacity", "channels", "nodes", "asset"],
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

      // Handle different capacity data formats
      let totalCapacity = 0;
      let averageChannelCapacity = 0;
      let minChannelCapacity = 0;
      let maxChannelCapacity = 0;
      let medianChannelCapacity = 0;
      let totalChannels = 0;

      if (lastCapacityPoint) {
        const capData = lastCapacityPoint[1];
        
        // Check if it's new format (AssetCapacityData[]) or old format (string[])
        if (Array.isArray(capData) && capData.length > 0) {
          const firstValue = capData[0];
          
          if (typeof firstValue === 'object' && firstValue !== null && 'name' in firstValue) {
            // New format: AssetCapacityData[]
            // Aggregate all supported assets
            const assets = capData as AssetCapacityData[];
            let sumTotal = 0;
            let sumAvg = 0;
            let sumMin = 0;
            let sumMax = 0;
            let sumMedian = 0;
            let assetCount = 0;
            
            assets.forEach((asset) => {
              if (asset.name && isSupportedAsset(asset.name.toLowerCase())) {
                sumTotal += APIUtils.parseChannelCapacityToCKB(asset.total);
                sumAvg += APIUtils.parseChannelCapacityToCKB(asset.avg);
                sumMin += APIUtils.parseChannelCapacityToCKB(asset.min);
                sumMax += APIUtils.parseChannelCapacityToCKB(asset.max);
                sumMedian += APIUtils.parseChannelCapacityToCKB(asset.median);
                assetCount++;
              }
            });
            
            totalCapacity = sumTotal;
            averageChannelCapacity = assetCount > 0 ? sumAvg / assetCount : 0;
            minChannelCapacity = sumMin;
            maxChannelCapacity = sumMax;
            medianChannelCapacity = assetCount > 0 ? sumMedian / assetCount : 0;
          } else if (typeof firstValue === 'string') {
            // Old format: [sum, avg, min, max, median]
            const capAgg = capData as string[];
            totalCapacity = APIUtils.parseChannelCapacityToCKB(capAgg[0] || "0");
            averageChannelCapacity = APIUtils.parseChannelCapacityToCKB(capAgg[1] || "0");
            minChannelCapacity = APIUtils.parseChannelCapacityToCKB(capAgg[2] || "0");
            maxChannelCapacity = APIUtils.parseChannelCapacityToCKB(capAgg[3] || "0");
            medianChannelCapacity = APIUtils.parseChannelCapacityToCKB(capAgg[4] || "0");
          }
        }
      }

      // Handle channels data - aggregate all supported assets
      if (lastChannelsPoint) {
        const channelsObj = lastChannelsPoint[1] as Record<string, number>;
        SUPPORTED_ASSETS.forEach(asset => {
          const assetNameLower = asset.value.toLowerCase();
          const assetNameUpper = asset.value.toUpperCase();
          const channelCount = 
            channelsObj[assetNameLower] ?? 
            channelsObj[assetNameUpper] ?? 
            channelsObj[asset.value] ?? 
            0;
          totalChannels += channelCount;
        });
      }

      return {
        totalCapacity,
        averageChannelCapacity,
        minChannelCapacity,
        maxChannelCapacity,
        medianChannelCapacity,
        totalChannels,
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
    // Capacity now returns [sum, avg, min, max, median] or AssetCapacityData[], we'll use sum for total capacity
    const capacityTimeSeries: TimeSeriesData[] = [];
    
    if (capacitySeries && capacitySeries.points) {
      capacitySeries.points.forEach(point => {
        const timestamp = point[0];
        const capData = point[1];
        let totalValue = 0;
        
        if (Array.isArray(capData) && capData.length > 0) {
          const firstValue = capData[0];
          
          if (typeof firstValue === 'object' && firstValue !== null && 'name' in firstValue) {
            // New format: AssetCapacityData[]
            const assets = capData as AssetCapacityData[];
            assets.forEach((asset) => {
              if (asset.name && isSupportedAsset(asset.name.toLowerCase()) && asset.total) {
                totalValue += APIUtils.parseChannelCapacityToCKB(asset.total);
              }
            });
          } else if (typeof firstValue === 'string') {
            // Old format: [sum, avg, min, max, median]
            totalValue = APIUtils.parseChannelCapacityToCKB(firstValue);
          }
        }
        
        capacityTimeSeries.push({
          timestamp,
          value: totalValue,
        });
      });
    }

    const channelsTimeSeries: TimeSeriesData[] = [];
    
    if (channelsSeries && channelsSeries.points) {
      channelsSeries.points.forEach(point => {
        const timestamp = point[0];
        const channelsData = point[1];
        let totalChannels = 0;
        
        if (typeof channelsData === 'object' && channelsData !== null) {
          // New format: Record<string, number>
          const channelsObj = channelsData as Record<string, number>;
          SUPPORTED_ASSETS.forEach(asset => {
            const assetNameLower = asset.value.toLowerCase();
            const assetNameUpper = asset.value.toUpperCase();
            const channelCount = 
              channelsObj[assetNameLower] ?? 
              channelsObj[assetNameUpper] ?? 
              channelsObj[asset.value] ?? 
              0;
            totalChannels += channelCount;
          });
        } else if (typeof channelsData === 'number') {
          // Old format: number
          totalChannels = channelsData;
        }
        
        channelsTimeSeries.push({
          timestamp,
          value: totalChannels,
        });
      });
    }

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
    const capacityTimeSeries: TimeSeriesData[] = [];
    
    if (capacitySeries && capacitySeries.points) {
      capacitySeries.points.forEach(point => {
        const timestamp = point[0];
        const capData = point[1];
        let totalValue = 0;
        
        if (Array.isArray(capData) && capData.length > 0) {
          const firstValue = capData[0];
          
          if (typeof firstValue === 'object' && firstValue !== null && 'name' in firstValue) {
            // New format: AssetCapacityData[]
            const assets = capData as AssetCapacityData[];
            // For new format, get the appropriate field based on aggregationType
            const fieldMap = {
              sum: 'total',
              avg: 'avg',
              min: 'min',
              max: 'max',
              median: 'median',
            };
            const field = fieldMap[aggregationType] as keyof AssetCapacityData;
            
            assets.forEach((asset) => {
              if (asset.name && isSupportedAsset(asset.name.toLowerCase()) && asset[field]) {
                totalValue += APIUtils.parseChannelCapacityToCKB(asset[field] as string);
              }
            });
            
            // For avg and median, divide by number of assets
            if ((aggregationType === 'avg' || aggregationType === 'median') && assets.length > 0) {
              const supportedAssetCount = assets.filter(a => 
                a.name && isSupportedAsset(a.name.toLowerCase())
              ).length;
              if (supportedAssetCount > 0) {
                totalValue = totalValue / supportedAssetCount;
              }
            }
          } else if (typeof firstValue === 'string') {
            // Old format: [sum, avg, min, max, median]
            const capAgg = capData as string[];
            totalValue = APIUtils.parseChannelCapacityToCKB(capAgg[aggregationIndex] || "0");
          }
        }
        
        capacityTimeSeries.push({
          timestamp,
          value: totalValue,
        });
      });
    }

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
    timeRange: "hourly" | "monthly" | "yearly",
    filterAsset?: string, // 要过滤的资产名称（小写），为空则聚合所有支持的资产
    metricType?: "capacity" | "liquidity" // 指标类型: capacity=通道占用空间, liquidity=资产真实金额
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
      fields: ["capacity", "channels", "nodes", "asset"],
    });

    // 根据模式选择数据源：
    // - All assets 或 CKB 或 capacity 模式：使用 Capacity 系列
    // - 非 CKB 的 liquidity 模式：使用 Asset 系列
    const useCapacityAnalysis = !filterAsset || filterAsset === "ckb" || metricType === "capacity";
    
    const capacitySeries = historyAnalysis.series.find(
      s => s.name === "Capacity"
    );
    const assetSeries = historyAnalysis.series.find(
      s => s.name === "Asset"
    );
    const channelsSeries = historyAnalysis.series.find(
      s => s.name === "Channels"
    );
    const nodesSeries = historyAnalysis.series.find(s => s.name === "Nodes");

    // 确定资产名称和单位
    // 如果 filterAsset 为空，表示 All assets 模式
    const isAllAssets = !filterAsset;
    const assetName = filterAsset || ""; // 空字符串表示所有资产
    
    // 确定 label
    let assetLabel: string;
    if (isAllAssets) {
      assetLabel = "Total";
    } else {
      const assetConfig = SUPPORTED_ASSETS.find((a) => a.value === filterAsset.toLowerCase());
      assetLabel = assetConfig?.label || "CKB";
    }

    // 选择要使用的数据源系列
    const targetSeries = useCapacityAnalysis ? capacitySeries : assetSeries;

    // Convert capacity/asset series
    const capacityTimeSeries: TimeSeriesData[] = [];
    
    if (targetSeries && targetSeries.points) {
      // 检查是否是新的按资产分组的格式
      const firstPoint = targetSeries.points[0];
      
      if (firstPoint && Array.isArray(firstPoint[1]) && firstPoint[1].length > 0) {
        const firstValue = firstPoint[1][0];
        
        // 判断是新格式（对象数组）还是旧格式（字符串数组）
        if (typeof firstValue === 'object' && 'name' in firstValue) {
          // 新格式：按资产分组
          targetSeries.points.forEach((point) => {
            const timestamp = point[0] as string;
            const assets = point[1] as AssetCapacityData[];
            
            if (isAllAssets) {
              // All assets 模式：聚合所有支持的资产（CKB 和 USDI）
              // capacity 和 channels 可以直接相加
              let totalValue = 0;
              assets.forEach((asset) => {
                if (asset.name && isSupportedAsset(asset.name.toLowerCase()) && asset.total) {
                  // 始终使用 capacity 格式解析（从 shannons 转为 CKB）
                  const parsedValue = APIUtils.parseChannelCapacity(asset.total, "");
                  totalValue += parsedValue;
                }
              });
              
              capacityTimeSeries.push({
                timestamp,
                value: totalValue,
              });
            } else {
              // 单个资产模式：查找匹配的资产
              const assetData = assets.find(
                (a) => a.name && a.name.toLowerCase() === assetName.toLowerCase()
              );
              
              if (assetData && assetData.total) {
                // parseChannelCapacity 的第二个参数:
                // - capacity 模式: 传空字符串或 "ckb"，会从 shannons 转换为 CKB
                // - liquidity 模式: 传资产名称(如 "usdi")，不转换，直接使用十进制数值
                const parseAssetName = useCapacityAnalysis ? "" : assetName;
                const parsedValue = APIUtils.parseChannelCapacity(
                  assetData.total,
                  parseAssetName
                );
                capacityTimeSeries.push({
                  timestamp,
                  value: parsedValue,
                });
              }
            }
          });
        } else if (typeof firstValue === 'string') {
          // 旧格式：[sum, avg, min, max, median]
          targetSeries.points.forEach((point) => {
            const parseAssetName = useCapacityAnalysis ? "" : assetName;
            capacityTimeSeries.push({
              timestamp: point[0] as string,
              value: APIUtils.parseChannelCapacity((point[1] as string[])[0], parseAssetName), // sum
            });
          });
        }
      }
    }

    // Convert channels series - 需要按资产过滤
    const channelsTimeSeries: TimeSeriesData[] = [];
    
    if (channelsSeries && channelsSeries.points) {
      channelsSeries.points.forEach(point => {
        const timestamp = point[0];
        const channelsObj = point[1] as Record<string, number>;
        
        if (isAllAssets) {
          // All assets 模式：聚合所有支持的资产的通道数
          let totalChannels = 0;
          SUPPORTED_ASSETS.forEach(asset => {
            const assetNameLower = asset.value.toLowerCase();
            const assetNameUpper = asset.value.toUpperCase();
            const channelCount = 
              channelsObj[assetNameLower] ?? 
              channelsObj[assetNameUpper] ?? 
              channelsObj[asset.value] ?? 
              0;
            totalChannels += channelCount;
          });
          
          channelsTimeSeries.push({
            timestamp,
            value: totalChannels,
          });
        } else {
          // 单个资产模式：获取对应资产的通道数量
          // 尝试多种大小写格式，因为服务端可能返回 "ckb", "USDI", "RUSD" 等不同格式
          const assetNameLower = assetName.toLowerCase();
          const assetNameUpper = assetName.toUpperCase();
          
          const channelCount = 
            channelsObj[assetNameLower] ?? 
            channelsObj[assetNameUpper] ?? 
            channelsObj[assetName] ?? 
            0;
          
          channelsTimeSeries.push({
            timestamp,
            value: channelCount,
          });
        }
      });
    }

    // Convert nodes series
    const nodesTimeSeries: TimeSeriesData[] =
      nodesSeries?.points.map(point => ({
        timestamp: point[0],
        value: point[1],
      })) || [];

    return {
      capacity: {
        label: `${assetLabel} ${useCapacityAnalysis ? 'capacity' : 'liquidity'}`,
        data: capacityTimeSeries,
      },
      channels: {
        label: `${assetLabel} channels`,
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
        ? hexToDecimal(capacity) // 服务端返回的是正常十六进制
        : BigInt(capacity);
    return Number(capacityInShannons) / SHANNONS_PER_CKB;
  }

  /**
   * 根据资产类型解析通道容量
   * @param capacity - 容量值（十六进制字符串或数字）
   * @param assetName - 资产名称（如 "ckb", "usdi"），不区分大小写。空字符串或未指定时默认为 "ckb"
   * @returns 转换后的数值
   * 
   * - CKB: 从 shannons 转换（除以 100,000,000）
   * - 其他资产: 直接转换为十进制，不做单位换算
   */
  static parseChannelCapacity(capacity: string | number, assetName?: string): number {
    const capacityInBase =
      typeof capacity === "string"
        ? hexToDecimal(capacity)
        : BigInt(capacity);
    
    // 如果是 CKB 或未指定资产（包括空字符串），按 shannons 转换
    const normalizedAsset = assetName?.trim().toLowerCase();
    if (!normalizedAsset || normalizedAsset === "ckb") {
      return Number(capacityInBase) / SHANNONS_PER_CKB;
    }
    
    // 其他资产直接返回十进制数值
    return Number(capacityInBase);
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
