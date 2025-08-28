"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { TimeSeries } from "@/lib/types";
import { formatCompactNumber } from "@/lib/utils";

interface DualAxisTimeSeriesChartProps {
  leftSeries: TimeSeries;
  rightSeries: TimeSeries;
  leftUnit?: string;
  rightUnit?: string;
  title?: string;
  subtitle?: string;
  height?: string;
  className?: string;
}

export default function DualAxisTimeSeriesChart({
  leftSeries,
  rightSeries,
  leftUnit = "",
  rightUnit = "",
  title = "Lightning Network History",
  subtitle = "Lightning Network Capacity",
  height = "400px",
  className = "",
}: DualAxisTimeSeriesChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    // Set up responsive behavior
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
    if (
      !chartInstance.current ||
      !leftSeries.data.length ||
      !rightSeries.data.length
    )
      return;

    const option: echarts.EChartsOption = {
      title: {
        text: title,
        subtext: subtitle,
        left: "center",
        textStyle: {
          color: "var(--foreground)",
          fontSize: 18,
          fontWeight: "bold",
        },
        subtextStyle: {
          color: "var(--muted-foreground)",
          fontSize: 14,
        },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
        textStyle: {
          color: "var(--foreground)",
        },
        formatter: (params: unknown) => {
          const paramArray = Array.isArray(params) ? params : [params];
          let tooltipContent = "";

          paramArray.forEach(
            (param: {
              value: [string | number, number];
              seriesName: string;
            }) => {
              if (param && Array.isArray(param.value)) {
                const value = formatCompactNumber(Number(param.value[1]));
                const unit =
                  param.seriesName === leftSeries.label ? leftUnit : rightUnit;
                tooltipContent += `${param.seriesName}: ${value} ${unit}<br/>`;
              }
            }
          );

          if (paramArray[0] && Array.isArray(paramArray[0].value)) {
            const date = new Date(paramArray[0].value[0]).toLocaleDateString();
            return `${date}<br/>${tooltipContent}`;
          }
          return "";
        },
      },
      legend: {
        data: [leftSeries.label, rightSeries.label],
        top: 50,
        left: "center",
        textStyle: {
          color: "#000000",
          fontSize: 12,
          fontWeight: "normal",
        },
        itemGap: 20,
        itemWidth: 25,
        itemHeight: 14,
        show: true,
        orient: "horizontal",
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "25%",
        containLabel: true,
      },
      xAxis: {
        type: "time",
        axisLine: {
          lineStyle: {
            color: "var(--border)",
          },
        },
        axisLabel: {
          color: "var(--muted-foreground)",
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: [
        {
          type: "value",
          name: leftUnit,
          position: "left",
          axisLine: {
            lineStyle: {
              color: "var(--border)",
            },
          },
          axisLabel: {
            color: "var(--muted-foreground)",
            formatter: (value: number) =>
              `${formatCompactNumber(value)} ${leftUnit}`,
          },
          splitLine: {
            lineStyle: {
              color: "var(--border)",
              opacity: 0.3,
            },
          },
        },
        {
          type: "value",
          name: rightUnit,
          position: "right",
          axisLine: {
            lineStyle: {
              color: "var(--border)",
            },
          },
          axisLabel: {
            color: "var(--muted-foreground)",
            formatter: (value: number) =>
              `${formatCompactNumber(value)} ${rightUnit}`,
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: leftSeries.label,
          type: "line",
          yAxisIndex: 0,
          smooth: true,
          areaStyle: {
            opacity: 0.6,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(128, 90, 213, 0.8)" }, // Purple area for capacity
              { offset: 1, color: "rgba(128, 90, 213, 0.1)" },
            ]),
          },
          lineStyle: {
            color: "rgba(128, 90, 213, 0.8)",
            width: 2,
          },
          symbol: "circle",
          symbolSize: 4,
          data: leftSeries.data.map(item => [item.timestamp, item.value]),
        },
        {
          name: rightSeries.label,
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          lineStyle: {
            color: "#ffd700", // Yellow line for channels
            width: 3,
          },
          symbol: "circle",
          symbolSize: 6,
          data: rightSeries.data.map(item => [item.timestamp, item.value]),
        },
      ],
    };

    chartInstance.current.setOption(option);
  }, [leftSeries, rightSeries, leftUnit, rightUnit, title, subtitle]);

  return <div ref={chartRef} style={{ height }} className={className} />;
}
