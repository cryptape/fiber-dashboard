import TimeSeriesChart from "@/shared/components/chart/TimeSeriesChart";
import {
  KpiCard,
  SectionHeader,
  SelectOption,
  GlassCardContainer,
  EasyTable,
} from "@/shared/components/ui";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { queryKeys, queryClient } from "@/features/dashboard/hooks/useDashboard";
import { formatCompactNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";

const TIME_RANGE_OPTIONS: SelectOption[] = [
  { value: "hourly", label: "Hourly" },
  { value: "monthly", label: "Monthly" },
];

// Mock data for TimeSeriesChart
const MOCK_TIME_SERIES_DATA = [
  {
    label: "Total capacity",
    data: [
      { timestamp: "2024-10-17", value: 55000000 },
      { timestamp: "2024-10-18", value: 68000000 },
      { timestamp: "2024-10-19", value: 67000000 },
      { timestamp: "2024-10-20", value: 80000000 },
      { timestamp: "2024-10-21", value: 90000000 },
      { timestamp: "2024-10-22", value: 85000000 },
      { timestamp: "2024-10-23", value: 83000000 },
    ],
  },
  {
    label: "Total channels",
    data: [
      { timestamp: "2024-10-17", value: 2500 },
      { timestamp: "2024-10-18", value: 2400 },
      { timestamp: "2024-10-19", value: 2200 },
      { timestamp: "2024-10-20", value: 2100 },
      { timestamp: "2024-10-21", value: 1800 },
      { timestamp: "2024-10-22", value: 2000 },
      { timestamp: "2024-10-23", value: 2200 },
    ],
  },
];

const MOCK_TIME_SERIES_DATA2 = [
  {
    label: "Total active nodes",
    data: [
  { timestamp: "2024-10-17", value: 2500 },
      { timestamp: "2024-10-18", value: 2400 },
      { timestamp: "2024-10-19", value: 2200 },
      { timestamp: "2024-10-20", value: 2100 },
      { timestamp: "2024-10-21", value: 1800 },
      { timestamp: "2024-10-22", value: 2000 },
      { timestamp: "2024-10-23", value: 2200 },
    ],
  }
];

export const DashboardNew = () => {
  const [timeRange, setTimeRange] = useState<"hourly" | "monthly">("hourly");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const { apiClient, currentNetwork } = useNetwork();
  const router = useRouter();

  const { data: kpi, dataUpdatedAt } = useQuery({
    queryKey: [...queryKeys.kpis, currentNetwork, timeRange],
    queryFn: () => apiClient.fetchKpiDataByTimeRange(timeRange),
    refetchInterval: 30000,
  });

  const { data: timeSeriesData, dataUpdatedAt: timeSeriesUpdatedAt } = useQuery({
    queryKey: [...queryKeys.timeSeries, currentNetwork, timeRange],
    queryFn: () => apiClient.fetchTimeSeriesDataByTimeRange(timeRange),
    refetchInterval: 30000,
  });

  const { data: topNodes } = useQuery({
    queryKey: [...queryKeys.nodes, "ranking", currentNetwork, timeRange],
    queryFn: () => {
      if (timeRange === "hourly") {
        return apiClient.fetchTopNodesByCapacity(3, "hourly");
      } else {
        // monthly: 取最近30天的数据
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        return apiClient.fetchTopNodesByCapacity(3, "monthly", start, end);
      }
    },
    refetchInterval: 30000,
  });

  // 更新 lastUpdated 时间（取所有查询中最新的更新时间）
  useEffect(() => {
    const latestUpdate = Math.max(dataUpdatedAt || 0, timeSeriesUpdatedAt || 0);
    if (latestUpdate) {
      const date = new Date(latestUpdate);
      const formattedTime = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setLastUpdated(`Last updated: ${formattedTime}`);
    }
  }, [dataUpdatedAt, timeSeriesUpdatedAt]);

  const handleRefresh = async () => {
    // 刷新所有当前页面的查询
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.kpis, currentNetwork, timeRange],
      }),
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.timeSeries, currentNetwork, timeRange],
      }),
    ]);
  };

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as "hourly" | "monthly");
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Overview"
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        selectOptions={TIME_RANGE_OPTIONS}
        selectValue={timeRange}
        onSelectChange={handleTimeRangeChange}
      />

      {/* 桌面端左右两大块布局 - 7:3 比例 */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左侧块 - 70% */}
        <div className="flex flex-col gap-4 lg:w-[70%]">
          {/* 顶部两个 KPI 横向排列 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard
              label="TOTAL CAPACITY"
              value={String(kpi?.totalCapacity ?? 0)}
              unit="CKB"
              changePercent={12}
              trending="up"
              changeLabel="from last week"
            />
            <KpiCard
              label="TOTAL CHANNELS"
              value={String(kpi?.totalChannels ?? 0)}
              changePercent={12}
              trending="down"
              changeLabel="from last week"
              onViewDetails={() => router.push('/channels')}
            />
          </div>

          <GlassCardContainer>
            <TimeSeriesChart
              data={timeSeriesData ? [timeSeriesData.capacity, timeSeriesData.channels] : MOCK_TIME_SERIES_DATA}
              height="321px"
              className="w-full"
              colors={["#7459e6", "#fab83d"]}
              timeRange={timeRange}
            />
          </GlassCardContainer>
          
          {/* 左侧下方的 4 个 KPI 卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard
              label="MIN CAPACITY"
              value={String(kpi?.minChannelCapacity ?? 0)}
              unit="CKB"
              changePercent={12}
              trending="up"
              changeLabel="from last week"
            />
            <KpiCard
              label="MAX CAPACITY"
              value={String(kpi?.maxChannelCapacity ?? 0)}
              unit="CKB"
              changePercent={12}
              trending="up"
              changeLabel="from last week"
            />
            <KpiCard
              label="AVG CAPACITY"
              value={String(kpi?.averageChannelCapacity ?? 0)}
              unit="CKB"
              changePercent={12}
              trending="up"
              changeLabel="from last week"
            />
            <KpiCard
              label="MEDIAN CAPACITY"
              value={String(kpi?.medianChannelCapacity ?? 0)}
              unit="CKB"
              changePercent={12}
              trending="up"
              changeLabel="from last week"
            />
          </div>
        </div>

        {/* 右侧块 - 30% */}
        <div className="flex flex-col gap-4 lg:w-[30%]">
          <KpiCard
            label="TOTAL ACTIVE NODES"
            value={String(kpi?.totalNodes ?? 0)}
            changePercent={5.5}
            trending="down"
            changeLabel="from last week"
            onViewDetails={() => router.push('/nodes')}
          />
          <GlassCardContainer>
            <TimeSeriesChart
              data={timeSeriesData ? [timeSeriesData.nodes] : MOCK_TIME_SERIES_DATA2}
              height="321px"
              className="w-full"
              colors={["#59ABE6"]}
              timeRange={timeRange}
            />
          </GlassCardContainer>
          <EasyTable
            title="NODES RANKING"
            actionText="View All"
            onActionClick={() => router.push('/nodes')}
            data={topNodes || []}
            columns={[
              {
                key: "node_id",
                label: "Node ID",
                format: (value, row) => (
                  <button
                    onClick={() => router.push(`/node/${row.node_id}`)}
                    className="text-primary hover:underline cursor-pointer text-left truncate w-full"
                  >
                    {String(value)}
                  </button>
                ),
              },
              {
                key: "capacity",
                label: "Capacity (CKB)",
                format: value => {
                  const num = Number(value);
                  return formatCompactNumber(num, 1);
                },
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
