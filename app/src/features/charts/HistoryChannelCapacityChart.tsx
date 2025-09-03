"use client";

import { useEffect, useState } from "react";
import { TimeSeries } from "@/lib/types";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import DualAxisTimeSeriesChart from "@/shared/components/chart/DualAxisTimeSeriesChart";

export default function HistoryChannelCapacityChart() {
  const { apiClient, currentNetwork } = useNetwork();
  const [capacitySeries, setCapacitySeries] = useState<TimeSeries | null>(null);
  const [channelsSeries, setChannelsSeries] = useState<TimeSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const timeSeriesData =
          await apiClient.fetchChannelCapacityHistoryTimeSeries();

        setCapacitySeries(timeSeriesData.capacity);
        setChannelsSeries(timeSeriesData.channels);
      } catch (err) {
        console.error("Error fetching channel capacity history:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiClient, currentNetwork]);

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-lg">Loading historical data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (
    !capacitySeries ||
    !channelsSeries ||
    capacitySeries.data.length === 0 ||
    channelsSeries.data.length === 0
  ) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-lg">No data available</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <DualAxisTimeSeriesChart
        leftSeries={capacitySeries}
        rightSeries={channelsSeries}
        title="Lightning Network History"
        subtitle="Network Capacity vs Active Channels"
        height="300px"
        className="w-full"
      />
    </div>
  );
}
