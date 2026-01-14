"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SectionHeader,
  Table,
  Pagination,
  ColumnDef,
  SortState,
  GlassCardContainer,
  StatusIndicator,
  SearchInput,
  AssetSelect,
  AssetSelectOption,
} from "@/shared/components/ui";
import BarChart from "@/shared/components/chart/BarChart";
import PieChart from "@/shared/components/chart/PieChart";
import { useChannelsByState } from "@/features/channels/hooks/useChannels";
import { ChannelState, BasicChannelInfo } from "@/lib/types";
import { hexToDecimal } from "@/lib/utils";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createAssetColorMap } from "../utils/assetColors";

// 通道数据类型
interface ChannelData extends Record<string, unknown> {
  channelId: string;
  asset: string; // 资产名称（大写）
  assetColor: string; // 资产对应的颜色
  transactions: number;
  capacity: string;
  createdOn: string;
  lastCommitted: string;
}

// 容量区间定义（CKB）
// 根据实际数据范围调整为合理的对数刻度
const CAPACITY_RANGES = [
  { min: 0, max: 100, label: "10^0" },           // 0-100
  { min: 100, max: 1_000, label: "10^1" },       // 100-1K
  { min: 1_000, max: 10_000, label: "10^2" },    // 1K-10K
  { min: 10_000, max: 100_000, label: "10^3" },  // 10K-100K
  { min: 100_000, max: 1_000_000, label: "10^4" }, // 100K-1M
  { min: 1_000_000, max: 10_000_000, label: "10^5" }, // 1M-10M
  { min: 10_000_000, max: 100_000_000, label: "10^6" }, // 10M-100M
  { min: 100_000_000, max: 1_000_000_000, label: "10^7" }, // 100M-1B
];

// 格式化容量范围显示
const formatCapacityRange = (min: number, max: number) => {
  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return `${num / 1_000_000_000}B`;
    if (num >= 1_000_000) return `${num / 1_000_000}M`;
    if (num >= 1000) return `${num / 1000}K`;
    return num.toString();
  };
  return `${formatNumber(min)}-${formatNumber(max)} CKB`;
};


// 所有可用的通道状态
const ALL_CHANNEL_STATES: ChannelState[] = [
  "open",
  "closed_waiting_onchain_settlement",
  "closed_uncooperative",
  "closed_cooperative",
];

