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
import { u64LittleEndianToDecimal, hexToDecimal } from "@/lib/utils";
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
  const itemsPerPage = 10; // 每页显示10条
  const { apiClient, currentNetwork } = useNetwork();

  // 获取全量通道数据用于容量分布统计
  const { data: allChannelsData, dataUpdatedAt: allChannelsUpdatedAt } = useQuery({
    queryKey: ["all-channels-for-capacity", currentNetwork],
    queryFn: () => apiClient.fetchAllActiveChannels(),
    refetchInterval: 300000, // 5分钟刷新
  });

  // 调试日志：查看获取的数据
  useEffect(() => {
    console.log("[Channels] allChannelsData:", allChannelsData);
    console.log("[Channels] allChannelsData length:", allChannelsData?.length);
  }, [allChannelsData]);

  // Fetch all data for selected state (page 0 gets all data)
  const { data: channelsData, isLoading, refetch, dataUpdatedAt: channelsDataUpdatedAt } = useChannelsByState(
    selectedState,
    0
  );

  // Fetch counts for all states
  const { data: openCount } = useChannelsByState("open", 0);
  const { data: commitmentCount } = useChannelsByState("commitment", 0);
  const { data: closedCount } = useChannelsByState("closed", 0);

  const getStateCount = (state: ChannelState) => {
    const data =
      state === "open"
        ? openCount
        : state === "commitment"
          ? commitmentCount
          : closedCount;
    return data?.list?.length || 0;
  };

  // 组装 PieChart 数据
  const pieChartData = [
    { name: "Open", value: getStateCount("open"), status: "Open" },
    { name: "Committing", value: getStateCount("commitment"), status: "Committing" },
    { name: "Closed", value: getStateCount("closed"), status: "Closed" },
  ];

  // 计算容量分布数据
  const capacityDistributionData = (() => {
    console.log("[Channels] Computing capacity distribution, allChannelsData:", allChannelsData);
    
    if (!allChannelsData || allChannelsData.length === 0) {
      console.log("[Channels] No channel data, returning empty distribution");
      return CAPACITY_RANGES.map(range => ({ label: range.label, value: 0, min: range.min, max: range.max }));
    }

    console.log("[Channels] Processing", allChannelsData.length, "channels");

    // 初始化每个区间的计数
    const distribution = CAPACITY_RANGES.map(range => ({
      ...range,
      count: 0,
    }));

    // 统计每个通道落在哪个区间
    let minCapacity = Infinity;
    let maxCapacity = 0;
    let outOfRangeCount = 0;
    
    allChannelsData.forEach((channel, index) => {
      try {
        // 将 capacity 从 Shannon 转换为 CKB
        // capacity 字段已经是正确的 hex 格式，直接解析即可
        const capacityInShannon = hexToDecimal(channel.capacity);
        const capacityInCKB = Number(capacityInShannon) / 100_000_000;
        
        // 记录最小和最大容量
        minCapacity = Math.min(minCapacity, capacityInCKB);
        maxCapacity = Math.max(maxCapacity, capacityInCKB);
        
        if (index < 3) {
          console.log(`[Channels] Channel ${index} capacity:`, {
            raw: channel.capacity,
            shannon: capacityInShannon.toString(),
            ckb: capacityInCKB
          });
        }
        
        // 找到对应的区间
        const rangeIndex = distribution.findIndex(
          range => capacityInCKB >= range.min && capacityInCKB < range.max
        );
        
        if (rangeIndex !== -1) {
          distribution[rangeIndex].count++;
        } else {
          outOfRangeCount++;
          if (outOfRangeCount <= 3) {
            console.log(`[Channels] Channel ${index} capacity ${capacityInCKB} CKB not in any range`);
          }
        }
      } catch (error) {
        console.warn("Error parsing channel capacity:", error, channel);
      }
    });

    console.log(`[Channels] Capacity range: ${minCapacity} - ${maxCapacity} CKB`);
    console.log(`[Channels] Out of range count: ${outOfRangeCount} / ${allChannelsData.length}`);
    console.log("[Channels] Distribution result:", distribution);

    // 转换为 BarChart 需要的格式
    const result = distribution.map(item => ({
      label: item.label,
      value: item.count,
      min: item.min,
      max: item.max,
    }));
    
    console.log("[Channels] Final bar chart data:", result);
    return result;
  })();

  // 计算总通道数用于百分比
  const totalChannelsForCapacity = allChannelsData?.length || 0;

  // Convert all API data to table format
  const allTableData: ChannelData[] = channelsData?.list?.map((channel: BasicChannelInfo) => ({
    channelId: channel.channel_outpoint,
    transactions: 0, // API doesn't provide this, you may need to add it
    capacity: "N/A", // API doesn't provide this, you may need to add it
    createdOn: "N/A", // API doesn't provide this, you may need to add it
    lastCommitted: `Block ${Number(u64LittleEndianToDecimal(channel.last_block_number)).toLocaleString()}`,
  })) || [];

  // Sort data
  const sortedData = [...allTableData].sort((a, b) => {
    if (sortState === "none") return 0;

    const aValue = a[sortKey];
    const bValue = b[sortKey];

    // Handle different data types
    let comparison = 0;
    if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    } else {
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      comparison = aStr.localeCompare(bStr);
    }

    return sortState === "ascending" ? comparison : -comparison;
  });

  // Frontend pagination
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const tableData = sortedData.slice(startIndex, endIndex);

  // Reset to first page when state changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState]);

  // 列定义
  // 计算最后更新时间
  const lastUpdated = useMemo(() => {
    const latestUpdateTime = Math.max(allChannelsUpdatedAt || 0, channelsDataUpdatedAt || 0);
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
  }, [allChannelsUpdatedAt, channelsDataUpdatedAt]);

  const columns: ColumnDef<ChannelData>[] = [
    {
      key: "channelId",
      label: "Channel ID",
      width: "w-140", // 固定宽度
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
      className: "text-purple font-bold",
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
      queryClient.invalidateQueries({ queryKey: ["all-channels-for-capacity", currentNetwork] }),
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
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : tableData.length > 0 ? (
          <>
            <Table<ChannelData>
              columns={columns}
              data={tableData}
              onSort={handleSort}
              defaultSortKey={sortKey}
              defaultSortState={sortState}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              className="mt-4"
            />
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No {selectedState} channels found
          </div>
        )}
      </GlassCardContainer>
    </div>
  );
};
