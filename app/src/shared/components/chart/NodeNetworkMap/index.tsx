"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as echarts from "echarts";
import worldGeoJson from "@/features/dashboard/maps/world.json";
import { ChannelsLegend } from "./ChannelsLegend";
import { ChannelsToggle } from "./ChannelsToggle";
import { MapZoomControls } from "./MapZoomControls";

export interface NodeMapData {
  nodeId: string;
  nodeName: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  capacity?: number;
}

export interface NodeConnectionData {
  fromNodeId: string;
  toNodeId: string;
}

interface NodeNetworkMapProps {
  nodes: NodeMapData[];
  connections?: NodeConnectionData[];
  currentNodeId?: string;
  height?: string;
  mobileHeight?: string; // 移动端高度
  className?: string;
  title?: string;
  mock?: boolean; // Mock模式：对相同经纬度节点添加随机偏移
}

export default function NodeNetworkMap({
  nodes,
  connections = [],
  currentNodeId,
  height = "600px",
  mobileHeight,
  className = "",
  title = "Global Nodes Distribution",
  mock = false,
}: NodeNetworkMapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const router = useRouter();
  
  // 缓存节点偏移量，避免切换时节点乱跑
  const nodeOffsetsRef = useRef<Map<string, { lng: number; lat: number }>>(new Map());

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化图表（透明背景）
    chartInstance.current = echarts.init(chartRef.current, null, {
      renderer: "canvas",
      useDirtyRect: false, // 禁用脏矩形优化，确保所有元素都渲染
    });

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
      }
    } catch (error) {
      console.error("Failed to register world GeoJSON:", error);
    }
  }, []);

  useEffect(() => {
    // 如果没有节点数据，或者虽然有连接但还没加载完成（避免首次渲染时 connections 为空数组）
    if (!chartInstance.current || nodes.length === 0) {
      setMapLoaded(true);
      return;
    }

    // 监听地图的拖动和缩放事件，同步两个地图层
    const handleGeoRoam = () => {
      if (!chartInstance.current) return;
      
      // 使用 setTimeout 确保在 ECharts 更新后再同步
      setTimeout(() => {
        if (!chartInstance.current) return;
        const updatedOption = chartInstance.current.getOption() as echarts.EChartsOption;
        const updatedGeoOptions = updatedOption.geo as echarts.GeoComponentOption[];
        
        if (updatedGeoOptions && updatedGeoOptions.length >= 2) {
          const updatedMainGeo = updatedGeoOptions[1];
          
          if (updatedMainGeo.center && updatedMainGeo.zoom) {
            const [centerX, centerY] = updatedMainGeo.center as [number, number];
            
            // 同步阴影层，保持偏移
            chartInstance.current.setOption({
              geo: [
                {
                  center: [centerX, centerY + 5], // 阴影层保持偏移（主地图20，阴影25，差值为5）
                  zoom: updatedMainGeo.zoom,
                },
                null, // 主地图层不变
              ],
            }, { lazyUpdate: true });
          }
        }
      }, 0);
    };

    chartInstance.current.on('georoam', handleGeoRoam);

    // 保存当前的缩放和中心位置（如果已存在）
    let currentZoom: number | undefined;
    let currentCenter: [number, number] | undefined;
    const currentOption = chartInstance.current.getOption() as echarts.EChartsOption;
    const currentGeoOptions = currentOption?.geo as echarts.GeoComponentOption[] | undefined;
    if (currentGeoOptions && currentGeoOptions.length >= 2) {
      const mainGeo = currentGeoOptions[1];
      if (mainGeo?.zoom) {
        currentZoom = mainGeo.zoom as number;
      }
      if (mainGeo?.center) {
        currentCenter = mainGeo.center as [number, number];
      }
    }

    // 计算每个节点的 channel 数量
    const nodeChannelCount = new Map<string, number>();
    connections.forEach(conn => {
      nodeChannelCount.set(
        conn.fromNodeId,
        (nodeChannelCount.get(conn.fromNodeId) || 0) + 1
      );
      nodeChannelCount.set(
        conn.toNodeId,
        (nodeChannelCount.get(conn.toNodeId) || 0) + 1
      );
    });
    // 根据 channel 数量计算节点颜色的辅助函数
    const getNodeColor = (channelCount: number): string => {
      if (channelCount >= 40) return "#2F1C96"; // 40+
      if (channelCount >= 30) return "#5034C4"; // 30-39
      if (channelCount >= 20) return "#7459E6"; // 20-29
      if (channelCount >= 10) return "#B8A8F4"; // 10-19
      return "#E6E2FB"; // 0-9
    };

    // 转换节点数据为散点图数据
    // 先映射所有节点数据
    const rawScatterData = nodes
      .map(node => {
        const channelCount = nodeChannelCount.get(node.nodeId) || 0;
        console.log(
          nodeChannelCount.get(
            "0x0327541071dbe2b22b532cea104a781fa9cc61bf8e47d5216e48c8738e3f969351"
          ),
          getNodeColor(
            nodeChannelCount.get(
              "0x0327541071dbe2b22b532cea104a781fa9cc61bf8e47d5216e48c8738e3f969351"
            ) || 0
          )
        );

        return {
          name: `${node.nodeName || node.nodeId.slice(0, 8)}`,
          value: [node.longitude, node.latitude],
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          city: node.city,
          country: node.country,
          capacity: node.capacity,
          channelCount,
          nodeColor: getNodeColor(channelCount),
          isCurrentNode: node.nodeId === currentNodeId,
        };
      });

    const allNodeData = rawScatterData.filter(item => item.channelCount > 0);
    console.log('[NodeNetworkMap] channelCount为0过滤数量:', rawScatterData.length - allNodeData.length, '原始节点数:', rawScatterData.length);

    // 对相同经纬度的节点添加随机偏移，而不是去重
    const coordCountMap = new Map<string, number>();
    let nodeScatterData;
    
    if (mock) {
      // Mock模式：对相同经纬度的节点添加随机偏移
      console.log('[NodeNetworkMap] Mock模式：启用随机偏移');
      nodeScatterData = allNodeData.map(item => {
      const key = `${item.value[0]},${item.value[1]}`;
      const count = coordCountMap.get(key) || 0;
      coordCountMap.set(key, count + 1);

      // 如果是重复经纬度，添加随机偏移（50度范围内）
      if (count > 0) {
        const offsetRange = 50;
        // 检查缓存中是否已有该节点的偏移量
        let offset = nodeOffsetsRef.current.get(item.nodeId);
        if (!offset) {
          // 第一次遇到该节点，生成随机偏移量并缓存
          offset = {
            lng: (Math.random() - 0.5) * offsetRange,
            lat: (Math.random() - 0.5) * offsetRange,
          };
          nodeOffsetsRef.current.set(item.nodeId, offset);
        }
        return {
          ...item,
          value: [item.value[0] + offset.lng, item.value[1] + offset.lat] as [number, number],
        };
      }
      return item;
    });

      const duplicateCount = Array.from(coordCountMap.values()).filter(c => c > 1).reduce((sum, c) => sum + c - 1, 0);
      console.log('[NodeNetworkMap] 相同经纬度节点数（已添加偏移）:', duplicateCount, '最终节点数:', nodeScatterData.length);
    } else {
      // 正常模式：按经纬度去重，保留 channelCount 最多的节点
      console.log('[NodeNetworkMap] 正常模式：按经纬度去重');
      const coordMap = new Map<string, (typeof allNodeData)[0]>();
      allNodeData.forEach(item => {
        const key = `${item.value[0]},${item.value[1]}`;
        const existing = coordMap.get(key);
        if (!existing || item.channelCount > existing.channelCount) {
          coordMap.set(key, item);
        }
      });

      nodeScatterData = Array.from(coordMap.values());
      console.log('[NodeNetworkMap] 重复经纬度去重数量:', allNodeData.length - nodeScatterData.length, '最终节点数:', nodeScatterData.length);
    }
    console.log('[NodeNetworkMap] 前5个节点数据示例:', nodeScatterData.slice(0, 5).map(n => ({ name: n.name, value: n.value, channelCount: n.channelCount })));

    console.log(nodeScatterData, "nodeScatterData");
    // 创建节点ID到坐标的映射（使用偏移后的坐标）
    const nodeMap = new Map(
      nodeScatterData.map(node => [node.nodeId, node.value])
    );

    // 分组连线数据（按节点对分组，处理多条连线的情况）
    const connectionGroups = new Map<
      string,
      {
        coords: [[number, number], [number, number]];
        count: number;
        fromNodeId: string;
        toNodeId: string;
        node1Name: string;
        node2Name: string;
      }
    >();

    connections.forEach(conn => {
      if (!nodeMap.has(conn.fromNodeId) || !nodeMap.has(conn.toNodeId)) return;

      const coords1 = nodeMap.get(conn.fromNodeId)!;
      const coords2 = nodeMap.get(conn.toNodeId)!;
      const node1 = nodes.find(n => n.nodeId === conn.fromNodeId);
      const node2 = nodes.find(n => n.nodeId === conn.toNodeId);

      // 创建一致的节点对key（排序确保相同节点对有相同key）
      const nodePairKey = [conn.fromNodeId, conn.toNodeId].sort().join("|");

      if (connectionGroups.has(nodePairKey)) {
        connectionGroups.get(nodePairKey)!.count++;
      } else {
        connectionGroups.set(nodePairKey, {
          coords: [
            [coords1[0], coords1[1]],
            [coords2[0], coords2[1]],
          ],
          count: 1,
          fromNodeId: conn.fromNodeId,
          toNodeId: conn.toNodeId,
          node1Name: node1?.nodeName || conn.fromNodeId.slice(0, 8),
          node2Name: node2?.nodeName || conn.toNodeId.slice(0, 8),
        });
      }
    });

    const linesData = Array.from(connectionGroups.values());
    console.log('[NodeNetworkMap] 连线数据数量:', linesData.length, '原始连接数:', connections.length);
    // 打印 count 最大的前 10 条连线
    const topLines = [...linesData].sort((a, b) => b.count - a.count).slice(0, 10);
    console.log('[NodeNetworkMap] count最大的10条连线:', topLines.map(l => ({ from: l.node1Name, to: l.node2Name, count: l.count })));

    // 生成连线系列和图例数据（根据连接数量分组）
    const baseColor = "#59ABE6"; // 蓝色连线
    const connectionRanges = [
      { min: 1, max: 1, width: 0.5, opacity: 0.15, label: "1 Channel" },
      { min: 2, max: 3, width: 1, opacity: 0.25, label: "2-3 Channels" },
      { min: 4, max: 6, width: 1.5, opacity: 0.4, label: "4-6 Channels" },
      { min: 7, max: 9, width: 2, opacity: 0.6, label: "7-9 Channels" },
      {
        min: 10,
        max: Infinity,
        width: 3,
        opacity: 0.8,
        label: "10+ Channels",
      },
    ];

    const lineSeries: echarts.LinesSeriesOption[] = [];
    const legendData: string[] = [`Nodes (${nodeScatterData.length})`];

    connectionRanges.forEach(range => {
      const filteredData = linesData.filter(
        line => line.count >= range.min && line.count <= range.max
      );

      if (filteredData.length > 0) {
        const seriesName = `${range.label} (${filteredData.length})`;
        console.log(`[NodeNetworkMap] ${seriesName} - width: ${range.width}`);
        lineSeries.push({
          name: seriesName,
          type: "lines",
          coordinateSystem: "geo",
          geoIndex: 1, // 使用主地图层
          zlevel: 2, // 设置在地图层之上
          data: filteredData.map(line => ({
            coords: line.coords,
            value: line.count,
            channelCount: line.count,
            node1Name: line.node1Name,
            node2Name: line.node2Name,
          })),
          lineStyle: {
            color: baseColor,
            width: range.width,
            opacity: range.opacity,
            curveness: 0,
            type: 'solid',
          },
          emphasis: {
            lineStyle: {
              width: range.width + 1,
            },
          },
          silent: false,
          progressive: 0,
          progressiveThreshold: 9999,
        });
        legendData.push(seriesName);
      }
    });

    // 使用保存的缩放和中心位置，如果不存在则使用默认值
    // 根据屏幕宽度判断是否为移动端，只在移动端将地图中心往上移
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const zoom = currentZoom ?? 1.2;
    const mainCenter = currentCenter ?? (isMobile ? [0, -15] : [0, 0]); // 移动端向上移动，桌面端和平板不移动
    const shadowCenter: [number, number] = currentCenter 
      ? [currentCenter[0], currentCenter[1] + 5] 
      : (isMobile ? [0, -10] : [0, 5]); // 阴影层对应调整

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: false, // 全局禁用动画
      title: title
        ? {
            text: title,
            left: "center",
            textStyle: {
              color: "var(--foreground)",
              fontSize: 16,
              fontWeight: "normal",
            },
          }
        : undefined,
      geo: [
        // 阴影地图层（底层）
        {
          map: "world",
          roam: true,
          zoom: zoom,
          center: shadowCenter, // 向下偏移以创建阴影效果
          zlevel: 0,
          silent: true, // 禁用交互
          itemStyle: {
            borderColor: "transparent",
            borderWidth: 0,
            areaColor: "rgba(0, 0, 0, 0.04)", // 增加不透明度使阴影更明显
          },
          emphasis: {
            disabled: true,
          },
          select: {
            disabled: true,
          },
          tooltip: {
            show: false,
          },
          label: {
            show: false,
          },
        },
        // 主地图层（上层）
        {
          map: "world",
          roam: true,
          zoom: zoom,
          center: mainCenter,
          zlevel: 1,
          itemStyle: {
            borderColor: "#D9D9D9",
            borderWidth: 1,
            areaColor: "#FFFFFF",
          },
          emphasis: {
            itemStyle: {
              areaColor: "#D5CDF7",
              borderColor: "#88899E",
            },
            label: {
              show: false,
            },
          },
          select: {
            itemStyle: {
              areaColor: "#D5CDF7",
              borderColor: "#88899E",
            },
          },
          tooltip: {
            show: false,
          },
          label: {
            show: false,
          },
        },
      ],
      // visualMap: {
      //   min: 0,
      //   max: 50,
      //   left: "left",
      //   top: "center",
      //   text: ["50+", "0"],
      //   textStyle: {
      //     color: "var(--text-primary)",
      //     fontSize: 10,
      //   },
      //   pieces: [
      //     { min: 0, max: 10, color: "#E6E2FB" },
      //     { min: 10, max: 20, color: "#B8A8F4" },
      //     { min: 20, max: 30, color: "#7459E6" },
      //     { min: 30, max: 40, color: "#5034C4" },
      //     { min: 40, max: 50, color: "#2F1C96" },
      //     { min: 50, color: "#2F1C96" },
      //   ],
      //   show: true,
      //   orient: "vertical",
      //   itemWidth: 20,
      //   itemHeight: 20,
      //   seriesIndex: [], // 不应用到任何系列，仅作为图例显示
      // },

      tooltip: {
        trigger: "item",
        backgroundColor: "var(--surface-popover)",
        borderColor: "#FFFFFF",
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        textStyle: {
          color: "var(--text-primary)",
        },
        confine: true,
        extraCssText: "box-shadow: 0px 4px 6px 0px rgba(0,0,0,0.08);",
        formatter: (params: unknown) => {
          const param = params as {
            componentType: string;
            seriesType: string;
            seriesName?: string;
            name: string;
            value: [number, number, number] | number;
            data?: {
              nodeId?: string;
              nodeName?: string;
              city?: string;
              country?: string;
              capacity?: number;
              isCurrentNode?: boolean;
              channelCount?: number;
              node1Name?: string;
              node2Name?: string;
            };
          };

          // 连线 tooltip
          if (
            param.seriesType === "lines" &&
            param.data?.node1Name &&
            param.data?.node2Name
          ) {
            return `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <div style="color: var(--text-primary); font-size: 12px; font-weight: 700; line-height: 16px;">Channel Connection</div>
                  <div style="color: var(--text-tertiary); font-size: 12px; font-weight: 500; line-height: 16px;">${param.data.node1Name} ↔ ${param.data.node2Name}</div>
                  <div style="color: var(--text-tertiary); font-size: 12px; font-weight: 500; line-height: 16px;">${param.data.channelCount} channels</div>
                </div>
              </div>
            `;
          }

          // 节点 tooltip
          if (param.seriesType === "scatter" && param.data) {
            const location = [param.data.city, param.data.country]
              .filter(Boolean)
              .join(", ");
            const channelCount =
              nodeChannelCount.get(param.data.nodeId || "") || 0;
            const shortNodeId = param.data.nodeId ? 
              `${param.data.nodeId.slice(0, 7)}...${param.data.nodeId.slice(-4)}` : 
              "";
            
            return `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <div style="color: var(--text-primary); font-size: 12px; font-weight: 700; line-height: 16px;">${param.data.nodeName || param.name}</div>
                  ${shortNodeId ? `<div style="color: var(--purple); font-size: 12px; font-weight: 500; line-height: 16px;">${shortNodeId}</div>` : ""}
                  <div style="color: var(--text-tertiary); font-size: 12px; font-weight: 500; line-height: 16px;">${channelCount} channels</div>
                </div>
                ${location ? `
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 6.90909C13 10.7273 8 14 8 14C8 14 3 10.7273 3 6.90909C3 5.60712 3.52678 4.35847 4.46447 3.43784C5.40215 2.51721 6.67392 2 8 2C9.32608 2 10.5979 2.51721 11.5355 3.43784C12.4732 4.35847 13 5.60712 13 6.90909Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M8 8.54545C8.92047 8.54545 9.66667 7.81283 9.66667 6.90909C9.66667 6.00535 8.92047 5.27273 8 5.27273C7.07953 5.27273 6.33333 6.00535 6.33333 6.90909C6.33333 7.81283 7.07953 8.54545 8 8.54545Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <div style="color: var(--text-primary); font-size: 12px; font-weight: 500; line-height: 16px;">${location}</div>
                  </div>
                ` : ""}
              </div>
            `;
          }

          return param.name;
        },
      },

      series: [
        // 连线系列（仅在 showChannels 为 true 时显示）
        ...(showChannels ? (lineSeries as echarts.SeriesOption[]) : []),
        // 节点散点
        {
          name: `Nodes (${nodeScatterData.length})`,
          type: "scatter",
          coordinateSystem: "geo",
          geoIndex: 1, // 使用主地图层
          zlevel: 3, // 节点在最上层
          z: 3, // 提高z-index确保在最上层
          data: nodeScatterData,
          symbolSize: (value: unknown, params: unknown) => {
            const p = params as { data?: { channelCount?: number } };
            const channelCount = p.data?.channelCount || 0;
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            
            // 移动端节点统一缩小
            if (isMobile) {
              if (channelCount >= 40) return 12;
              if (channelCount >= 30) return 10;
              if (channelCount >= 20) return 9;
              if (channelCount >= 10) return 6;
              return 8;
            }
            
            // 桌面端和平板保持原大小
            if (channelCount >= 40) return 16;
            if (channelCount >= 30) return 14;
            if (channelCount >= 20) return 12;
            if (channelCount >= 10) return 8;
            return 12;
          },
          large: false, // 禁用大数据模式
          largeThreshold: 9999, // 设置很大的阈值
          progressive: 0, // 禁用渐进式渲染
          progressiveThreshold: 9999, // 设置很大的阈值
          animation: false, // 禁用动画，确保一次性渲染所有点
          clip: false, // 不裁剪
          itemStyle: {
            borderColor: "#FFFFFF",
            borderWidth: 1,
            // color: '#E6E2FB'
            color: (params: unknown) => {
              const p = params as { data?: { nodeColor?: string } };
              return p.data?.nodeColor || "#E6E2FB";
            },
          },
          emphasis: {
            itemStyle: {
              borderColor: "#FFFFFF",
              borderWidth: 2,
              shadowBlur: 8,
              shadowColor: "rgba(47, 28, 150, 0.4)",
            },
            scale: 1.2,
          },
          silent: false,
          tooltip: {
            show: true,
          },
        },
      ],
    };

    console.log('[NodeNetworkMap] 连线系列数量:', lineSeries.length, '节点系列: 1', '总系列数:', lineSeries.length + 1);
    console.log('[NodeNetworkMap] 传给 ECharts 的节点数据数量:', nodeScatterData.length);
    chartInstance.current.setOption(option, {
      notMerge: true, // 不合并配置，完全替换
      lazyUpdate: false,
    });
    setMapLoaded(true);

    // 添加点击事件处理
    const handleNodeClick = (params: unknown) => {
      const param = params as {
        componentType: string;
        seriesType: string;
        data?: {
          nodeId?: string;
        };
      };

      // 只处理散点图的点击事件
      if (param.seriesType === "scatter" && param.data?.nodeId) {
        const nodeId = param.data.nodeId;
        router.push(`/node/${encodeURIComponent(nodeId)}`);
      }
    };

    chartInstance.current.on('click', handleNodeClick);

    // 清理事件监听
    return () => {
      if (chartInstance.current) {
        chartInstance.current.off('georoam');
        chartInstance.current.off('click', handleNodeClick);
      }
    };
  }, [nodes, connections, currentNodeId, title, showChannels, router]);

  // 缩放控制函数
  const handleZoomIn = () => {
    if (chartInstance.current) {
      const option = chartInstance.current.getOption() as echarts.EChartsOption;
      const currentZoom = (option.geo as echarts.GeoComponentOption[])?.[0]?.zoom || 1.2;
      const newZoom = Math.min(currentZoom * 1.2, 10); // 最大放大10倍
      chartInstance.current.setOption({
        geo: [
          { zoom: newZoom }, // 阴影层
          { zoom: newZoom }, // 主地图层
        ],
      });
    }
  };

  const handleZoomOut = () => {
    if (chartInstance.current) {
      const option = chartInstance.current.getOption() as echarts.EChartsOption;
      const currentZoom = (option.geo as echarts.GeoComponentOption[])?.[0]?.zoom || 1.2;
      const newZoom = Math.max(currentZoom / 1.2, 0.5); // 最小缩小到0.5倍
      chartInstance.current.setOption({
        geo: [
          { zoom: newZoom }, // 阴影层
          { zoom: newZoom }, // 主地图层
        ],
      });
    }
  };

  return (
    <div style={{ position: "relative" }} className={className}>
      {/* ECharts 图层（地图、节点和连线） */}
      <div
        ref={chartRef}
        style={{
          height: mobileHeight && typeof window !== 'undefined' && window.innerWidth < 768 ? mobileHeight : height,
          position: "relative",
          // filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.01))",
        }}
        className="w-full"
      />

      {/* 移动端左下角：Show channels 按钮 */}
      <div className="absolute left-1 z-10 md:hidden" style={{ bottom: '68px' }}>
        <ChannelsToggle 
          showChannels={showChannels} 
          onToggle={() => setShowChannels(!showChannels)} 
        />
      </div>

      {/* 移动端右下角：缩放控件 */}
      <div className="absolute right-1 z-10 md:hidden" style={{ bottom: '68px' }}>
        <MapZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      </div>

      {/* 移动端底部：图例 */}
      <div className="absolute bottom-1 left-1 right-1 z-10 md:hidden">
        <ChannelsLegend />
      </div>

      {/* 桌面端左下角控件（图例 + Toggle）*/}
      <div className="hidden md:flex absolute left-4 bottom-4 z-10 flex-col gap-2">
        <ChannelsLegend />
        <ChannelsToggle 
          showChannels={showChannels} 
          onToggle={() => setShowChannels(!showChannels)} 
        />
      </div>

      {/* 桌面端右下角缩放控制 */}
      <div className="hidden md:block absolute right-4 bottom-4 z-10">
        <MapZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      </div>

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-muted-foreground">Loading map...</div>
        </div>
      )}
    </div>
  );
}
