"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { CityNode, NodeLocation } from "@/lib/types";
import worldGeoJson from "../../maps/world.json";
import { formatCompactNumber } from "@/lib";

interface CityMapChartProps {
  cityNodes: CityNode[];
  nodeLocations: NodeLocation[];
  height?: string;
  className?: string;
}

export default function CityMapChart({
  cityNodes,
  nodeLocations,
  height = "500px",
  className = "",
}: CityMapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化图表
    chartInstance.current = echarts.init(chartRef.current);

    // 设置响应式
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  // 注册世界地图 GeoJSON
  useEffect(() => {
    try {
      if (worldGeoJson) {
        echarts.registerMap("world", worldGeoJson as never);
        console.log("World map registered successfully");
      } else {
        console.error("World GeoJSON not found");
      }
    } catch (error) {
      console.error("Failed to register world GeoJSON:", error);
    }
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !cityNodes.length) {
      setMapLoaded(true);
      return;
    }

    // 转换城市数据为散点图数据
    const cityScatterData = cityNodes.map(city => ({
      name: `${city.city}, ${city.country}`,
      value: [city.longitude, city.latitude, city.nodeCount],
      nodeCount: city.nodeCount,
      totalCapacity: formatCompactNumber(city.totalCapacity),
      city: city.city,
      country: city.country,
      nodeIds: city.nodeIds,
    }));

    // 转换单个节点数据为散点图数据（较小的点）
    const nodeScatterData = nodeLocations.map(node => ({
      name: `${node.nodeName} (${node.city})`,
      value: [node.longitude, node.latitude, 1], // 单个节点大小为1
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      city: node.city,
      country: node.country,
      capacity: node.capacity,
    }));

    console.log("City scatter data:", cityScatterData);
    console.log("Node scatter data:", nodeScatterData);

    const option: echarts.EChartsOption = {
      title: {
        text: "Fiber Network Nodes by City",
        left: "center",
        textStyle: {
          color: "var(--foreground)",
          fontSize: 16,
          fontWeight: "normal",
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
        textStyle: {
          color: "var(--foreground)",
        },
        formatter: (params: unknown) => {
          const param = params as {
            name: string;
            value: [number, number, number];
            data?: {
              nodeCount?: number;
              totalCapacity?: number;
              city?: string;
              country?: string;
              nodeIds?: string[];
              nodeId?: string;
              nodeName?: string;
              capacity?: number;
            };
            seriesName?: string;
          };

          // Check if this is a city (Cities series) or individual node (Individual Nodes series)
          if (param.seriesName === "Cities" && param.data) {
            // 城市级别的提示
            const capacity = param.data.totalCapacity || 0;
            const nodeCount = param.data.nodeCount || 0;
            return `${param.name}<br/>Nodes: ${nodeCount}<br/>Capacity: ${capacity} CKB`;
          } else if (param.seriesName === "Individual Nodes" && param.data) {
            // 单个节点的提示
            const capacity = param.data.capacity || 0;
            return `${param.name}<br/>Capacity: ${capacity} CKB`;
          } else {
            // Fallback
            return param.name;
          }
        },
      },
      visualMap: {
        min: 0,
        max:
          cityNodes.length > 0
            ? Math.max(...cityNodes.map(city => city.nodeCount))
            : 1,
        left: "left",
        top: "bottom",
        text: ["High", "Low"],
        calculable: true,
        inRange: {
          color: ["#e0f2fe", "#0ea5e9", "#0369a1"],
        },
        textStyle: {
          color: "var(--foreground)",
        },
      },
      geo: {
        map: "world",
        roam: true,
        itemStyle: {
          borderColor: "var(--border)",
          borderWidth: 1,
          areaColor: "#f8fafc",
        },
        emphasis: {
          itemStyle: {
            areaColor: "#e2e8f0",
          },
        },
      },
      series: [
        {
          name: "Cities",
          type: "scatter",
          coordinateSystem: "geo",
          data: cityScatterData,
          symbolSize: (val: number[]) => {
            // 根据节点数量调整点的大小
            const nodeCount = val[2];
            return Math.max(8, Math.min(30, nodeCount * 2));
          },
          itemStyle: {
            color: "#0ea5e9",
            shadowBlur: 10,
            shadowColor: "rgba(14, 165, 233, 0.5)",
          },
          emphasis: {
            itemStyle: {
              color: "#0369a1",
              shadowBlur: 20,
              shadowColor: "rgba(3, 105, 161, 0.8)",
            },
          },
        },
        {
          name: "Individual Nodes",
          type: "scatter",
          coordinateSystem: "geo",
          data: nodeScatterData,
          symbolSize: 4,
          itemStyle: {
            color: "#64748b",
            opacity: 0.6,
          },
          emphasis: {
            itemStyle: {
              color: "#475569",
              opacity: 1,
            },
          },
        },
      ],
    };

    chartInstance.current.setOption(option);
    setMapLoaded(true);
  }, [cityNodes, nodeLocations]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={chartRef} style={{ height }} className={className} />
      {!mapLoaded && !mapError && (
        <div
          className={`${className} absolute inset-0 flex items-center justify-center pointer-events-none`}
        >
          <div className="text-muted-foreground">Loading city map...</div>
        </div>
      )}
      {mapError && (
        <div
          className={`${className} absolute inset-0 flex items-center justify-center pointer-events-none`}
        >
          <div className="text-center">
            <div className="text-destructive mb-2">Failed to load city map</div>
            <div className="text-sm text-muted-foreground">{mapError}</div>
          </div>
        </div>
      )}
    </div>
  );
}
