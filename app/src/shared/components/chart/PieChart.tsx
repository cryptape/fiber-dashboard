"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface PieChartDataItem {
  name: string;
  value: number;
  status?: string; // 可选的状态字段，如果存在则使用 secondary 颜色
}

interface PieChartProps {
  data: PieChartDataItem[];
  title: string;
  height?: string;
  className?: string;
  colors?: string[]; // 自定义颜色
  showLegend?: boolean;
}

export default function PieChart({
  data,
  title,
  height = "400px",
  className = "",
  colors = ["#BDEB88", "#FBE38E", "#E659AB"], // 默认使用指定的三种颜色
  showLegend = true,
}: PieChartProps) {
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
    const purpleColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--purple')
      .trim();
    
    // 获取字体样式
    const captionFontSize = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-size-12')
      .trim();
    const bodyFontSize = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-size-14')
      .trim();
    const h3FontSize = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-size-18')
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

    // 根据屏幕宽度设置 tooltip 宽度
    const isMobile = window.innerWidth < 768;
    const tooltipWidth = isMobile ? 180 : 240; // 增加宽度以容纳较长的状态文字

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

    // 计算总数
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // 计算百分比
    const calculatePercentage = (value: number) => {
      return total > 0 ? Math.round((value / total) * 100) : 0;
    };

    const option: echarts.EChartsOption = {
      title: {
        text: title,
        left: 'center',
        top: -40,
        textStyle: {
          color: primaryColor,
          fontSize: parseInt(h3FontSize),
          fontWeight: 600,
          lineHeight: parseInt(lineHeight120),
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "var(--surface-popover)",
        borderColor: borderColor,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        confine: true,
        extraCssText: `min-width: ${tooltipWidth}px; max-width: 300px; box-sizing: border-box; box-shadow: 0 4px 6px 0 rgba(0, 0, 0, 0.08); word-wrap: break-word;`,
        textStyle: {
          color: primaryColor,
        },
        formatter: (params: unknown) => {
          const param = params as {
            dataIndex: number;
            value: number;
            name: string;
            color: string;
            percent: number;
          };
          
          if (param) {
            const dataItem = data[param.dataIndex];
            const percentage = calculatePercentage(param.value);
            
            // 判断是否有 status 字段，决定右侧颜色
            const isStatus = dataItem && 'status' in dataItem;
            const valueColor = isStatus ? secondaryColor : purpleColor;
            
            let result = '';
            
            // Status 行（如果存在）- 带小圆点
            if (isStatus && dataItem.status) {
              result += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;">`;
              result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${tertiaryColor};white-space:nowrap;">Status</span>`;
              result += `<span style="display:flex;align-items:center;font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${valueColor};flex:1;min-width:0;">`;
              result += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${param.color};margin-right:6px;flex-shrink:0;"></span>`;
              result += `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${dataItem.status}</span>`;
              result += `</span>`;
              result += `</div>`;
            }
            
            // # of Channels 行
            result += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
            result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${tertiaryColor};"># of Channels</span>`;
            result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${purpleColor};margin-left:16px;">${formatNumber(param.value)}</span>`;
            result += `</div>`;
            
            // % of Total 行
            result += `<div style="display:flex;justify-content:space-between;align-items:center;">`;
            result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${tertiaryColor};">% of Total</span>`;
            result += `<span style="font-size:${captionFontSize};font-weight:${mediumWeight};line-height:${lineHeight120};color:${purpleColor};margin-left:16px;">${percentage}%</span>`;
            result += `</div>`;
            
            return result;
          }
          return "";
        },
      },
      legend: showLegend ? {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        itemGap: 20,
        itemWidth: 12,
        itemHeight: 12,
        icon: 'rect',
        textStyle: {
          color: secondaryColor,
          fontSize: parseInt(bodyFontSize),
          fontWeight: parseInt(regularWeight) as 400,
        },
        data: data.map(item => item.name),
      } : undefined,
      series: [
        {
          type: 'pie',
          radius: ['0%', '65%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: false,
            },
            scale: true,
            scaleSize: 5,
          },
          labelLine: {
            show: false,
          },
          data: data.map((item, index) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: colors[index % colors.length],
            },
          })),
        },
      ],
    };

    chartInstance.current.setOption(option);
  }, [data, title, colors, showLegend]);

  return <div ref={chartRef} style={{ height }} className={className} />;
}