export const Channels = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1); // 1-based for display
  const [selectedStates, setSelectedStates] = useState<ChannelState[]>(["open"]); // 默认选中 open
  const [selectedAsset, setSelectedAsset] = useState<string>(''); // ''表示 All assets
  const [sortKey, setSortKey] = useState<string>("");
  const [sortState, setSortState] = useState<SortState>("none");
  const [searchValue, setSearchValue] = useState(''); // 搜索框输入值
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(''); // 防抖后的搜索值
  const PAGE_SIZE = 10; // 每页显示10条
  const { apiClient, currentNetwork } = useNetwork();
  
  // 计算后端页码（从1开始转换为从0开始）
  const backendPage = currentPage - 1;

  // 将前端的 sortKey 映射到后端的 sort_by 字段
  const getBackendSortBy = (frontendKey: string): string => {
    const mapping: Record<string, string> = {
      'createdOn': 'create_time',
      'lastCommitted': 'last_commit_time',
      'capacity': 'capacity',
    };
    return mapping[frontendKey] || 'last_commit_time';
  };

  // 将前端的 sortState 映射到后端的 order
  const getBackendOrder = (state: SortState): 'asc' | 'desc' => {
    return state === 'ascending' ? 'asc' : 'desc';
  };

  // 计算实际的排序参数
  const backendSortBy = sortKey ? getBackendSortBy(sortKey) : 'last_commit_time';
  const backendOrder = sortState !== 'none' ? getBackendOrder(sortState) : 'desc';

  // 使用新的后端聚合接口获取容量分布数据
  const { data: capacityDistribution, dataUpdatedAt: capacityDistributionUpdatedAt } = useQuery({
    queryKey: ["channel-capacity-distribution", currentNetwork],
    queryFn: () => apiClient.getChannelCapacityDistribution(),
    refetchInterval: 300000, // 5分钟刷新
  });

  // 使用新的后端聚合接口获取各状态通道数量
  const { data: channelCountByState, dataUpdatedAt: channelCountUpdatedAt } = useQuery({
    queryKey: ["channel-count-by-state", currentNetwork],
    queryFn: () => apiClient.getChannelCountByState(),
    refetchInterval: 300000, // 5分钟刷新
  });

  // 使用后端接口获取资产分布数据
  const { data: channelCountByAsset, dataUpdatedAt: channelAssetUpdatedAt } = useQuery({
    queryKey: ["channel-count-by-asset", currentNetwork],
    queryFn: () => apiClient.getChannelCountByAsset(),
    refetchInterval: 300000, // 5分钟刷新
  });

  // 使用服务端分页接口获取指定状态的通道数据
  // 如果没有选中任何状态，则请求所有状态
  const statesToFetch = selectedStates.length === 0 ? ALL_CHANNEL_STATES : selectedStates;
  const { data: channelsData, isLoading, refetch, dataUpdatedAt: channelsDataUpdatedAt } = useChannelsByState(
    statesToFetch,
    backendPage,
    backendSortBy,
    backendOrder,
    debouncedSearchValue, // 传入防抖后的搜索值
    selectedAsset // 传入选中的资产名称
  );
  
  // 搜索防抖：用户输入完 500ms 后才触发搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // 当搜索值变化时，清空所有选中的状态和资产
  useEffect(() => {
    if (debouncedSearchValue.trim()) {
      setSelectedStates([]);
      setSelectedAsset(''); // 清空选中的资产
    }
  }, [debouncedSearchValue]);
  
  // 当选中的资产变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAsset]);
  
  // 从返回数据中提取 total_count
  const totalCount = channelsData?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 使用后端返回的状态统计数据
  const getStateCount = (state: ChannelState) => {
    if (!channelCountByState) return 0;
    return channelCountByState[state] || 0;
  };

  // 组装 PieChart 数据 - Channel Status Distribution
  const pieChartData = [
    { name: "Open", value: getStateCount("open"), status: "Open" },
    { name: "Closed (Waiting Settlement)", value: getStateCount("closed_waiting_onchain_settlement"), status: "Closed (Waiting Settlement)" },
    { name: "Closed (Cooperative)", value: getStateCount("closed_cooperative"), status: "Closed (Cooperative)" },
    { name: "Closed (Uncooperative)", value: getStateCount("closed_uncooperative"), status: "Closed (Uncooperative)" },
  ];

  // 组装 PieChart 数据 - Asset Distribution
  const assetDistributionData = useMemo(() => {
    if (!channelCountByAsset) return [];
    
    // 将后端返回的 {"CKB": 100, "RUSD": 50, ...} 转换为饼图数据格式
    return Object.entries(channelCountByAsset).map(([name, value]) => ({
      name,
      value,
    }));
  }, [channelCountByAsset]);

  // 为每个资产分配颜色，使用工具函数统一管理
  const assetColorMap = useMemo(() => {
    const assetNames = assetDistributionData.map(asset => asset.name);
    return createAssetColorMap(assetNames);
  }, [assetDistributionData]);

  // 根据资产名称获取颜色
  const getAssetColor = (assetName: string) => {
    return assetColorMap.get(assetName.toLowerCase()) || "#5470c6";
  };

  // 生成资产选择器的选项
  const assetOptions: AssetSelectOption[] = useMemo(() => {
    // 具体的资产选项
    const assetOpts = assetDistributionData.map(asset => ({
      label: asset.name.toUpperCase(),
      value: asset.name.toLowerCase(),
      color: getAssetColor(asset.name),
    }));
    
    // All assets 选项放在最后
    const allOption: AssetSelectOption = {
      label: 'All assets',
      value: '',
    };
    
    return [...assetOpts, allOption];
  }, [assetDistributionData, assetColorMap]);

  // 处理资产选择变化
  const handleAssetChange = (asset: string) => {
    setSelectedAsset(asset);
    // TODO: 根据选中的资产过滤通道数据
  };

  // 计算容量分布数据 - 使用后端返回的分桶结果
  const capacityDistributionData = useMemo(() => {
    if (!capacityDistribution) {
      return CAPACITY_RANGES.map(range => ({ 
        label: range.label, 
        value: 0, 
        min: range.min, 
        max: range.max 
      }));
    }

    // 后端返回格式: {"Capacity 10^0k": count, "Capacity 10^1k": count, ...}
    // 转换为前端需要的格式
    const result = CAPACITY_RANGES.map(range => {
      const key = `Capacity 10^${range.label.replace('10^', '')}k`;
      const count = capacityDistribution[key] || 0;
      return {
        label: range.label,
        value: count,
        min: range.min,
        max: range.max,
      };
    });
    
    return result;
  }, [capacityDistribution]);

  // 计算资产分布的总数，用于百分比计算
  const totalChannelsForAsset = useMemo(() => {
    return assetDistributionData.reduce((sum, item) => sum + item.value, 0);
  }, [assetDistributionData]);

  // 计算容量分布的总数，用于百分比计算
  const totalChannelsForCapacity = useMemo(() => {
    return capacityDistributionData.reduce((sum, item) => sum + item.value, 0);
  }, [capacityDistributionData]);

  // Convert API data to table format - 直接使用当前页的数据
  const tableData: ChannelData[] = channelsData?.list?.map((channel: BasicChannelInfo) => {
    // 将容量从十六进制 Shannon 转换为 CKB
    const capacityInShannon = hexToDecimal(channel.capacity);
    const capacityInCKB = Number(capacityInShannon) / 100_000_000;
    
    // 格式化时间
    const formatDate = (isoString: string) => {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };
    
    // 获取资产名称和颜色
    const assetName = channel.name || 'ckb'; // 默认为 ckb
    const assetColor = getAssetColor(assetName);
    
    return {
      channelId: channel.channel_outpoint,
      asset: assetName.toUpperCase(), // 转换为大写
      assetColor,
      transactions: channel.tx_count,
      capacity: capacityInCKB.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      createdOn: formatDate(channel.create_time),
      lastCommitted: formatDate(channel.last_commit_time),
    };
  }) || [];

  // Reset to first page when state changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStates]);

  // Reset to first page when sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortKey, sortState]);

  // 列定义
  // 计算最后更新时间
  const lastUpdated = useMemo(() => {
    const latestUpdateTime = Math.max(
      capacityDistributionUpdatedAt || 0, 
      channelCountUpdatedAt || 0,
      channelAssetUpdatedAt || 0,
      channelsDataUpdatedAt || 0
    );
    if (latestUpdateTime === 0) return "";
    
    const date = new Date(latestUpdateTime);
    const formattedTime = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `Last updated: ${formattedTime}`;
  }, [capacityDistributionUpdatedAt, channelCountUpdatedAt, channelAssetUpdatedAt, channelsDataUpdatedAt]);

  const columns: ColumnDef<ChannelData>[] = [
    {
      key: "channelId",
      label: "Channel Outpoint",
      width: "w-64 lg:flex-1 lg:min-w-64",
      render: (value) => (
        <div className="truncate min-w-0 text-primary text-sm" title={String(value)}>
          {value as string}
        </div>
      ),
    },
    {
      key: "asset",
      label: "Asset",
      width: "w-32",
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 flex-shrink-0" 
            style={{ backgroundColor: row.assetColor as string }}
          />
          <span className="text-primary text-sm font-medium">{value as string}</span>
        </div>
      ),
    },
    {
      key: "transactions",
      label: "Transactions",
      width: "w-40",
      sortable: false,
    },
    {
      key: "capacity",
      label: "Capacity (CKB)",
      width: "w-60",
      sortable: true,
      render: (value) => (
        <div className="text-purple font-semibold truncate">
          {value as string}
        </div>
      ),
    },
    {
      key: "createdOn",
      label: "Created on",
      width: "w-60",
      sortable: true,
    },
    {
      key: "lastCommitted",
      label: "Last committed",
      width: "w-60",
      sortable: true,
    },
  ];
  
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["channel-capacity-distribution", currentNetwork] }),
      queryClient.invalidateQueries({ queryKey: ["channel-count-by-state", currentNetwork] }),
      queryClient.invalidateQueries({ queryKey: ["channel-count-by-asset", currentNetwork] }),
      refetch(),
    ]);
  };

  const handleSort = (key: string, state: SortState) => {
    setSortKey(key);
    setSortState(state);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStateChange = (state: ChannelState) => {
    // 当选择状态时，清空搜索框
    if (searchValue.trim()) {
      setSearchValue('');
      setDebouncedSearchValue('');
    }
    
    setSelectedStates(prev => {
      // 如果已经选中，则取消选中
      if (prev.includes(state)) {
        return prev.filter(s => s !== state);
      }
      // 否则添加到选中列表
      return [...prev, state];
    });
  };

  // 检查某个状态是否被选中
  const isStateSelected = (state: ChannelState) => {
    return selectedStates.includes(state);
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Channel Health & Activities"
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
      />

      {/* 第一行：两个饼图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCardContainer>
          <PieChart
            data={pieChartData}
            title="Channel Status Distribution"
            height="400px"
            colors={["#208C73", "#FAB83D", "#B34846", "#9B87C8"]}
            tooltipFormatter={(params) => {
              const dataItem = pieChartData[params.dataIndex];
              const totalChannels = pieChartData.reduce((sum, item) => sum + item.value, 0);
              const percentage = totalChannels > 0
                ? ((params.value / totalChannels) * 100).toFixed(1)
                : "0.0";
              
              return [
                { label: "Status", value: dataItem.status || params.name, showColorDot: true },
                { label: "# of Channels", value: params.value.toString() },
                { label: "% of Total", value: `${percentage}%` },
              ];
            }}
          />
        </GlassCardContainer>

        <GlassCardContainer>
          <PieChart
            data={assetDistributionData}
            title="Asset Distribution"
            height="400px"
            colors={assetDistributionData.map(asset => getAssetColor(asset.name))}
            tooltipFormatter={(params) => {
              const percentage = totalChannelsForAsset > 0
                ? ((params.value / totalChannelsForAsset) * 100).toFixed(1)
                : "0.0";
              
              return [
                { label: "Asset", value: params.name, showColorDot: true },
                { label: "# of Channels", value: params.value.toString() },
                { label: "% of Total", value: `${percentage}%` },
              ];
            }}
          />
        </GlassCardContainer>
      </div>

      {/* 第二行：Capacity Distribution 柱状图 */}
      <div className="mt-6">
        <GlassCardContainer>
          <BarChart
            data={capacityDistributionData}
            title="Channel Capacity Distribution"
            height="400px"
            tooltipFormatter={item => {
              const dataItem = capacityDistributionData.find(d => d.label === item.label);
              const percentage = totalChannelsForCapacity > 0 
                ? ((item.value / totalChannelsForCapacity) * 100).toFixed(1)
                : "0.0";
              const range = dataItem 
                ? formatCapacityRange(dataItem.min, dataItem.max)
                : item.label;
              
              return [
                { label: "Capacity Range", value: range },
                { label: "Total Channels", value: item.value.toString() },
                { label: "% of Total", value: `${percentage}%` },
              ];
            }}
          />
        </GlassCardContainer>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="type-h2 font-semibold text-primary">
          Channels by Status
        </h2>
        <SearchInput
          value={searchValue}
          placeholder="by channel outpoint"
          onChange={setSearchValue}
          className="w-80"
        />
      </div>
      <div className="flex gap-2 md:gap-4 flex-wrap">
        {/* Asset Select */}
        <AssetSelect
          options={assetOptions}
          value={selectedAsset}
          onChange={handleAssetChange}
          placeholder="All assets"
          className="w-[180px]"
        />
        <StatusIndicator
          text={`Open (${getStateCount("open")})`}
          color="#208C73"
          mode={isStateSelected("open") ? "dark" : "light"}
          onClick={() => handleStateChange("open")}
          className="flex-1 min-w-0 md:flex-initial"
        />
        <StatusIndicator
          text={`Closed (Waiting Settlement) (${getStateCount("closed_waiting_onchain_settlement")})`}
          color="#FAB83D"
          mode={isStateSelected("closed_waiting_onchain_settlement") ? "dark" : "light"}
          onClick={() => handleStateChange("closed_waiting_onchain_settlement")}
          className="flex-1 min-w-0 md:flex-initial"
        />
        <StatusIndicator
          text={`Closed (Uncooperative) (${getStateCount("closed_uncooperative")})`}
          color="#B34846"
          mode={isStateSelected("closed_uncooperative") ? "dark" : "light"}
          onClick={() => handleStateChange("closed_uncooperative")}
          className="flex-1 min-w-0 md:flex-initial"
        />
        <StatusIndicator
          text={`Closed (Cooperative) (${getStateCount("closed_cooperative")})`}
          color="#9B87C8"
          mode={isStateSelected("closed_cooperative") ? "dark" : "light"}
          onClick={() => handleStateChange("closed_cooperative")}
          className="flex-1 min-w-0 md:flex-initial"
        />
      </div>

      <GlassCardContainer className="relative min-h-[528px]">
        <Table<ChannelData>
          columns={columns}
          data={tableData}
          onSort={handleSort}
          defaultSortKey={sortKey}
          defaultSortState={sortState}
          loading={isLoading}
          loadingText="Loading channels..."
          className="min-h-[528px]"
          onRowClick={(row) => router.push(`/channel/${row.channelId}`)}
        />

        {!isLoading && tableData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="mt-4"
          />
        )}

        {!isLoading && tableData.length === 0 && (
          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
            <div className="text-muted-foreground">
              {selectedStates.length === 0 
                ? "Please select at least one status to view channels"
                : `No channels found for selected ${selectedStates.length === 1 ? 'status' : 'statuses'}`
              }
            </div>
          </div>
        )}
      </GlassCardContainer>
    </div>
  );
};
