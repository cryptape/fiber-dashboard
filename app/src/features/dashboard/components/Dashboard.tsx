"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../hooks/useDashboard";
import CityMapChart from "../../charts/CityMapChart";
import ChannelMapChart from "../../charts/ChannelMapChart";
import HistoryChannelCapacityChart from "../../charts/HistoryChannelCapacityChart";
import HistoryNodeChart from "../../charts/HistoryNodeChart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Globe, Network } from "lucide-react";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { SwipeableKpiCards } from "./SwipeableKpiCards";
import NetworkGraphChart from "../../charts/NetworkGraphChart";
import NodesRankingChart from "../../charts/NodesRankingChart";
import ChannelsByState from "./ChannelsByState";

export default function Dashboard() {
  const { apiClient, currentNetwork } = useNetwork();

  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: [...queryKeys.kpis, currentNetwork],
    queryFn: () => apiClient.fetchKpiData(),
    refetchInterval: 30000, // 30秒轮询
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: [...queryKeys.geoNodes, currentNetwork],
    queryFn: () => apiClient.fetchDashboardData(),
    refetchInterval: 300000, // 5分钟轮询
  });

  const { data: nodes, isLoading: nodesLoading } = useQuery({
    queryKey: [...queryKeys.nodes, currentNetwork],
    queryFn: () => apiClient.fetchAllActiveNodes(),
    refetchInterval: 300000, // 5分钟轮询
  });

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: [...queryKeys.channels, currentNetwork],
    queryFn: () => apiClient.fetchAllActiveChannels(),
    refetchInterval: 300000, // 5分钟轮询
  });

  if (kpiLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-12 animate-fade-in">
      <SwipeableKpiCards kpiData={kpiData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 align-middle justify-center items-center">
        <div className="p-6 h-full">
          <HistoryChannelCapacityChart />
        </div>
        <div className="p-6 h-full">
          <HistoryNodeChart />
        </div>
      </div>

      {/* Network Graph Chart */}
      <Card className="card-zed card-zed-hover group">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg font-semibold text-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Network className="h-5 w-5 text-primary" />
              </div>
              Network Graph
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {nodesLoading || channelsLoading ? (
            <Skeleton className="h-96 rounded-lg" />
          ) : (
            <NetworkGraphChart
              nodes={nodes || []}
              channels={channels || []}
              height="500px"
            />
          )}
        </CardContent>
      </Card>

      <NodesRankingChart nodes={nodes || []} channels={channels || []} />

      {/* Channels by State */}
      <ChannelsByState />

      {/* Channels On World Map */}
      <Card className="card-zed card-zed-hover group">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg font-semibold text-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Network className="h-5 w-5 text-primary" />
              </div>
              Channels On World Map
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {nodesLoading || channelsLoading ? (
            <Skeleton className="h-96 rounded-lg" />
          ) : (
            <ChannelMapChart
              nodes={nodes || []}
              channels={channels || []}
              height="500px"
            />
          )}
        </CardContent>
      </Card>

      {/* City Map Chart */}
      <Card className="card-zed card-zed-hover group">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg font-semibold text-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              Fiber Nodes Global Distribution
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {dashboardLoading ? (
            <Skeleton className="h-96 rounded-lg" />
          ) : (
            <CityMapChart
              cityNodes={dashboardData?.cityNodes || []}
              nodeLocations={dashboardData?.nodeLocations || []}
              height="500px"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-12">
      {/* KPI Cards Skeleton */}
      <div className="relative">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-6 min-w-max py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card-zed p-6 w-64 h-32 flex-shrink-0">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-zed p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="card-zed p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>

      <div className="card-zed p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
