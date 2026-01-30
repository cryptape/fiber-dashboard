"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  Pagination,
  ColumnDef,
  SortState,
  GlassCardContainer,
  SearchInput,
  AssetSelect,
  StatusSelect,
  StatusBadge,
} from "@/shared/components/ui";
import BarChart from "@/shared/components/chart/BarChart";
import PieChart from "@/shared/components/chart/PieChart";
import { useChannelsByState } from "@/features/channels/hooks/useChannels";
import { ChannelState, BasicChannelInfo } from "@/lib/types";
import { hexToDecimal } from "@/lib/utils";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { useQuery } from "@tanstack/react-query";
import { createAssetColorMap } from "../utils/assetColors";
import { SUPPORTED_ASSETS } from "@/lib/config/assets";

// 通道数据类型
interface ChannelData extends Record<string, unknown> {
  channelId: string;
  asset: string; // 资产名称（大写）
  assetColor: string; // 资产对应的颜色
  transactions: number;
  capacity: string;
  assetLiquidity: string; // 资产流动性
  assetLiquidityUnit: string; // 资产流动性单位
  createdOn: string;
  lastCommitted: string;
  state: string; // 通道状态
}

// 容量区间定义（CKB）
// 根据实际数据范围调整为合理的对数刻度
const CAPACITY_RANGES = [
  { min: 0, max: 100, label: "10^0k" },           // 0-100
  { min: 100, max: 1_000, label: "10^1k" },       // 100-1K
  { min: 1_000, max: 10_000, label: "10^2k" },    // 1K-10K
  { min: 10_000, max: 100_000, label: "10^3k" },  // 10K-100K
  { min: 100_000, max: 1_000_000, label: "10^4k" }, // 100K-1M
  { min: 1_000_000, max: 10_000_000, label: "10^5k" }, // 1M-10M
  { min: 10_000_000, max: 100_000_000, label: "10^6k" }, // 10M-100M
  { min: 100_000_000, max: 1_000_000_000, label: "10^7k" }, // 100M-1B
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
  const searchParams = useSearchParams();
  
  // 从 URL 读取初始资产值，默认为 'ckb'
  const urlAsset = searchParams.get('asset') || 'ckb';
  
  const [currentPage, setCurrentPage] = useState(1); // 1-based for display
  const [selectedStates, setSelectedStates] = useState<ChannelState[]>([]); // 默认为空，表示 all statuses
  const [selectedStatus, setSelectedStatus] = useState<string>(''); // 状态下拉选择框，''表示 all statuses
  const [selectedAsset, setSelectedAsset] = useState<string>(''); // ''表示 All assets - 用于 Channels 列表筛选
  const [overviewAsset, setOverviewAsset] = useState<string>(urlAsset); // 从 URL 初始化 - 用于 Channel Overview 图表筛选
  const [sortKey, setSortKey] = useState<string>("");
  const [sortState, setSortState] = useState<SortState>("none");
  const [searchValue, setSearchValue] = useState(''); // 搜索框输入值
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(''); // 防抖后的搜索值
  const PAGE_SIZE = 10; // 每页显示10条
  const { apiClient, currentNetwork } = useNetwork();
  
  // 同步 URL 参数到 overviewAsset（仅在 URL 变化时）
  useEffect(() => {
    setOverviewAsset(urlAsset);
  }, [urlAsset]);
  
  // 当 overviewAsset 变化时，更新 URL（避免循环）
  useEffect(() => {
    if (overviewAsset !== urlAsset) {
      const params = new URLSearchParams(searchParams.toString());
      if (overviewAsset) {
        params.set('asset', overviewAsset);
      } else {
        params.delete('asset');
      }
      const newUrl = params.toString() ? `/channels?${params.toString()}` : '/channels';
      router.replace(newUrl, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewAsset]); // 只依赖 overviewAsset，避免循环
  
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
  // 返回格式：{ "asset": {...}, "capacity": {"ckb": {"Capacity 10^0k": 10, ...}, "usdi": {...}} }
  const { data: capacityDistribution } = useQuery({
    queryKey: ["channel-capacity-distribution", currentNetwork],
    queryFn: () => apiClient.getChannelCapacityDistribution(),
    refetchInterval: 300000, // 5分钟刷新
  });

  // 使用新的后端聚合接口获取各状态通道数量
  // 返回格式：{"ckb": {"open": 100, "closed_cooperative": 50, ...}, "usdi": {...}}
  const { data: channelCountByState } = useQuery({
    queryKey: ["channel-count-by-state", currentNetwork],
    queryFn: () => apiClient.getChannelCountByState(),
    refetchInterval: 300000, // 5分钟刷新
  });

  // 使用后端接口获取资产分布数据
  // 返回格式：{"ckb": 100, "usdi": 50, ...}
  const { data: channelCountByAsset } = useQuery({
    queryKey: ["channel-count-by-asset", currentNetwork],
    queryFn: () => apiClient.getChannelCountByAsset(),
    refetchInterval: 300000, // 5分钟刷新
  });

  // 使用服务端分页接口获取指定状态的通道数据
  // 如果没有选中任何状态，则请求所有状态
  const statesToFetch = selectedStates.length === 0 ? ALL_CHANNEL_STATES : selectedStates;
  const { data: channelsData, isLoading } = useChannelsByState(
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
  
  // 当选中的资产变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAsset]);
  
  // 从返回数据中提取 total_count
  const totalCount = channelsData?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 获取全量状态数据（所有资产聚合，用于状态选择器）
  const getAllStateCount = useCallback((state: ChannelState) => {
    if (!channelCountByState) return 0;
    
    // 服务端返回格式：{"ckb": {"open": 100, ...}, "USDI": {...}}
    // 注意：ckb 是小写，USDI 是大写
    type StateData = Record<string, Record<string, number>>;
    const stateData = channelCountByState as unknown as StateData;
    
    // 聚合所有资产的数量
    let total = 0;
    const ckbData = stateData["ckb"] || {};
    const usdiData = stateData["USDI"] || {}; // 使用大写 USDI
    total += ckbData[state] || 0;
    total += usdiData[state] || 0;
    return total;
  }, [channelCountByState]);

  // 根据选中的资产计算状态统计数据（使用 overviewAsset，用于 Channel Overview 图表）
  const getStateCount = useCallback((state: ChannelState) => {
    if (!channelCountByState) return 0;
    
    // 服务端返回格式：{"ckb": {"open": 100, ...}, "USDI": {...}}
    // 注意：ckb 是小写，USDI 是大写
    type StateData = Record<string, Record<string, number>>;
    const stateData = channelCountByState as unknown as StateData;
    
    if (!overviewAsset) {
      // All assets: 聚合 CKB 和 USDI 的数量
      let total = 0;
      const ckbData = stateData["ckb"] || {};
      const usdiData = stateData["USDI"] || {}; // 使用大写 USDI
      total += ckbData[state] || 0;
      total += usdiData[state] || 0;
      return total;
    } else {
      // 单个资产：返回对应资产的数量
      // 需要转换为服务端的格式：ckb 小写，usdi -> USDI 大写
      const assetKey = overviewAsset === 'usdi' ? 'USDI' : overviewAsset;
      const assetData = stateData[assetKey] || {};
      return assetData[state] || 0;
    }
  }, [channelCountByState, overviewAsset]);

  // 组装 PieChart 数据 - Channel Status Distribution
  const pieChartData = useMemo(() => {
    return [
      { name: "Open", value: getStateCount("open"), status: "Open" },
      { name: "Closing", value: getStateCount("closed_waiting_onchain_settlement"), status: "Closing" },
      { name: "Cooperative closed", value: getStateCount("closed_cooperative"), status: "Cooperative closed" },
      { name: "Uncooperative closed", value: getStateCount("closed_uncooperative"), status: "Uncooperative closed" },
    ];
  }, [getStateCount]);

  // 组装 PieChart 数据 - Asset Distribution
  // 只显示 CKB 和 USDI，根据 overviewAsset 过滤
  const assetDistributionData = useMemo(() => {
    if (!channelCountByAsset) return [];
    
    // 服务端返回格式：{"ckb": 100, "USDI": 50, ...}
    // 注意：ckb 是小写，USDI 是大写
    if (!overviewAsset) {
      // All assets: 只显示 CKB 和 USDI
      return Object.entries(channelCountByAsset)
        .filter(([name]) => name.toLowerCase() === 'ckb' || name.toLowerCase() === 'usdi')
        .map(([name, value]) => ({
          name,
          value,
        }));
    } else {
      // 选中了单个资产: 不显示 Asset Distribution
      return [];
    }
  }, [channelCountByAsset, overviewAsset]);

  // 为每个资产分配颜色，使用工具函数统一管理
  const assetColorMap = useMemo(() => {
    const assetNames = assetDistributionData.map(asset => asset.name);
    return createAssetColorMap(assetNames);
  }, [assetDistributionData]);

  // 根据资产名称获取颜色
  const getAssetColor = useCallback((assetName: string) => {
    return assetColorMap.get(assetName.toLowerCase()) || "#5470c6";
  }, [assetColorMap]);

  // 处理 Channel Overview 区域的资产选择变化
  const handleOverviewAssetChange = (asset: string) => {
    setOverviewAsset(asset);
  };

  // 处理 Channels 列表区域的资产选择变化
  const handleAssetChange = (asset: string) => {
    setSelectedAsset(asset);
  };

  // 计算容量分布数据 - 使用后端返回的分桶结果
  // 根据 overviewAsset 过滤和聚合数据
  const capacityDistributionData = useMemo(() => {
    if (!capacityDistribution) {
      return CAPACITY_RANGES.map(range => ({ 
        label: range.label, 
        value: 0, 
        min: range.min, 
        max: range.max 
      }));
    }

    // 服务端返回格式: { "asset": {...}, "capacity": {"ckb": {"Capacity 10^0k": 10, ...}, "USDI": {...}} }
    // 注意：ckb 是小写，USDI 是大写
    type DistributionData = { 
      capacity: Record<string, Record<string, number>>;
      asset: Record<string, Record<string, number>>;
    };
    const distributionData = capacityDistribution as unknown as DistributionData;
    const capacityData = distributionData.capacity || {};
    
    if (!overviewAsset) {
      // All assets: 聚合 CKB 和 USDI 的容量分布
      const result = CAPACITY_RANGES.map(range => {
        const key = `Capacity ${range.label}`;
        const ckbCount = (capacityData["ckb"] || {})[key] || 0;
        const usdiCount = (capacityData["USDI"] || {})[key] || 0; // 使用大写 USDI
        return {
          label: range.label,
          value: ckbCount + usdiCount,
          min: range.min,
          max: range.max,
        };
      });
      return result;
    } else {
      // 单个资产: 返回该资产的容量分布
      // 需要转换为服务端的格式：ckb 小写，usdi -> USDI 大写
      const assetKey = overviewAsset === 'usdi' ? 'USDI' : overviewAsset;
      const assetCapacity = capacityData[assetKey] || {};
      const result = CAPACITY_RANGES.map(range => {
        const key = `Capacity ${range.label}`;
        const count = assetCapacity[key] || 0;
        return {
          label: range.label,
          value: count,
          min: range.min,
          max: range.max,
        };
      });
      return result;
    }
  }, [capacityDistribution, overviewAsset]);

  // 计算 USDI Liquidity 分布数据 - 从 asset 字段获取
  const usdiLiquidityDistributionData = useMemo(() => {
    if (!capacityDistribution || overviewAsset !== 'usdi') {
      return CAPACITY_RANGES.map(range => ({ 
        label: range.label, 
        value: 0, 
        min: range.min, 
        max: range.max 
      }));
    }

    // 从 asset 字段获取 USDI 的数据
    type DistributionData = { 
      asset: Record<string, Record<string, number>>;
    };
    const distributionData = capacityDistribution as unknown as DistributionData;
    const assetData = distributionData.asset || {};
    const usdiAssetData = assetData["USDI"] || {};
    
    const result = CAPACITY_RANGES.map(range => {
      const key = `Asset ${range.label}`;
      const count = usdiAssetData[key] || 0;
      return {
        label: range.label,
        value: count,
        min: range.min,
        max: range.max,
      };
    });
    
    return result;
  }, [capacityDistribution, overviewAsset]);

  // 计算资产分布的总数，用于百分比计算
  const totalChannelsForAsset = useMemo(() => {
    return assetDistributionData.reduce((sum, item) => sum + item.value, 0);
  }, [assetDistributionData]);

  // 计算容量分布的总数，用于百分比计算
  const totalChannelsForCapacity = useMemo(() => {
    return capacityDistributionData.reduce((sum, item) => sum + item.value, 0);
  }, [capacityDistributionData]);

  // 计算 USDI Liquidity 分布的总数，用于百分比计算
  const totalChannelsForLiquidity = useMemo(() => {
    return usdiLiquidityDistributionData.reduce((sum, item) => sum + item.value, 0);
  }, [usdiLiquidityDistributionData]);

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
    
    // 计算资产流动性
    let assetLiquidity = '';
    let assetLiquidityUnit = 'CKB';
    
    if (assetName.toLowerCase() === 'ckb') {
      // CKB 资产：Asset liquidity 与 Capacity 相同
      assetLiquidity = capacityInCKB.toLocaleString('en-US', { maximumFractionDigits: 2 });
      assetLiquidityUnit = 'CKB';
    } else {
      // 其他资产：使用 udt_value
      if (channel.udt_value) {
        const udtValue = hexToDecimal(channel.udt_value);
        assetLiquidity = Number(udtValue).toLocaleString('en-US', { maximumFractionDigits: 2 });
      } else {
        assetLiquidity = '0';
      }
      assetLiquidityUnit = assetName.toUpperCase();
    }
    
    return {
      channelId: channel.channel_outpoint,
      asset: assetName.toUpperCase(), // 转换为大写
      assetColor,
      transactions: channel.tx_count,
      capacity: capacityInCKB.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      assetLiquidity,
      assetLiquidityUnit,
      createdOn: formatDate(channel.create_time),
      lastCommitted: formatDate(channel.last_commit_time),
      state: channel.state || 'open', // 通道状态，默认为 open
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
      width: "w-48",
      sortable: true,
      render: (value) => (
        <div className="text-purple font-semibold truncate">
          {value as string}
        </div>
      ),
    },
    {
      key: "assetLiquidity",
      label: "Asset liquidity",
      width: "w-48",
      sortable: false,
      render: (value, row) => (
        <div className="text-primary text-sm truncate">
          {value as string} {row.assetLiquidityUnit as string}
        </div>
      ),
    },
    {
      key: "state",
      label: "Status",
      width: "w-70",
      sortable: false,
      render: (value) => (
        <StatusBadge status={value as string} />
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

  const handleSort = (key: string, state: SortState) => {
    setSortKey(key);
    setSortState(state);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理状态选择变化
  const handleStatusChange = (statusValue: string) => {
    setSelectedStatus(statusValue);
    if (statusValue === '') {
      // All statuses: 获取所有状态
      setSelectedStates([]);
    } else {
      // 单个状态
      setSelectedStates([statusValue as ChannelState]);
    }
  };

  // 重置所有筛选条件
  const handleResetFilters = () => {
    setSelectedAsset('');
    setSelectedStatus('');
    setSelectedStates([]);
    setSearchValue(''); // 清空搜索框
    setDebouncedSearchValue(''); // 清空防抖搜索值
  };

  // 检查是否有筛选条件被选中（包括搜索框）
  const hasFilters = selectedAsset !== '' || selectedStatus !== '' || searchValue.trim() !== '';
  
  // 状态颜色映射
  const STATUS_COLORS: Record<string, string> = {
    'open': '#208C73',
    'closed_waiting_onchain_settlement': '#FAB83D',
    'closed_cooperative': '#9B87C8',
    'closed_uncooperative': '#B34846',
  };
  
  // 生成状态选择器选项（使用全量数据，不受 overviewAsset 影响）
  const statusOptions = useMemo(() => {
    if (!channelCountByState) return [];
    
    const options: Array<{ value: string; label: string; color?: string }> = [
      {
        value: 'open',
        label: `Open (${getAllStateCount("open")})`,
        color: STATUS_COLORS['open'],
      },
      {
        value: 'closed_waiting_onchain_settlement',
        label: `Closing (${getAllStateCount("closed_waiting_onchain_settlement")})`,
        color: STATUS_COLORS['closed_waiting_onchain_settlement'],
      },
      {
        value: 'closed_cooperative',
        label: `Cooperative closed (${getAllStateCount("closed_cooperative")})`,
        color: STATUS_COLORS['closed_cooperative'],
      },
      {
        value: 'closed_uncooperative',
        label: `Uncooperative closed (${getAllStateCount("closed_uncooperative")})`,
        color: STATUS_COLORS['closed_uncooperative'],
      },
    ];
    
    // 计算所有状态的总数
    const allCount = options.reduce((sum, opt) => {
      const match = opt.label.match(/\((\d+)\)/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);
    
    // 添加 "All statuses" 选项在最后（不需要 color）
    options.push({
      value: '',
      label: `All statuses (${allCount})`,
    });
    
    return options;
  }, [channelCountByState, getAllStateCount]);

  return (
    <div className="flex flex-col gap-5">
      {/* Channel Overview 标题和资产选择器 */}
      <div className="flex items-center">
        <h2 className="type-h2 font-semibold text-primary">
          Channel Overview
        </h2>
        {/* 资产选择器 - 只显示 CKB/USDI/All assets，距离标题右侧 16px */}
        <div className="ml-4">
          <AssetSelect
            options={[
              ...SUPPORTED_ASSETS.map(asset => ({
                value: asset.value,
                label: asset.label,
                color: asset.color,
              })),
              { value: "", label: "All assets" },
            ]}
            value={overviewAsset}
            onChange={handleOverviewAssetChange}
            placeholder="All assets"
            className="w-[207px]"
          />
        </div>
      </div>

      {/* 第一行：Channel Status Distribution 和 Asset Distribution（根据选择显示） */}
      <div className={`grid gap-6 ${overviewAsset ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
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

        {/* Asset Distribution - 只在 All assets 模式显示 */}
        {!overviewAsset && assetDistributionData.length > 0 && (
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
        )}
        
        {/* Capacity Distribution - 只在 CKB 资产模式时显示在第一行第二列 */}
        {overviewAsset === 'ckb' && (
          <GlassCardContainer>
            <BarChart
              data={capacityDistributionData}
              title={`${overviewAsset.toUpperCase()} Channel Capacity Distribution`}
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
        )}

        {/* USDI Liquidity Distribution - 在 USDI 模式时显示在第一行第二列 */}
        {overviewAsset === 'usdi' && (
          <GlassCardContainer>
            <BarChart
              data={usdiLiquidityDistributionData}
              title="USDI Liquidity Distribution"
              height="400px"
              tooltipFormatter={item => {
                const dataItem = usdiLiquidityDistributionData.find(d => d.label === item.label);
                const percentage = totalChannelsForLiquidity > 0 
                  ? ((item.value / totalChannelsForLiquidity) * 100).toFixed(1)
                  : "0.0";
                const range = dataItem 
                  ? formatCapacityRange(dataItem.min, dataItem.max)
                  : item.label;
                
                return [
                  { label: "Liquidity Range", value: range },
                  { label: "Total Channels", value: item.value.toString() },
                  { label: "% of Total", value: `${percentage}%` },
                ];
              }}
            />
          </GlassCardContainer>
        )}
      </div>

      {/* 第二行：Capacity Distribution 柱状图 - 只在 All assets 模式显示 */}
      {!overviewAsset && (
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
      )}

      <div className="flex items-center justify-between">
        <h2 className="type-h2 font-semibold text-primary">
          Channels
        </h2>
        <SearchInput
          value={searchValue}
          placeholder="by channel outpoint"
          onChange={setSearchValue}
          className="w-80"
        />
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Asset Select - 固定值 CKB/USDI/All assets */}
        <AssetSelect
          options={[
            ...SUPPORTED_ASSETS.map(asset => ({
              value: asset.value,
              label: asset.label,
              color: asset.color,
            })),
            { value: "", label: "All assets" },
          ]}
          value={selectedAsset}
          onChange={handleAssetChange}
          placeholder="All assets"
          className="w-[207px]"
        />
        
        {/* Status Select - 使用下拉选择框 */}
        <StatusSelect
          options={statusOptions}
          value={selectedStatus}
          onChange={handleStatusChange}
          placeholder="All statuses"
          className="w-[260px]"
        />
        
        {/* Reset filters 按钮 */}
        {hasFilters && (
          <button
            onClick={handleResetFilters}
            className="type-button1 text-purple hover:text-purple/80 transition-colors ml-4"
          >
            Reset filters
          </button>
        )}
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
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-primary text-button1">
                No matching channels
              </div>
              <div className="text-tertiary text-button1">
                Try clearing filters or changing your search term to see more channels.
              </div>
            </div>
          </div>
        )}
      </GlassCardContainer>
    </div>
  );
};
