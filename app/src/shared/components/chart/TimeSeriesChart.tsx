"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { TimeSeries } from "../../../lib/types";

interface TimeSeriesChartProps {
  data: TimeSeries[];
  title?: string;
  height?: string;
  className?: string;
  colors?: string[]; // 自定义线条颜色
  timeRange?: "hourly" | "monthly" | "yearly"; // 时间维度
}

export default function TimeSeriesChart({
  data,
  title,
  height = "400px",
  className = "",
  colors = ["#7459e6", "#fab83d"], // 默认使用紫色和黄色
  timeRange = "hourly", // 默认小时维度
}: TimeSeriesChartProps) {
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
    if (!chartInstance.current) return;

    // 获取CSS变量值
    const borderColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--border-default')
      .trim();
    const tertiaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-tertiary')
      .trim();
    const secondaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-secondary')
      .trim();
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-primary')
      .trim();
    
    // 获取字体样式
    const captionFontSize = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-size-12')
      .trim();
    const bodyFontSize = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-size-14')
      .trim();
    const mediumWeight = getComputedStyle(document.documentElement)
      .getPropertyValue('--weight-medium')
      .trim();
    const regularWeight = getComputedStyle(document.documentElement)
      .getPropertyValue('--weight-regular')
      .trim();
    const lineHeight120 = getComputedStyle(document.documentElement)
      .getPropertyValue('--line-120')
      .trim();

    // 判断是否有两组数据，决定是否使用双Y轴
    const hasTwoSeries = data.length === 2;

    // 根据屏幕宽度设置 tooltip 宽度
    const isMobile = window.innerWidth < 768;
    const tooltipWidth = isMobile ? 154 : 164;

    // 数字格式化函数
    const formatNumber = (value: number) => {
      // 如果是 0，返回空字符串不显示
      if (value === 0) return '';
      
      const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
      });
      return formatter.format(value);
    };

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "var(--surface-popover)",
        borderColor: borderColor,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        confine: true,
        extraCssText: `width: ${tooltipWidth}px; box-sizing: border-box; box-shadow: 0 4px 6px 0 rgba(0, 0, 0, 0.08);`,
        textStyle: {
          color: primaryColor,
        },
        formatter: (params: unknown) => {
          const paramArray = Array.isArray(params) ? params : [params];
          if (paramArray.length === 0) return "";
          
          const firstParam = paramArray[0] as {
            value: [string | number, number];
            axisValue: string;
          };
          
          if (firstParam && Array.isArray(firstParam.value)) {
            // 格式化标题：月 日, 年
            const timestamp = firstParam.value[0];
            const date = new Date(timestamp);
            const month = date.toLocaleString('en-US', { month: 'short' });
            const day = date.getDate();
            const year = date.getFullYear();
            const titleText = `${month} ${day}, ${year}`;
            
            // 标题样式：type-caption、text-primary
            let result = `<div style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${primaryColor};margin-bottom:12px;">${titleText}</div>`;
            
            // 每个数据项
            paramArray.forEach((param: { value: [string | number, number]; color: string; seriesName: string }, index: number) => {
              const value = param.value[1];
              const color = param.color;
              const name = param.seriesName;
              const formattedValue = formatNumber(value);
              
              // 左侧数值（type-caption + 对应颜色） + 右侧标题（type-caption + text-tertiary）
              result += `<div style="display:flex;justify-content:space-between;align-items:center;${index < paramArray.length - 1 ? 'margin-bottom:4px;' : ''}">`;
              result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${color};">${formattedValue}</span>`;
              result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${tertiaryColor};margin-left:16px;">${name}</span>`;
              result += `</div>`;
            });
            
            return result;
          }
          return "";
        },
      },
      legend: {
        data: data.map(series => series.label),
        selected: Object.fromEntries(data.map(series => [series.label, true])),
        top: 0,
        left: 0,
        textStyle: {
          color: secondaryColor,
          fontSize: parseInt(bodyFontSize),
          fontWeight: parseInt(regularWeight) as 400,
        },
        itemGap: 20,
        itemWidth: 10,
        itemHeight: 10,
        show: true,
        orient: "horizontal",
        icon: "rect",
      },
      grid: {
        left: 0,
        right: 0,
        bottom: "3%",
        top: "40px", // legend高度 + 16px间距
        containLabel: true,
      },
      xAxis: {
        type: "time",
        // 根据时间维度设置最小时间间隔
        minInterval: timeRange === "yearly" 
          ? 3600 * 24 * 1000 * 365 // 年度视图：至少1年间隔，只显示年份
          : timeRange === "monthly"
          ? 3600 * 24 * 1000 * 30 // 月度视图：至少1个月间隔，只显示月份
          : 3600 * 24 * 1000, // 小时视图：至少1天间隔
        axisLine: {
          lineStyle: {
            color: borderColor,
          },
        },
        axisLabel: {
          color: tertiaryColor,
          fontSize: parseInt(captionFontSize),
          fontWeight: parseInt(mediumWeight) as 500,
          formatter: (value: number) => {
            const date = new Date(value);
            // 根据时间维度调整显示格式
            if (timeRange === "yearly") {
              // 年度视图：只显示年份
              const year = date.getFullYear();
              return `${year}`;
            } else if (timeRange === "monthly") {
              // 月度视图：只显示月份 "年-月"
              const year = date.getFullYear();
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              return `${year}-${month}`;
            } else {
              // 小时视图：显示 "月-日"
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              const day = date.getDate().toString().padStart(2, '0');
              return `${month}-${day}`;
            }
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: borderColor,
            type: "dashed",
            opacity: 1,
          },
        },
      },
      yAxis: hasTwoSeries
        ? [
            // 左侧Y轴 - 第一组数据
            {
              type: "value",
              position: "left",
              axisLine: {
                show: true,
                lineStyle: {
                  color: borderColor,
                },
              },
              axisLabel: {
                color: tertiaryColor,
                fontSize: parseInt(captionFontSize),
                fontWeight: parseInt(mediumWeight) as 500,
                formatter: (value: number) => formatNumber(value),
              },
              splitLine: {
                show: false,
              },
            },
            // 右侧Y轴 - 第二组数据
            {
              type: "value",
              position: "right",
              axisLine: {
                show: true,
                lineStyle: {
                  color: borderColor,
                },
              },
              axisLabel: {
                color: tertiaryColor,
                fontSize: parseInt(captionFontSize),
                fontWeight: parseInt(mediumWeight) as 500,
                formatter: (value: number) => formatNumber(value),
              },
              splitLine: {
                show: false,
              },
            },
          ]
        : {
            // 单Y轴
            type: "value",
            axisLine: {
              show: true,
              lineStyle: {
                color: borderColor,
              },
            },
            axisLabel: {
              color: tertiaryColor,
              fontSize: parseInt(captionFontSize),
              fontWeight: parseInt(mediumWeight) as 500,
              formatter: (value: number) => formatNumber(value),
            },
            splitLine: {
              show: false,
            },
          },
      series: data.map((series, index) => ({
        name: series.label,
        type: "line",
        smooth: 0.2, // 轻微平滑，0-1之间，值越小越接近折线
        yAxisIndex: hasTwoSeries ? index : 0, // 两组数据时，分别使用左右Y轴
        lineStyle: {
          color: colors[index] || `hsl(${200 + index * 30}, 70%, 50%)`,
          width: 2,
          shadowColor: 'transparent',
          shadowBlur: 0,
        },
        itemStyle: {
          color: colors[index] || `hsl(${200 + index * 30}, 70%, 50%)`,
          shadowColor: 'transparent',
          shadowBlur: 0,
        },
        showSymbol: false,
        emphasis: {
          lineStyle: {
            shadowColor: 'transparent',
            shadowBlur: 0,
          },
        },
        data: series.data.map(item => [item.timestamp, item.value]),
      })),
    };

    chartInstance.current.setOption(option);
  }, [data, title, colors, timeRange]);

  return <div ref={chartRef} style={{ height }} className={className} />;
}
