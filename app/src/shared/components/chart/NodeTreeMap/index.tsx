"use client";

import { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";

interface NodeData {
  node_id: string;
  node_name?: string;
  channel_count?: number;
  country_or_region?: string;
  city?: string;
  commit_timestamp?: string;
}

interface NodeTreeMapProps {
  data: NodeData[];
  onNodeClick?: (nodeId: string) => void;
  height?: string;
  className?: string;
  loading?: boolean;
}

export const NodeTreeMap: React.FC<NodeTreeMapProps> = ({
  data,
  onNodeClick,
  height = "500px",
  className = "",
  loading = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 准备 treemap 数据
  const treeData = useMemo(() => {
    // 按 channel_count 排序并取前20个节点
    const sortedNodes = [...data]
      .filter(node => (node.channel_count || 0) > 0)
      .sort((a, b) => (b.channel_count || 0) - (a.channel_count || 0))
      .slice(0, 30);

    if (sortedNodes.length === 0) {
      return null;
    }

    // 找到最大和最小的 channel_count 用于计算透明度
    const maxChannels = sortedNodes[0].channel_count || 1;
    const minChannels = sortedNodes[sortedNodes.length - 1].channel_count || 0;
    const range = maxChannels - minChannels || 1;

    // 基础颜色 #59abe6 的 RGB 值
    const baseR = 0x59;
    const baseG = 0xAB;
    const baseB = 0xE6;

    // 转换数据为 treemap 格式
    const result = sortedNodes.map(node => {
      const channelCount = node.channel_count || 0;
      
      // 计算透明度：channel数量越多，透明度越低(颜色越深)
      // 透明度范围: 0.3 ~ 1.0
      const opacity = 0.3 + (0.7 * (channelCount - minChannels) / range);
      
      // 生成带透明度的颜色
      const color = `rgba(${baseR}, ${baseG}, ${baseB}, ${opacity})`;

      // 格式化 Last seen 时间
      const lastSeen = node.commit_timestamp
        ? new Date(node.commit_timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "N/A";

      // 格式化位置信息
      const location = [node.city, node.country_or_region]
        .filter(Boolean)
        .join(", ") || "Unknown";

      // 使用 node_name，如果为空则截断 node_id 作为显示名称
      const fullName = node.node_name || node.node_id;
      const displayName = fullName.length > 20 ? fullName.slice(0, 20) + "..." : fullName;
      
      // 给 value 添加一个最小值，确保小节点也有足够的显示面积
      // 使用 Math.max 确保最小值为最大值的 2%
      const displayValue = Math.max(channelCount, maxChannels * 0.02);
      
      return {
        name: displayName,
        fullName: fullName, // 完整名称用于 tooltip
        value: displayValue, // 使用调整后的值用于渲染
        actualValue: channelCount, // 保存实际值用于 tooltip
        nodeId: node.node_id,
        location,
        lastSeen,
        itemStyle: {
          color,
          borderColor: "#ffffff",
          borderWidth: 0.5,
          gapWidth: 0.5,
        },
      };
    });
    
    return result;
  }, [data]);

  // 初始化图表并更新配置
  useEffect(() => {
    if (!chartRef.current) {
      // 如果 DOM 不存在但实例存在，说明 DOM 被卸载了，需要清理实例
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
      return;
    }

    // 检查实例是否已被销毁，如果是则重新初始化
    if (chartInstance.current && chartInstance.current.isDisposed()) {
      chartInstance.current = null;
    }

    // 初始化 ECharts 实例（如果还没有初始化）
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, null, {
        renderer: 'canvas',
      });
      
      // 添加 resize 监听
      const handleResize = () => {
        chartInstance.current?.resize();
      };
      window.addEventListener("resize", handleResize);
    }

    // 如果没有数据，清空图表
    if (!treeData) {
      chartInstance.current.clear();
      return;
    }

    const maxChannels = Math.max(...treeData.map(d => d.value));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "item",
        backgroundColor: "transparent",
        borderWidth: 0,
        padding: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const dataItem = params.data as {
            name: string;
            fullName: string;
            value: number;
            actualValue: number;
            location: string;
            lastSeen: string;
          };
          return `
            <div class="p-3 bg-popover rounded-lg shadow-[0px_4px_6px_0px_rgba(0,0,0,0.08)] outline outline-1 outline-offset-[-1px] outline-white inline-flex flex-col justify-start items-start gap-2">
              <div class="justify-start text-primary text-xs font-medium font-['Inter'] leading-4">
                ${dataItem.fullName}
              </div>
              <div class="inline-flex justify-start items-center gap-4">
                <div class="flex justify-start items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-primary">
                    <path d="M12 5.90909C12 9.72727 7 13 7 13C7 13 2 9.72727 2 5.90909C2 4.60712 2.52678 3.35847 3.46447 2.43784C4.40215 1.51721 5.67392 1 7 1C8.32608 1 9.59785 1.51721 10.5355 2.43784C11.4732 3.35847 12 4.60712 12 5.90909Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M7 7.54545C7.92047 7.54545 8.66667 6.81283 8.66667 5.90909C8.66667 5.00535 7.92047 4.27273 7 4.27273C6.07953 4.27273 5.33333 5.00535 5.33333 5.90909C5.33333 6.81283 6.07953 7.54545 7 7.54545Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <div class="justify-start text-primary text-xs font-normal font-['Inter'] leading-4">
                    ${dataItem.location}
                  </div>
                </div>
                <div class="justify-start text-primary text-xs font-normal font-['Inter'] leading-4">
                  Last seen on: ${dataItem.lastSeen}
                </div>
              </div>
              <div class="inline-flex justify-start items-center gap-12">
                <div class="justify-start text-warning text-xs font-medium font-['Inter'] leading-4">
                  ${dataItem.actualValue || dataItem.value}
                </div>
                <div class="justify-start text-tertiary text-xs font-medium font-['Inter'] leading-4">
                  Total Channels
                </div>
              </div>
            </div>
          `;
        },
      },
      series: [
        {
          type: "treemap",
          data: treeData,
          width: "100%",
          height: "100%",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          roam: false,
          nodeClick: false,
          squareRatio: 0.5 * (1 + Math.sqrt(5)), // 黄金比例，更好的空间利用
          breadcrumb: {
            show: false,
          },
          leafDepth: 1, // 确保所有节点都在同一层级
          visibleMin: 0, // 设置为 0，确保所有节点都显示
          childrenVisibleMin: 0, // 子节点最小可见面积为 0
          label: {
            show: true,
            position: [4, 4], // 距离左上角 4px, 4px
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (params: any) => {
              const dataItem = params.data as { name: string; value: number };
              // 对于非常小的矩形（小于最大值的3%），不显示文字
              if (dataItem.value < maxChannels * 0.1) {
                return "";
              }
              return dataItem.name;
            },
            color: "#0f0f10", // text/primary
            fontSize: 14, // body2
            fontWeight: 400, // regular
            lineHeight: 16,
            overflow: "truncate",
            ellipsis: "...",
          },
          upperLabel: {
            show: false,
          },
          levels: [
            {
              itemStyle: {
                borderWidth: 0.5,
                borderColor: "#ffffff",
                gapWidth: 0.5,
              },
            },
          ],
        },
      ],
    };

    chartInstance.current.setOption(option, true); // 第二个参数 true 表示不合并，完全替换配置

    // 强制 resize 确保图表正确渲染
    setTimeout(() => {
      chartInstance.current?.resize();
    }, 0);

    // 添加点击事件
    if (onNodeClick) {
      chartInstance.current.off("click");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chartInstance.current.on("click", (params: any) => {
        if (params.componentType === "series") {
          const dataItem = params.data as { nodeId?: string };
          if (dataItem?.nodeId) {
            onNodeClick(dataItem.nodeId);
          }
        }
      });
    }
  }, [treeData, onNodeClick]);

  // 清理函数：组件卸载时销毁实例
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        const handleResize = () => {
          chartInstance.current?.resize();
        };
        window.removeEventListener("resize", handleResize);
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (loading || !treeData) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <p className="type-body text-secondary">
          {loading ? "Loading..." : "No node data available"}
        </p>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        height, 
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'transparent'
      }} 
      className={className}
    >
      <div 
        ref={chartRef} 
        style={{ 
          height: '100%',
          width: '100%'
        }} 
      />
    </div>
  );
};
