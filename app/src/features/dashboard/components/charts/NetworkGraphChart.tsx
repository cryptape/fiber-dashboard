"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as echarts from "echarts";
import { RustNodeInfo, RustChannelInfo } from "../../../../lib/types";
import { formatCompactNumber } from "../../../../lib/utils";

interface NetworkGraphChartProps {
  nodes: RustNodeInfo[];
  channels: RustChannelInfo[];
  height?: string;
  className?: string;
  maxNodes?: number;
  maxChannels?: number;
}

// Type interfaces for ECharts data objects
interface NodeData {
  nodeId: string;
  nodeName: string;
  formattedCapacity: string;
  totalChannels: number;
  [key: string]: unknown;
}

interface EdgeData {
  node1Name: string;
  node2Name: string;
  channelCount?: number;
  capacity?: number;
  channelIndex?: number;
  totalChannelsForPair?: number;
  isPlaceholderConnection?: boolean;
  [key: string]: unknown;
}

export default function NetworkGraphChart({
  nodes,
  channels,
  height = "600px",
  className = "",
  maxNodes = 500, // Show more nodes and connections
  maxChannels = 10000, // Temporarily increase to see if this is the bottleneck
}: NetworkGraphChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart with performance optimizations
    chartInstance.current = echarts.init(chartRef.current, null, {
      renderer: "canvas",
      useDirtyRect: true, // Enable dirty rect optimization
      devicePixelRatio: Math.min(window.devicePixelRatio, 2), // Limit high DPI impact
    });

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

  // Enhanced capacity parsing utility
  const parseChannelCapacityToCKB = useCallback(
    (capacity: string | number): number => {
      const {
        u128LittleEndianToDecimal,
        hexToDecimal,
      } = require("../../../../lib/utils");
      const SHANNONS_PER_CKB = 100000000;

      try {
        const capacityInShannons =
          typeof capacity === "string"
            ? capacity.startsWith("0x") && capacity.length === 34
              ? u128LittleEndianToDecimal(capacity)
              : hexToDecimal(capacity)
            : BigInt(capacity);
        return Number(capacityInShannons) / SHANNONS_PER_CKB;
      } catch (error) {
        console.warn("Error parsing capacity:", error, capacity);
        return 0;
      }
    },
    []
  );

  // Optimized node data processing with performance focus
  const nodeGraphData = useMemo(() => {
    // Pre-filter channels to reduce processing load
    const limitedChannels = channels.slice(0, maxChannels);

    const nodeCapacity = new Map<string, number>();
    const nodeChannelCount = new Map<string, number>();
    const nodeConnections = new Map<string, number>(); // Use count instead of Set for better performance

    // Single pass through channels for all metrics
    limitedChannels.forEach(channel => {
      try {
        const capacityInCKB = parseChannelCapacityToCKB(channel.capacity);

        // Track capacity (simplified calculation)
        nodeCapacity.set(
          channel.node1,
          (nodeCapacity.get(channel.node1) || 0) + capacityInCKB * 0.5
        );
        nodeCapacity.set(
          channel.node2,
          (nodeCapacity.get(channel.node2) || 0) + capacityInCKB * 0.5
        );

        // Track channel count
        nodeChannelCount.set(
          channel.node1,
          (nodeChannelCount.get(channel.node1) || 0) + 1
        );
        nodeChannelCount.set(
          channel.node2,
          (nodeChannelCount.get(channel.node2) || 0) + 1
        );

        // Track connections count (simplified)
        nodeConnections.set(
          channel.node1,
          (nodeConnections.get(channel.node1) || 0) + 1
        );
        nodeConnections.set(
          channel.node2,
          (nodeConnections.get(channel.node2) || 0) + 1
        );
      } catch {
        // Silent fail for performance
      }
    });

    // Get top nodes by channel count
    const topNodes = nodes
      .filter(
        node =>
          nodeChannelCount.has(node.node_id) &&
          nodeChannelCount.get(node.node_id)! > 0
      )
      .sort(
        (a, b) =>
          (nodeChannelCount.get(b.node_id) || 0) -
          (nodeChannelCount.get(a.node_id) || 0)
      )
      .slice(0, maxNodes);

    // Include ALL nodes that are connected to our top nodes (to show all their channels)
    const topNodeIds = new Set(topNodes.map(node => node.node_id));
    const additionalConnectedNodeIds = new Set<string>();

    // Find all nodes connected to top nodes
    channels.forEach(channel => {
      if (topNodeIds.has(channel.node1)) {
        additionalConnectedNodeIds.add(channel.node2);
      }
      if (topNodeIds.has(channel.node2)) {
        additionalConnectedNodeIds.add(channel.node1);
      }
    });

    // Combine top nodes with their connected nodes (no size limit on final set)
    const allConnectedNodeIds = new Set([
      ...topNodeIds,
      ...additionalConnectedNodeIds,
    ]);

    // Debug: Check what's happening with node filtering
    console.log(`All connected node IDs count: ${allConnectedNodeIds.size}`);
    console.log(`Nodes array length: ${nodes.length}`);

    // Handle missing nodes by creating placeholder nodes
    const missingNodeIds = [...allConnectedNodeIds].filter(
      nodeId => !nodes.some(node => node.node_id === nodeId)
    );
    console.log(
      `Missing node IDs (in channels but not in nodes array): ${missingNodeIds.length}`
    );

    // Create placeholder nodes for missing node IDs
    const placeholderNodes: RustNodeInfo[] = missingNodeIds.map(nodeId => ({
      node_id: nodeId,
      node_name: `Unknown-${nodeId.slice(-8)}`, // Use last 8 chars for readability
      addresses: [],
      commit_timestamp: "",
      announce_timestamp: "",
      chain_hash: "",
      auto_accept_min_ckb_funding_amount: "0",
      country: "Unknown",
      city: "Unknown",
      region: "Unknown",
      loc: "Unknown",
    }));

    // Combine real nodes with placeholder nodes
    const allNodes = [...nodes, ...placeholderNodes];
    const connectedNodes = allNodes.filter(node =>
      allConnectedNodeIds.has(node.node_id)
    );

    console.log(
      `Connected nodes after adding placeholders: ${connectedNodes.length}`
    );

    // Debug: Check if placeholders have channels
    if (placeholderNodes.length > 0) {
      const samplePlaceholder = placeholderNodes[0];
      console.log(`Sample placeholder node: ${samplePlaceholder.node_name}`);
    }

    // Recalculate channel counts for ALL nodes (including placeholders)
    const allNodeChannelCount = new Map<string, number>();
    const allNodeCapacity = new Map<string, number>();
    const allNodeConnections = new Map<string, number>();

    channels.forEach(channel => {
      try {
        const capacityInCKB = parseChannelCapacityToCKB(channel.capacity);

        // Count for node1
        allNodeChannelCount.set(
          channel.node1,
          (allNodeChannelCount.get(channel.node1) || 0) + 1
        );
        allNodeCapacity.set(
          channel.node1,
          (allNodeCapacity.get(channel.node1) || 0) + capacityInCKB * 0.5
        );
        allNodeConnections.set(
          channel.node1,
          (allNodeConnections.get(channel.node1) || 0) + 1
        );

        // Count for node2
        allNodeChannelCount.set(
          channel.node2,
          (allNodeChannelCount.get(channel.node2) || 0) + 1
        );
        allNodeCapacity.set(
          channel.node2,
          (allNodeCapacity.get(channel.node2) || 0) + capacityInCKB * 0.5
        );
        allNodeConnections.set(
          channel.node2,
          (allNodeConnections.get(channel.node2) || 0) + 1
        );
      } catch {
        // Silent fail for performance
      }
    });

    // Debug: Check if placeholders now have channel counts
    if (placeholderNodes.length > 0) {
      const samplePlaceholder = placeholderNodes[0];
      const channelCount =
        allNodeChannelCount.get(samplePlaceholder.node_id) || 0;
      console.log(
        `Sample placeholder ${samplePlaceholder.node_name} has ${channelCount} channels`
      );
    }

    // Pre-calculate statistics for normalization (using updated counts)
    let maxCapacity = 1;
    let maxChannelCount = 1;

    for (const capacity of allNodeCapacity.values()) {
      if (capacity > maxCapacity) maxCapacity = capacity;
    }
    for (const count of allNodeChannelCount.values()) {
      if (count > maxChannelCount) maxChannelCount = count;
    }

    // Process connected nodes (colorful network) using updated counts
    const connectedNodeData = connectedNodes.map(node => {
      const totalCapacity = allNodeCapacity.get(node.node_id) || 0;
      const totalChannels = allNodeChannelCount.get(node.node_id) || 0; // Use updated count including placeholders
      const connections = allNodeConnections.get(node.node_id) || 0;

      // Simplified importance calculation
      const capacityRatio = totalCapacity / maxCapacity;
      const channelRatio = totalChannels / maxChannelCount;
      const importanceScore = Math.max(capacityRatio, channelRatio);

      // Node size based on channel count
      let symbolSize;
      if (totalChannels === 1) {
        symbolSize = 6;
      } else if (totalChannels <= 3) {
        symbolSize = 10;
      } else if (totalChannels <= 6) {
        symbolSize = 15;
      } else if (totalChannels <= 10) {
        symbolSize = 22;
      } else {
        symbolSize = 30;
      }

      // Random colorful colors for connected nodes
      const colors = [
        "#ff6b6b",
        "#4ecdc4",
        "#45b7d1",
        "#96ceb4",
        "#feca57",
        "#ff9ff3",
        "#54a0ff",
        "#5f27cd",
        "#00d2d3",
        "#ff9f43",
        "#10ac84",
        "#ee5253",
        "#0abde3",
        "#3742fa",
        "#2f3542",
        "#ff3838",
        "#ff9500",
        "#ffdd59",
        "#3ae374",
        "#17c0eb",
        "#7158e2",
        "#3d4466",
        "#f8b500",
        "#78e08f",
        "#82ccdd",
      ];

      const nodeIdHash = node.node_id.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      const getNodeColor = () => colors[Math.abs(nodeIdHash) % colors.length];

      return {
        id: node.node_id,
        name: node.node_name,
        value: totalCapacity,
        symbolSize,
        category: 0, // Connected nodes category
        nodeId: node.node_id,
        nodeName: node.node_name,
        city: node.city || "Unknown",
        country: node.country || "Unknown",
        totalCapacity,
        totalChannels,
        connections,
        importanceScore,
        formattedCapacity: formatCompactNumber(totalCapacity),
        isConnected: true,
        itemStyle: {
          color: getNodeColor(),
          shadowBlur: symbolSize > 15 ? 8 : 4,
          shadowColor: getNodeColor(),
          borderWidth: symbolSize > 15 ? 2 : 1,
          borderColor: "#ffffff",
          opacity: 0.85,
        },
      };
    });

    // Only return connected nodes - unconnected nodes will be shown as a gray area
    return connectedNodeData;
  }, [nodes, channels, parseChannelCapacityToCKB, maxNodes, maxChannels]);

  // Individual channel processing - draw each channel as separate line
  const channelGraphData = useMemo(() => {
    // Create a set of ALL connected node IDs (including placeholders) for quick lookup
    const filteredNodeIds = new Set(nodeGraphData.map(node => node.id));

    // IMPORTANT: Also add any placeholder node IDs that might not be in nodeGraphData yet
    // This ensures channels to placeholder nodes are displayed
    channels.forEach(channel => {
      // If a channel endpoint exists but isn't in nodeGraphData, we need to include it
      if (!filteredNodeIds.has(channel.node1)) {
        filteredNodeIds.add(channel.node1);
      }
      if (!filteredNodeIds.has(channel.node2)) {
        filteredNodeIds.add(channel.node2);
      }
    });

    // Create a node map with ALL nodes (including any missing ones from channels)
    const nodeMap = new Map();

    // Add all original nodes
    for (const node of nodes) {
      nodeMap.set(node.node_id, {
        name: node.node_name,
        country: node.country || "Unknown",
      });
    }

    // Add placeholder entries for any missing node IDs referenced in channels
    channels.forEach(channel => {
      if (!nodeMap.has(channel.node1)) {
        nodeMap.set(channel.node1, {
          name: `Unknown-${channel.node1.slice(-8)}`,
          country: "Unknown",
        });
      }
      if (!nodeMap.has(channel.node2)) {
        nodeMap.set(channel.node2, {
          name: `Unknown-${channel.node2.slice(-8)}`,
          country: "Unknown",
        });
      }
    });

    // Colors for consistent node pair coloring
    const edgeColors = [
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#feca57",
      "#ff9ff3",
      "#54a0ff",
      "#5f27cd",
      "#00d2d3",
      "#ff9f43",
      "#10ac84",
      "#ee5253",
      "#0abde3",
      "#3742fa",
      "#2f3542",
      "#ff3838",
      "#ff9500",
      "#ffdd59",
      "#3ae374",
      "#17c0eb",
      "#7158e2",
      "#3d4466",
      "#f8b500",
      "#78e08f",
      "#82ccdd",
      "#ff6348",
      "#2ed573",
      "#1e90ff",
      "#ffa502",
      "#7bed9f",
    ];

    // Group channels by node pairs to assign consistent colors and calculate offsets
    const nodePairColors = new Map<string, string>();
    const channelsByPair = new Map<string, RustChannelInfo[]>();

    // Filter channels to only include those between our connected nodes
    const validChannels = channels.filter(
      channel =>
        filteredNodeIds.has(channel.node1) && filteredNodeIds.has(channel.node2)
    );

    // Debug: Check how many channels are valid now
    console.log(
      `Total channels: ${channels.length}, Valid channels: ${validChannels.length}`
    );

    // Process all valid channels (no artificial limit)
    const limitedChannels = validChannels;

    // First pass: group channels by node pairs
    limitedChannels.forEach(channel => {
      if (channel.node1 === channel.node2) return;

      const nodePairKey = [channel.node1, channel.node2].sort().join("|");

      if (!channelsByPair.has(nodePairKey)) {
        channelsByPair.set(nodePairKey, []);
      }
      channelsByPair.get(nodePairKey)!.push(channel);

      // Assign consistent color for this node pair
      if (!nodePairColors.has(nodePairKey)) {
        const connectionHash = nodePairKey.split("").reduce((a, b) => {
          a = (a << 5) - a + b.charCodeAt(0);
          return a & a;
        }, 0);
        nodePairColors.set(
          nodePairKey,
          edgeColors[Math.abs(connectionHash) % edgeColors.length]
        );
      }
    });

    // Second pass: create individual lines with offsets
    const individualChannels: Array<{
      source: string;
      target: string;
      capacity: number;
      node1Name: string;
      node2Name: string;
      color: string;
      curveness: number;
      channelIndex: number;
      totalChannelsForPair: number;
      isPlaceholderConnection: boolean;
    }> = [];

    channelsByPair.forEach((channelsForPair, nodePairKey) => {
      const [node1Id, node2Id] = nodePairKey.split("|");
      const node1 = nodeMap.get(node1Id);
      const node2 = nodeMap.get(node2Id);

      if (!node1 || !node2) return;

      const color = nodePairColors.get(nodePairKey)!;
      const totalChannels = channelsForPair.length;

      channelsForPair.forEach((channel, index) => {
        // Calculate curveness for each individual channel
        let curveness = 0;
        if (totalChannels > 1) {
          // Spread channels in an arc pattern
          const maxCurve = 0.5;
          const step = (maxCurve * 2) / Math.max(totalChannels - 1, 1);
          curveness = -maxCurve + index * step;
        }

        // Check if either endpoint is a placeholder node (missing from original nodes array)
        const isNode1Placeholder = !nodes.some(
          n => n.node_id === channel.node1
        );
        const isNode2Placeholder = !nodes.some(
          n => n.node_id === channel.node2
        );
        const isPlaceholderConnection =
          isNode1Placeholder || isNode2Placeholder;

        individualChannels.push({
          source: channel.node1,
          target: channel.node2,
          capacity: parseChannelCapacityToCKB(channel.capacity),
          node1Name: node1.name,
          node2Name: node2.name,
          color,
          curveness,
          channelIndex: index,
          totalChannelsForPair: totalChannels,
          isPlaceholderConnection, // Flag to identify channels to/from placeholder nodes
        });
      });
    });

    return individualChannels;
  }, [channels, nodes, parseChannelCapacityToCKB, nodeGraphData]);

  // Count unconnected nodes for display
  const unconnectedNodesCount = useMemo(() => {
    const connectedNodeIds = new Set(nodeGraphData.map(node => node.id));
    return nodes.filter(node => !connectedNodeIds.has(node.node_id)).length;
  }, [nodes, nodeGraphData]);

  // Optimized series generation
  const networkSeries = useMemo(() => {
    const categories = [
      { name: "Connected Nodes", itemStyle: { color: "#ff6b6b" } },
    ];

    const links = channelGraphData.map(channel => ({
      source: channel.source,
      target: channel.target,
      value: 1, // Each line represents one channel
      capacity: channel.capacity,
      node1Name: channel.node1Name,
      node2Name: channel.node2Name,
      channelIndex: channel.channelIndex,
      totalChannelsForPair: channel.totalChannelsForPair,
      isPlaceholderConnection: channel.isPlaceholderConnection,
      lineStyle: {
        color: channel.color,
        width: 2, // Fixed width for each individual channel
        opacity: channel.isPlaceholderConnection ? 0.5 : 0.7, // Lower opacity for placeholder connections
        curveness: channel.curveness,
        cap: "round" as const,
        // Add dashed line style for placeholder connections
        ...(channel.isPlaceholderConnection && {
          type: "dashed" as const,
        }),
      },
      emphasis: {
        lineStyle: {
          width: 4,
          opacity: channel.isPlaceholderConnection ? 0.7 : 0.9,
        },
      },
    }));

    return {
      name: "Lightning Network",
      type: "graph" as const,
      layout: "force" as const,
      data: nodeGraphData,
      links,
      categories,
      roam: true,
      draggable: true,
      focusNodeAdjacency: true,
      scaleLimit: {
        min: 0.2,
        max: 5,
      },
      // Ensure line widths don't scale with zoom
      zoom: 1,

      label: {
        show: false, // Disable labels for better performance
      },

      edgeLabel: {
        show: false, // Disable edge labels for better performance
      },

      emphasis: {
        focus: "adjacency" as const,
        itemStyle: {
          shadowBlur: 10, // Reduced for performance
          borderWidth: 2,
        },
        lineStyle: {
          width: 4, // Reduced for performance
          shadowBlur: 0, // Disabled for performance
        },
      },

      force: {
        initLayout: "circular" as const,
        repulsion: 100, // Simplified repulsion
        gravity: 0.1,
        edgeLength: 50, // Fixed edge length for performance
        layoutAnimation: true,
        friction: 0.8, // Higher friction for faster convergence
      },

      animation: false, // Disable animation for better performance
      progressive: 100, // Increased for better performance
      progressiveThreshold: 200, // Reduced threshold
    };
  }, [channelGraphData, nodeGraphData]);

  useEffect(() => {
    if (!chartInstance.current || !nodes.length) {
      setMapLoaded(true);
      return;
    }

    const totalChannels = channelGraphData.length; // Each item is now an individual channel
    const totalCapacity = nodeGraphData.reduce(
      (sum, node) => sum + node.totalCapacity,
      0
    );

    console.log(
      `Rendering enhanced network: ${nodeGraphData.length} nodes, ${totalChannels} channels, ${formatCompactNumber(totalCapacity)} CKB capacity`
    );

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",

      title: {
        text: `Lightning Network Graph`,
        left: "center",
        top: 20,
        textStyle: {
          color: "var(--foreground)",
          fontSize: 16, // Smaller font for performance
          fontWeight: "bold" as const,
        },
        subtext: `${nodeGraphData.length} connected • ${totalChannels} channels • ${unconnectedNodesCount} unconnected`,
        subtextStyle: {
          color: "var(--muted-foreground)",
          fontSize: 11,
        },
      },

      // Remove legend for better performance
      legend: {
        show: false,
      },

      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        textStyle: {
          color: "#1f2937",
          fontSize: 12,
        },
        extraCssText: `
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          backdrop-filter: blur(10px);
        `,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          if (
            params.dataType === "node" &&
            params.data &&
            typeof params.data === "object"
          ) {
            const node = params.data as NodeData;
            return `
              <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.4;">
                <div style="font-weight: 600; margin-bottom: 8px; color: #1f2937; font-size: 14px;">
                  ${node.nodeName || "Unknown"}
                </div>
                <div style="margin-bottom: 4px; color: #4b5563; font-size: 12px;">
                  <strong>Capacity:</strong> ${node.formattedCapacity || "0"} CKB
                </div>
                <div style="color: #4b5563; font-size: 12px;">
                  <strong>Channels:</strong> ${node.totalChannels || 0}
                </div>
                <div style="color: #6b7280; font-size: 11px; font-weight: 500; margin-top: 4px;">
                  ⚡ Node size = Channel count
                </div>
              </div>
            `;
          }

          if (
            params.dataType === "edge" &&
            params.data &&
            typeof params.data === "object"
          ) {
            const edge = params.data as EdgeData;
            const isPlaceholder = edge.isPlaceholderConnection;
            return `
              <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.4; ${isPlaceholder ? "border-left: 3px solid #f59e0b; padding-left: 8px;" : ""}">
                <div style="font-weight: 600; margin-bottom: 8px; color: #1f2937; font-size: 14px;">
                  ${isPlaceholder ? "⚠️ Uncertain Channel" : "Individual Channel"}
                </div>
                <div style="margin-bottom: 6px; color: #4b5563; font-size: 12px;">
                  ${edge.node1Name || "Unknown"} ↔ ${edge.node2Name || "Unknown"}
                </div>
                <div style="margin-bottom: 4px; color: #1f2937; font-size: 13px;">
                  <strong style="color: #dc2626;">💰 Capacity: ${formatCompactNumber(edge.capacity || 0)} CKB</strong>
                </div>
                <div style="margin-bottom: 4px; color: #4b5563; font-size: 12px;">
                  Channel ${(edge.channelIndex || 0) + 1} of ${edge.totalChannelsForPair || 1}
                </div>
                <div style="color: #6b7280; font-size: 11px; font-weight: 500;">
                  ⚡ Each line = 1 channel
                </div>
                ${
                  isPlaceholder
                    ? `
                  <div style="color: #f59e0b; font-size: 10px; margin-top: 6px; font-style: italic;">
                    ⚠️ Node data not found - channel may be uncertain
                  </div>
                `
                    : ""
                }
              </div>
            `;
          }
          return "";
        },
        confine: true,
      },

      graphic: [
        {
          type: "group",
          right: 60,
          top: 60,
          children: [],
        },
      ],

      series: [networkSeries],
    };

    chartInstance.current.setOption(option, false); // Use notMerge=false for better performance
    setMapLoaded(true);

    // Add click event for node selection (only once)
    chartInstance.current.off("click"); // Remove previous listeners
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chartInstance.current.on("click", (params: any) => {
      if (
        params.dataType === "node" &&
        params.data &&
        typeof params.data === "object" &&
        "nodeId" in params.data
      ) {
        setSelectedNode((params.data as NodeData).nodeId);
      }
    });
  }, [
    nodeGraphData,
    channelGraphData,
    nodes.length,
    networkSeries,
    unconnectedNodesCount,
  ]);

  return (
    <div className="relative">
      {/* Main chart */}
      <div ref={chartRef} style={{ height }} className={className} />

      {/* Loading state */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-muted-foreground">
              Analyzing network topology...
            </div>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      {mapLoaded && (
        <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border text-xs">
          <div className="font-medium mb-1">Network Stats</div>
          <div>
            Showing {nodeGraphData.length}/{nodes.length} nodes
          </div>
          <div>Connections: {channelGraphData.length}</div>
          {selectedNode && (
            <div className="mt-2 pt-2 border-t">
              <div className="font-medium">Selected Node</div>
              <div className="truncate w-32">{selectedNode}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
