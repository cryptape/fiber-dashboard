"use client";

import { useEffect, useState } from "react";
import { TimeSeries } from "@/lib/types";
import { APIClient } from "@/lib/client";
import TimeSeriesChart from "@/shared/components/chart/TimeSeriesChart";

export default function HistoryNodeChart() {
  const [nodesSeries, setNodesSeries] = useState<TimeSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const apiClient = new APIClient();
        const timeSeriesData = await apiClient.fetchNodeHistoryTimeSeries();

        setNodesSeries(timeSeriesData.nodes);
      } catch (err) {
        console.error("Error fetching node history:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-lg">Loading node history data...</div>
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

  if (!nodesSeries) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-lg">No node data available</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <TimeSeriesChart
        data={[nodesSeries]}
        title="Lightning Network Node History"
        height="300px"
        className="w-full"
      />
    </div>
  );
}
