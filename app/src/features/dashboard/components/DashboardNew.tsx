import TimeSeriesChart from "@/shared/components/chart/TimeSeriesChart";
import {
  KpiCard,
  SectionHeader,
  GlassCardContainer,
  EasyTable,
} from "@/shared/components/ui";
import { AssetSelect } from "@/shared/components/ui/AssetSelect";
import { SUPPORTED_ASSETS } from "@/lib/config/assets";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { queryKeys } from "@/features/dashboard/hooks/useDashboard";
import { useRouter } from "next/navigation";

// 固定使用 hourly 时间范围
const TIME_RANGE = "hourly" as const;

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
  const timeRange = TIME_RANGE; // 固定使用 hourly
  const [selectedAsset, setSelectedAsset] = useState<string>("ckb"); // 默认选择 CKB
  const { apiClient, currentNetwork } = useNetwork();
  const router = useRouter();

  const { data: kpi } = useQuery({
    queryKey: [...queryKeys.kpis, currentNetwork, timeRange, selectedAsset],
    queryFn: () => apiClient.fetchKpiDataByTimeRange(timeRange, selectedAsset),
    refetchInterval: 30000,
  });

  const { data: timeSeriesData } = useQuery({
    queryKey: [...queryKeys.timeSeries, currentNetwork, timeRange, selectedAsset],
    queryFn: () => apiClient.fetchTimeSeriesDataByTimeRange(timeRange, selectedAsset),
    refetchInterval: 30000,
  });

  const { data: topNodes, isLoading: topNodesLoading } = useQuery({
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

  // 移除时间范围选择功能，固定使用 hourly

  return (
    <div className="flex flex-col gap-5">
      {/* 桌面端左右两大块布局 - 7:3 比例 */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左侧块 - 70% */}
        <div className="flex flex-col gap-4 lg:w-[70%]">
          {/* Channel Overview 标题 */}
          <div className="flex items-center gap-4">
            <SectionHeader
              title="Channel Overview"
            />
            <AssetSelect
              options={[
                ...SUPPORTED_ASSETS.map(asset => ({
                  value: asset.value,
                  label: asset.label,
                  color: asset.color,
                })),
              ]}
              value={selectedAsset}
              onChange={setSelectedAsset}
              placeholder="Select asset"
              className="w-[207px]"
            />
          </div>
          {/* 顶部两个 KPI 横向排列 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard
              label="TOTAL CAPACITY"
              value={String(kpi?.totalCapacity ?? 0)}
              unit={kpi?.capacityUnit || "CKB"}
              changePercent={kpi?.totalCapacityChange ?? 0}
              trending={(kpi?.totalCapacityChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
            />
            <KpiCard
              label="TOTAL CHANNELS"
              value={String(kpi?.totalChannels ?? 0)}
              changePercent={kpi?.totalChannelsChange ?? 0}
              trending={(kpi?.totalChannelsChange ?? 0) >= 0 ? "up" : "down"}
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
              unit={kpi?.capacityUnit || "CKB"}
              changePercent={kpi?.minChannelCapacityChange ?? 0}
              trending={(kpi?.minChannelCapacityChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
            />
            <KpiCard
              label="MAX CAPACITY"
              value={String(kpi?.maxChannelCapacity ?? 0)}
              unit={kpi?.capacityUnit || "CKB"}
              changePercent={kpi?.maxChannelCapacityChange ?? 0}
              trending={(kpi?.maxChannelCapacityChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
            />
            <KpiCard
              label="AVG CAPACITY"
              value={String(kpi?.averageChannelCapacity ?? 0)}
              unit={kpi?.capacityUnit || "CKB"}
              changePercent={kpi?.averageChannelCapacityChange ?? 0}
              trending={(kpi?.averageChannelCapacityChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
            />
            <KpiCard
              label="MEDIAN CAPACITY"
              value={String(kpi?.medianChannelCapacity ?? 0)}
              unit={kpi?.capacityUnit || "CKB"}
              changePercent={kpi?.medianChannelCapacityChange ?? 0}
              trending={(kpi?.medianChannelCapacityChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
            />
          </div>
        </div>

        {/* 右侧块 - 30% */}
        <div className="flex flex-col gap-4 lg:w-[30%]">
          {/* Nodes Overview 标题 */}
          <SectionHeader
            title="Nodes Overview"
          />
          <KpiCard
            label="TOTAL ACTIVE NODES"
            value={String(kpi?.totalNodes ?? 0)}
            changePercent={kpi?.totalNodesChange ?? 0}
            trending={(kpi?.totalNodesChange ?? 0) >= 0 ? "up" : "down"}
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
            loading={topNodesLoading}
            loadingText="Loading nodes ranking..."
            onRowClick={(row) => router.push(`/node/${row.node_id}`)}
            columns={[
              {
                key: "node_id",
                label: "Node ID",
                format: (value) => (
                  <div className="truncate w-full">
                    {String(value)}
                  </div>
                ),
              },
              {
                key: "channel_count",
                label: "Channels",
                format: value => {
                  return String(value || 0);
                },
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
