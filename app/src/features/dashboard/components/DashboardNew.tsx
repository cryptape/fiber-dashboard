import TimeSeriesChart from "@/shared/components/chart/TimeSeriesChart";
import {
  KpiCard,
  SectionHeader,
  GlassCardContainer,
  EasyTable,
  RadioGroup,
} from "@/shared/components/ui";
import { AssetSelect } from "@/shared/components/ui/AssetSelect";
import { SUPPORTED_ASSETS } from "@/lib/config/assets";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { queryKeys } from "@/features/dashboard/hooks/useDashboard";
import { useRouter, useSearchParams } from "next/navigation";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiClient, currentNetwork } = useNetwork();
  
  // 从 URL 读取资产值
  const urlAsset = searchParams.get('asset') || '';
  const [selectedAsset, setSelectedAsset] = useState<string>(urlAsset);
  const [metricType, setMetricType] = useState<"capacity" | "liquidity">("capacity");
  
  // 同步 URL 参数到 selectedAsset（仅在 URL 变化时）
  useEffect(() => {
    setSelectedAsset(urlAsset);
  }, [urlAsset]);
  
  // 当 selectedAsset 变化时，更新 URL（避免循环）
  useEffect(() => {
    if (selectedAsset !== urlAsset) {
      const params = new URLSearchParams(searchParams.toString());
      if (selectedAsset) {
        params.set('asset', selectedAsset);
      } else {
        params.delete('asset');
      }
      const newUrl = params.toString() ? `/?${params.toString()}` : '/';
      router.replace(newUrl, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset]); // 只依赖 selectedAsset，避免循环

  // 判断是否显示 "CHANNEL" 前缀：All assets 或 CKB 或非 CKB 的 capacity 模式
  const isChannelMode = !selectedAsset || selectedAsset === "ckb" || metricType === "capacity";
  // 获取资产标签用于 CHANNELS KPI
  const assetLabel = selectedAsset 
    ? SUPPORTED_ASSETS.find(a => a.value === selectedAsset)?.label.toUpperCase() || "CKB"
    : "TOTAL";

  // 根据资产和模式生成 tooltip 文案
  const getCapacityTooltip = () => {
    if (isChannelMode) {
      // Channel capacity 模式
      if (!selectedAsset) {
        // All assets 模式
        return `The total amount of CKB locked on-chain by all Fiber channels to reserve storage, across all supported assets.`;
      }
      return `The total amount of CKB locked on-chain to reserve storage for Fiber channels that support ${selectedAsset === "ckb" ? "native CKB" : assetLabel} transfers.`;
    } else {
      // Asset liquidity 模式
      return `The total amount of ${assetLabel} currently available across all Fiber channels.`;
    }
  };

  const { data: kpi } = useQuery({
    queryKey: [...queryKeys.kpis, currentNetwork, timeRange, selectedAsset, metricType],
    queryFn: () => apiClient.fetchKpiDataByTimeRange(timeRange, selectedAsset, metricType),
    refetchInterval: 30000,
  });

  const { data: timeSeriesData } = useQuery({
    queryKey: [...queryKeys.timeSeries, currentNetwork, timeRange, selectedAsset, metricType],
    queryFn: () => apiClient.fetchTimeSeriesDataByTimeRange(timeRange, selectedAsset, metricType),
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
                { value: "", label: "All assets" },
              ]}
              value={selectedAsset}
              onChange={setSelectedAsset}
              placeholder="Select asset"
              className="w-[207px]"
            />
            {/* 当选择非 CKB 资产时显示指标选择器；All assets 模式不显示 */}
            {selectedAsset && selectedAsset !== "ckb" && (
              <RadioGroup
                label="Metrics:"
                options={[
                  { value: "capacity", label: "Channel capacity" },
                  { value: "liquidity", label: "Asset liquidity" },
                ]}
                value={metricType}
                onChange={(value) => setMetricType(value as "capacity" | "liquidity")}
              />
            )}
          </div>
          {/* 顶部两个 KPI 横向排列 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard
              label={isChannelMode ? "CHANNEL CAPACITY" : `${assetLabel} LIQUIDITY`}
              value={String(kpi?.totalCapacity ?? 0)}
              unit={kpi?.capacityUnit || "CKB"}
              changePercent={kpi?.totalCapacityChange ?? 0}
              trending={(kpi?.totalCapacityChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
              tooltip={getCapacityTooltip()}
            />
            <KpiCard
              label={`${assetLabel} CHANNELS`}
              value={String(kpi?.totalChannels ?? 0)}
              changePercent={kpi?.totalChannelsChange ?? 0}
              trending={(kpi?.totalChannelsChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
              onViewDetails={() => {
                const url = selectedAsset 
                  ? `/channels?asset=${selectedAsset}` 
                  : '/channels';
                router.push(url);
              }}
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
              label={isChannelMode ? "MIN CHANNEL CAPACITY" : `MIN ${assetLabel} LIQUIDITY`}
              value={String(kpi?.minChannelCapacity ?? 0)}
              unit={kpi?.capacityUnit || "CKB"}
              changePercent={kpi?.minChannelCapacityChange ?? 0}
              trending={(kpi?.minChannelCapacityChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
            />
            <KpiCard
              label={isChannelMode ? "MAX CHANNEL CAPACITY" : `MAX ${assetLabel} LIQUIDITY`}
              value={String(kpi?.maxChannelCapacity ?? 0)}
              unit={kpi?.capacityUnit || "CKB"}
              changePercent={kpi?.maxChannelCapacityChange ?? 0}
              trending={(kpi?.maxChannelCapacityChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
            />
            <KpiCard
              label={isChannelMode ? "AVG CHANNEL CAPACITY" : `AVG ${assetLabel} LIQUIDITY`}
              value={String(kpi?.averageChannelCapacity ?? 0)}
              unit={kpi?.capacityUnit || "CKB"}
              changePercent={kpi?.averageChannelCapacityChange ?? 0}
              trending={(kpi?.averageChannelCapacityChange ?? 0) >= 0 ? "up" : "down"}
              changeLabel="from last week"
            />
            <KpiCard
              label={isChannelMode ? "MEDIAN CHANNEL CAPACITY" : `MEDIAN ${assetLabel} LIQUIDITY`}
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
