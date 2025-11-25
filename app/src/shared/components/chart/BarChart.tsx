"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface BarChartDataItem {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDataItem[];
  title: string;
  height?: string;
  className?: string;
  tooltipFormatter?: (item: BarChartDataItem) => { label: string; value: string }[];
}

export default function BarChart({
  data,
  title,
  height = "400px",
  className = "",
  tooltipFormatter,
}: BarChartProps) {
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
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-primary')
      .trim();
    const purpleColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--purple')
      .trim();
    
    // 获取字体样式
    const captionFontSize = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-size-12')
      .trim();
    const h3FontSize = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-size-18')
      .trim();
    const mediumWeight = getComputedStyle(document.documentElement)
      .getPropertyValue('--weight-medium')
      .trim();
    const lineHeight120 = getComputedStyle(document.documentElement)
      .getPropertyValue('--line-120')
      .trim();

    // 数字格式化函数
    const formatNumber = (value: number) => {
      if (value === 0) return '0';
      
      const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
      });
      return formatter.format(value);
    };

    const option: echarts.EChartsOption = {
      title: {
        text: title,
        left: 'center',
        top: '-10%',
        textStyle: {
          color: primaryColor,
          fontSize: parseInt(h3FontSize),
          fontWeight: 600,
          lineHeight: parseInt(lineHeight120),
        },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "var(--surface-popover)",
        borderColor: borderColor,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        confine: true,
        extraCssText: `box-sizing: border-box; box-shadow: 0 4px 6px 0 rgba(0, 0, 0, 0.08); white-space: nowrap;`,
        textStyle: {
          color: primaryColor,
        },
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(116, 89, 230, 0.1)',
          },
        },
        formatter: (params: unknown) => {
          const paramArray = Array.isArray(params) ? params : [params];
          if (paramArray.length === 0) return "";
          
          const firstParam = paramArray[0] as {
            dataIndex: number;
            value: number;
            name: string;
          };
          
          if (firstParam) {
            const dataItem = data[firstParam.dataIndex];
            let result = '';
            
            // 如果有自定义格式化函数，使用自定义格式
            if (tooltipFormatter && dataItem) {
              const tooltipData = tooltipFormatter(dataItem);
              tooltipData.forEach((item, index) => {
                result += `<div style="display:flex;justify-content:space-between;align-items:center;${index < tooltipData.length - 1 ? 'margin-bottom:8px;' : ''}">`;
                result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${tertiaryColor};">${item.label}</span>`;
                result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${purpleColor};margin-left:16px;">${item.value}</span>`;
                result += `</div>`;
              });
            } else {
              // 默认格式：左侧label（tertiary）+ 右侧value（purple）
              result += `<div style="display:flex;justify-content:space-between;align-items:center;">`;
              result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${tertiaryColor};">${firstParam.name}</span>`;
              result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${purpleColor};margin-left:16px;">${formatNumber(firstParam.value)}</span>`;
              result += `</div>`;
            }
            
            return result;
          }
          return "";
        },
      },
      grid: {
        left: 0,
        right: 0,
        bottom: "3%",
        top: "50px", // title高度 + 间距
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: data.map(item => item.label),
        axisLine: {
          lineStyle: {
            color: borderColor,
          },
        },
        axisLabel: {
          color: tertiaryColor,
          fontSize: parseInt(captionFontSize),
          fontWeight: parseInt(mediumWeight) as 500,
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
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
          show: true,
          lineStyle: {
            color: borderColor,
            type: "dashed",
            opacity: 1,
          },
        },
      },
      series: [
        {
          type: "bar",
          data: data.map(item => item.value),
          itemStyle: {
            color: 'rgba(116, 89, 230, 0.70)',
            borderRadius: [2, 2, 0, 0],
          },
          emphasis: {
            itemStyle: {
              color: purpleColor,
            },
          },
          barWidth: '60%',
        },
      ],
    };

    chartInstance.current.setOption(option);
  }, [data, title, tooltipFormatter]);

  return <div ref={chartRef} style={{ height }} className={className} />;
}
