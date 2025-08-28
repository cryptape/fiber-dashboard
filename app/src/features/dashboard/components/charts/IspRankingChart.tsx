"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { IspRanking } from "@/lib/types";

interface IspRankingChartProps {
  data: IspRanking[];
  height?: string;
  className?: string;
}

export default function IspRankingChart({
  data,
  height = "400px",
  className = "",
}: IspRankingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

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

  useEffect(() => {
    if (!chartInstance.current || !data.length) return;

    // 按节点数量排序
    const sortedData = [...data].sort((a, b) => b.nodeCount - a.nodeCount);

    const option: echarts.EChartsOption = {
      title: {
        text: "Top ISPs by CKB Lightning Network Nodes",
        left: "center",
        textStyle: {
          color: "var(--foreground)",
          fontSize: 16,
          fontWeight: "normal",
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
        textStyle: {
          color: "var(--foreground)",
        },
        formatter: (params: unknown) => {
          const paramArray = Array.isArray(params) ? params : [params];
          const data = paramArray[0] as {
            name: string;
            value: number;
            dataIndex: number;
          };
          return `${data.name}<br/>Nodes: ${data.value}<br/>Capacity: ${sortedData[data.dataIndex].totalCapacity.toFixed(2)} CKB<br/>Avg Capacity: ${sortedData[data.dataIndex].averageCapacity.toFixed(2)} CKB`;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: sortedData.map(item => item.isp),
        axisTick: {
          alignWithLabel: true,
        },
        axisLine: {
          lineStyle: {
            color: "var(--border)",
          },
        },
        axisLabel: {
          color: "var(--muted-foreground)",
          rotate: 45,
        },
      },
      yAxis: {
        type: "value",
        name: "Number of Nodes",
        axisLine: {
          lineStyle: {
            color: "var(--border)",
          },
        },
        axisLabel: {
          color: "var(--muted-foreground)",
        },
        splitLine: {
          lineStyle: {
            color: "var(--border)",
            opacity: 0.3,
          },
        },
      },
      series: [
        {
          name: "Nodes",
          type: "bar",
          data: sortedData.map(item => item.nodeCount),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#0ea5e9" },
              { offset: 1, color: "#0369a1" },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "#0284c7" },
                { offset: 1, color: "#075985" },
              ]),
            },
          },
        },
      ],
    };

    chartInstance.current.setOption(option);
  }, [data]);

  return <div ref={chartRef} style={{ height }} className={className} />;
}
