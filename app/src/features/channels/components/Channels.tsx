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
} from "@/shared/components/ui";
import BarChart from "@/shared/components/chart/BarChart";
import PieChart from "@/shared/components/chart/PieChart";
import { useChannelsByState } from "@/features/channels/hooks/useChannels";
import { ChannelState, BasicChannelInfo } from "@/lib/types";
import { hexToDecimal } from "@/lib/utils";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// 通道数据类型
interface ChannelData extends Record<string, unknown> {
  channelId: string;
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


export const Channels = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1); // 1-based for display
  const [selectedState, setSelectedState] = useState<ChannelState>("open");
  const [sortKey, setSortKey] = useState<string>("transactions");
  const [sortState, setSortState] = useState<SortState>("descending");
  const PAGE_SIZE = 10; // 每页显示10条
  const { apiClient, currentNetwork } = useNetwork();
  
  // 计算后端页码（从1开始转换为从0开始）
  const backendPage = currentPage - 1;

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

  // 调试日志:查看获取的数据
  useEffect(() => {
    console.log("[Channels] capacityDistribution:", capacityDistribution);
    console.log("[Channels] channelCountByState:", channelCountByState);
  }, [capacityDistribution, channelCountByState]);

  // 使用服务端分页接口获取指定状态的通道数据
  const { data: channelsData, isLoading, refetch, dataUpdatedAt: channelsDataUpdatedAt } = useChannelsByState(
    selectedState,
    backendPage
  );
  
  // 从返回数据中提取 total_count
  const totalCount = channelsData?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 使用后端返回的状态统计数据
  const getStateCount = (state: ChannelState) => {
    if (!channelCountByState) return 0;
    return channelCountByState[state] || 0;
  };

  // 组装 PieChart 数据
  const pieChartData = [
    { name: "Open", value: getStateCount("open"), status: "Open" },
    { name: "Committing", value: getStateCount("commitment"), status: "Committing" },
    { name: "Closed", value: getStateCount("closed"), status: "Closed" },
  ];

  // 计算容量分布数据 - 使用后端返回的分桶结果
  const capacityDistributionData = useMemo(() => {
    console.log("[Channels] Processing capacity distribution, data:", capacityDistribution);
    
    if (!capacityDistribution) {
      console.log("[Channels] No capacity distribution data, returning empty");
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
    
    console.log("[Channels] Final bar chart data:", result);
    return result;
  }, [capacityDistribution]);

  // 计算总通道数用于百分比
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
    
    return {
      channelId: channel.channel_outpoint,
      transactions: channel.tx_count,
      capacity: capacityInCKB.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      createdOn: formatDate(channel.create_time),
      lastCommitted: formatDate(channel.last_commit_time),
    };
  }) || [];

  // Reset to first page when state changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState]);

  // 列定义
  // 计算最后更新时间
  const lastUpdated = useMemo(() => {
    const latestUpdateTime = Math.max(
      capacityDistributionUpdatedAt || 0, 
      channelCountUpdatedAt || 0,
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
  }, [capacityDistributionUpdatedAt, channelCountUpdatedAt, channelsDataUpdatedAt]);

  const columns: ColumnDef<ChannelData>[] = [
    {
      key: "channelId",
      label: "Channel ID",
      width: "w-120", // 固定宽度
      sortable: false,
      render: (value, row) => (
        <span
          className="text-primary cursor-pointer hover:underline truncate block w-full"
          onClick={() => router.push(`/channel/${row.channelId}`)}
          title={value as string} // 鼠标悬停显示完整ID
        >
          {value as string}
        </span>
      ),
    },
    {
      key: "transactions",
      label: "Transactions",
      width: "w-40",
      sortable: true,
    },
    {
      key: "capacity",
      label: "Capacity (CKB)",
      width: "w-40",
      sortable: true,
      className: "text-purple-400 font-semibold",
    },
    {
      key: "createdOn",
      label: "Created on",
      width: "w-40",
      sortable: true,
    },
    {
      key: "lastCommitted",
      label: "Last committed",
      width: "w-40",
      sortable: true,
    },
  ];
  
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["channel-capacity-distribution", currentNetwork] }),
      queryClient.invalidateQueries({ queryKey: ["channel-count-by-state", currentNetwork] }),
      refetch(),
    ]);
  };

  const handleSort = (key: string, state: SortState) => {
    setSortKey(key);
    setSortState(state);
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleStateChange = (state: ChannelState) => {
    setSelectedState(state);
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Channel Health & Activities"
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <GlassCardContainer>
          <PieChart
            data={pieChartData}
            title="Channel Status Distribution"
            height="400px"
          />
        </GlassCardContainer>
      </div>

      <SectionHeader
        title="Channels by Status"
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
      />
      <div className="flex gap-4">
        <StatusIndicator
          text={`Open (${getStateCount("open")})`}
          color="#208C73"
          mode={selectedState === "open" ? "dark" : "light"}
          onClick={() => handleStateChange("open")}
        />
        <StatusIndicator
          text={`Committing (${getStateCount("commitment")})`}
          color="#FAB83D"
          mode={selectedState === "commitment" ? "dark" : "light"}
          onClick={() => handleStateChange("commitment")}
        />
        <StatusIndicator
          text={`Closed (${getStateCount("closed")})`}
          color="#B34846"
          mode={selectedState === "closed" ? "dark" : "light"}
          onClick={() => handleStateChange("closed")}
        />
      </div>

      <GlassCardContainer>
        <Table<ChannelData>
          columns={columns}
          data={tableData}
          onSort={handleSort}
          defaultSortKey={sortKey}
          defaultSortState={sortState}
          loading={isLoading}
          loadingText="Loading channels..."
          className="min-h-[528px]"
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
          <div className="text-center py-8 text-muted-foreground">
            No {selectedState} channels found
          </div>
        )}
      </GlassCardContainer>
    </div>
  );
};
