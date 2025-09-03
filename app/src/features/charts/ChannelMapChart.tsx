"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as echarts from "echarts";
import { RustNodeInfo, RustChannelInfo } from "@/lib/types";
import worldGeoJson from "../dashboard/maps/world.json";
import { formatCompactNumber } from "@/lib/utils";

interface ChannelMapChartProps {
  nodes: RustNodeInfo[];
  channels: RustChannelInfo[];
  height?: string;
  className?: string;
  maxNodes?: number;
  maxChannels?: number;
}

export default function ChannelMapChart({
  nodes,
  channels,
  height = "500px",
  className = "",
  maxNodes = 1000,
  maxChannels = 500,
}: ChannelMapChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError] = useState<string | null>(null);
  const [invisibleConnections] = useState<
    Map<
      string,
      {
        channelCount: number;
        totalCapacity: number;
        color: string;
        seriesName: string;
        node1Name: string;
        node2Name: string;
      }
    >
  >(new Map());

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

  // Parse coordinates helper function - memoized
  const parseCoordinates = useCallback(
    (loc: string | undefined): [number, number] | null => {
      if (!loc) return null;
      try {
        const [lat, lng] = loc
          .split(",")
          .map(coord => parseFloat(coord.trim()));
        if (isNaN(lat) || isNaN(lng)) return null;
        return [lat, lng];
      } catch {
        return null;
      }
    },
    []
  );

  // Capacity parsing utility
  const parseChannelCapacityToCKB = useCallback(
    (capacity: string | number): number => {
      const {
        u128LittleEndianToDecimal,
        hexToDecimal,
      } = require("@/lib/utils");
      const SHANNONS_PER_CKB = 100000000; // 1 CKB = 100,000,000 shannons

      const capacityInShannons =
        typeof capacity === "string"
          ? capacity.startsWith("0x") && capacity.length === 34
            ? u128LittleEndianToDecimal(capacity)
            : hexToDecimal(capacity)
          : BigInt(capacity);
      return Number(capacityInShannons) / SHANNONS_PER_CKB;
    },
    []
  );

  // Memoized node data processing with capacity and channel count
  const nodeScatterData = useMemo(() => {
    // Calculate node capacity and channel count
    const nodeCapacity = new Map<string, number>();
    const nodeChannelCount = new Map<string, number>();

    channels.forEach(channel => {
      try {
        const capacityInCKB = parseChannelCapacityToCKB(channel.capacity);
        // Distribute capacity equally between both nodes
        nodeCapacity.set(
          channel.node1,
          (nodeCapacity.get(channel.node1) || 0) + capacityInCKB / 2
        );
        nodeCapacity.set(
          channel.node2,
          (nodeCapacity.get(channel.node2) || 0) + capacityInCKB / 2
        );

        // Count channels for each node
        nodeChannelCount.set(
          channel.node1,
          (nodeChannelCount.get(channel.node1) || 0) + 1
        );
        nodeChannelCount.set(
          channel.node2,
          (nodeChannelCount.get(channel.node2) || 0) + 1
        );
      } catch (error) {
        console.warn("Error processing channel for node data:", error, channel);
      }
    });

    return nodes
      .slice(0, maxNodes) // Limit number of nodes
      .map(node => {
        const coordinates = parseCoordinates(node.loc);
        if (!coordinates) return null;

        const totalCapacity =
          Math.round(Math.max(0, nodeCapacity.get(node.node_id) || 0) * 100) /
          100;
        const totalChannels = nodeChannelCount.get(node.node_id) || 0;

        return {
          name: node.node_name,
          value: [coordinates[1], coordinates[0]], // [longitude, latitude]
          nodeId: node.node_id,
          nodeName: node.node_name,
          city: node.city || "Unknown",
          country: node.country || "Unknown",
          totalCapacity,
          totalChannels,
          formattedCapacity: formatCompactNumber(totalCapacity),
        };
      })
      .filter((node): node is NonNullable<typeof node> => node !== null);
  }, [nodes, channels, parseCoordinates, parseChannelCapacityToCKB, maxNodes]);

  // Memoized channel data processing with grouping by node pairs
  const channelLinesData = useMemo(() => {
    // Create a map for faster node lookup
    const nodeMap = new Map(nodes.map(node => [node.node_id, node]));

    // Group channels by node pairs to handle overlapping channels
    const channelGroups = new Map<
      string,
      {
        coords: [[number, number], [number, number]];
        channels: RustChannelInfo[];
        totalCapacity: number;
        node1Name: string;
        node2Name: string;
      }
    >();

    channels
      .slice(0, maxChannels) // Limit number of channels
      .forEach(channel => {
        const node1 = nodeMap.get(channel.node1);
        const node2 = nodeMap.get(channel.node2);

        if (!node1 || !node2) return;

        const coords1 = parseCoordinates(node1.loc);
        const coords2 = parseCoordinates(node2.loc);

        if (!coords1 || !coords2) return;

        // Create a consistent key for node pairs (sorted to ensure same key regardless of order)
        const nodePairKey = [channel.node1, channel.node2].sort().join("|");

        const coords: [[number, number], [number, number]] = [
          [coords1[1], coords1[0]], // [longitude, latitude]
          [coords2[1], coords2[0]], // [longitude, latitude]
        ];

        if (channelGroups.has(nodePairKey)) {
          // Add to existing group
          const group = channelGroups.get(nodePairKey)!;
          group.channels.push(channel);
          group.totalCapacity += parseChannelCapacityToCKB(channel.capacity);
        } else {
          // Create new group
          channelGroups.set(nodePairKey, {
            coords,
            channels: [channel],
            totalCapacity: parseChannelCapacityToCKB(channel.capacity),
            node1Name: node1.node_name,
            node2Name: node2.node_name,
          });
        }
      });

    return Array.from(channelGroups.values());
  }, [
    channels,
    nodes,
    parseCoordinates,
    parseChannelCapacityToCKB,
    maxChannels,
  ]);

  // Register world map GeoJSON
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
    if (!chartInstance.current || !nodes.length) {
      setMapLoaded(true);
      return;
    }

    const totalChannels = channelLinesData.reduce(
      (sum, line) => sum + line.channels.length,
      0
    );
    console.log(
      `Rendering ${nodeScatterData.length} nodes and ${channelLinesData.length} connections (${totalChannels} total channels)`
    );

    // Generate channel series and collect legend data with counts
    const channelSeries = (() => {
      const series: echarts.LinesSeriesOption[] = [];
      const legendData: string[] = [`Nodes (${nodeScatterData.length})`];

      // Create separate series for different channel count ranges with same color but different opacity levels
      const baseColor = "#eab308"; // Yellow base color
      const channelRanges = [
        {
          min: 1,
          max: 1,
          width: 1,
          color: baseColor,
          opacity: 0.3,
          label: "1 Channel",
        },
        {
          min: 2,
          max: 2,
          width: 2,
          color: baseColor,
          opacity: 0.4,
          label: "2 Channels",
        },
        {
          min: 3,
          max: 3,
          width: 3,
          color: baseColor,
          opacity: 0.5,
          label: "3 Channels",
        },
        {
          min: 4,
          max: 5,
          width: 4,
          color: baseColor,
          opacity: 0.6,
          label: "4-5 Channels",
        },
        {
          min: 6,
          max: 10,
          width: 5,
          color: baseColor,
          opacity: 0.8,
          label: "6-10 Channels",
        },
        {
          min: 11,
          max: Infinity,
          width: 6,
          color: baseColor,
          opacity: 1.0,
          label: "11+ Channels",
        },
      ];

      channelRanges.forEach(range => {
        const filteredData = channelLinesData.filter(
          line =>
            line.channels.length >= range.min &&
            line.channels.length <= range.max
        );

        if (filteredData.length > 0) {
          const seriesName = `${range.label} (${filteredData.length})`;

          // Separate visible and invisible lines
          const visibleLines = filteredData.filter(
            line =>
              line.coords[0][0] !== line.coords[1][0] ||
              line.coords[0][1] !== line.coords[1][1]
          );
          const invisibleLines = filteredData.filter(
            line =>
              line.coords[0][0] === line.coords[1][0] &&
              line.coords[0][1] === line.coords[1][1]
          );

          // Create series for visible lines
          if (visibleLines.length > 0) {
            series.push({
              name: seriesName,
              type: "lines" as const,
              coordinateSystem: "geo",
              data: visibleLines.map(line => ({
                coords: line.coords,
                value: line.channels.length,
                channelCount: line.channels.length,
                totalCapacity: line.totalCapacity,
                node1Name: line.node1Name,
                node2Name: line.node2Name,
              })),
              effect: {
                show: false,
              },
              lineStyle: {
                color: range.color,
                width: range.width,
                opacity: range.opacity,
                curveness: 0,
                shadowBlur: range.width > 3 ? 2 : 0,
                shadowColor: range.color,
              },
              silent: false,
              progressive: 100,
              progressiveThreshold: 500,
            });
          }

          // Create dummy series for invisible lines (so legend works)
          if (invisibleLines.length > 0 && visibleLines.length === 0) {
            series.push({
              name: seriesName,
              type: "lines" as const,
              coordinateSystem: "geo",
              data: [], // Empty data since lines are invisible
              effect: {
                show: false,
              },
              lineStyle: {
                color: range.color,
                width: range.width,
                opacity: 0, // Make it invisible
                curveness: 0,
              },
              silent: true, // Disable interactions
              progressive: 100,
              progressiveThreshold: 500,
            });
          }

          // Store invisible lines for node highlighting
          if (invisibleLines.length > 0) {
            // Add to state map for node highlighting
            invisibleLines.forEach(line => {
              const nodeKey = `${line.node1Name}|${line.node2Name}`;
              const connectionData = {
                channelCount: line.channels.length,
                totalCapacity: line.totalCapacity,
                color: range.color,
                seriesName: seriesName,
                node1Name: line.node1Name,
                node2Name: line.node2Name,
              };
              invisibleConnections.set(nodeKey, connectionData);
            });
          }

          // Add to legend if there are any lines (visible or invisible)
          if (visibleLines.length > 0 || invisibleLines.length > 0) {
            legendData.push(seriesName);
          }
        }
      });

      return { series, legendData };
    })();

    const option: echarts.EChartsOption = {
      title: {
        text: `Fiber Network: ${nodeScatterData.length} Nodes, ${totalChannels} Channels`,
        left: "center",
        textStyle: {
          color: "var(--foreground)",
          fontSize: 16,
          fontWeight: "normal",
        },
        subtext: `${channelLinesData.length} connections • Line thickness indicates channel count`,
        subtextStyle: {
          color: "var(--muted-foreground)",
          fontSize: 12,
        },
      },
      legend: {
        data: channelSeries.legendData,
        bottom: 10,
        textStyle: {
          color: "var(--foreground)",
          fontSize: 12,
        },
        itemWidth: 30,
        itemHeight: 3,
        itemGap: 15,
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
              nodeId?: string;
              nodeName?: string;
              city?: string;
              country?: string;
              totalCapacity?: number;
              totalChannels?: number;
              formattedCapacity?: string;
              channelCount?: number;
              node1Name?: string;
              node2Name?: string;
            };
            seriesName?: string;
          };

          // Show tooltip for nodes
          if (param.seriesName?.startsWith("Nodes") && param.data) {
            const {
              nodeName,
              city,
              country,
              totalChannels,
              formattedCapacity,
            } = param.data;

            // Find all nodes at the same location
            const sameLocationNodes = nodeScatterData.filter(
              node =>
                node.value[0] === param.value[0] &&
                node.value[1] === param.value[1]
            );

            if (sameLocationNodes.length > 1) {
              // Multiple nodes at same location - show summary
              const totalCapacity = sameLocationNodes.reduce(
                (sum, node) => sum + (node.totalCapacity || 0),
                0
              );
              const totalChannelsCount = sameLocationNodes.reduce(
                (sum, node) => sum + (node.totalChannels || 0),
                0
              );
              const uniqueCities = [
                ...new Set(sameLocationNodes.map(node => node.city)),
              ];
              const uniqueCountries = [
                ...new Set(sameLocationNodes.map(node => node.country)),
              ];

              return `
                <div class="p-2">
                  <div class="font-semibold text-primary mb-1">${sameLocationNodes.length} Nodes</div>
                  <div class="text-sm text-muted-foreground mb-1">${uniqueCities.join(", ")}, ${uniqueCountries.join(", ")}</div>
                  <div class="text-sm">
                    <span class="text-foreground">Total Capacity:</span> 
                    <span class="font-medium text-primary">${formatCompactNumber(totalCapacity)} CKB</span>
                  </div>
                  <div class="text-sm">
                    <span class="text-foreground">Total Channels:</span> 
                    <span class="font-medium text-primary">${totalChannelsCount}</span>
                  </div>
                  <div class="text-xs text-muted-foreground mt-1">
                    Click to see individual nodes
                  </div>
                </div>
              `;
            } else {
              // Single node - show detailed info
              return `
                <div class="p-2">
                  <div class="font-semibold text-primary mb-1">${nodeName}</div>
                  <div class="text-sm text-muted-foreground mb-1">${city}, ${country}</div>
                  <div class="text-sm">
                    <span class="text-foreground">Capacity:</span> 
                    <span class="font-medium text-primary">${formattedCapacity} CKB</span>
                  </div>
                  <div class="text-sm">
                    <span class="text-foreground">Channels:</span> 
                    <span class="font-medium text-primary">${totalChannels}</span>
                  </div>
                </div>
              `;
            }
          }

          // Show tooltip for channels
          if (param.seriesName === "Channels" && param.data) {
            const { channelCount, totalCapacity, node1Name, node2Name } =
              param.data;
            return `
              <div class="p-2">
                <div class="font-semibold text-primary mb-1">Channel Connection</div>
                <div class="text-sm text-muted-foreground mb-1">${node1Name} ↔ ${node2Name}</div>
                <div class="text-sm">
                  <span class="text-foreground">Channels:</span> 
                  <span class="font-medium text-primary">${channelCount}</span>
                </div>
                <div class="text-sm">
                  <span class="text-foreground">Total Capacity:</span> 
                  <span class="font-medium text-primary">${formatCompactNumber(totalCapacity || 0)} CKB</span>
                </div>
              </div>
            `;
          }
          return "";
        },
        // Ensure tooltip works with geo coordinate system
        confine: true,
        appendToBody: false,
      },
      geo: {
        map: "world",
        roam: true,
        itemStyle: {
          borderColor: "transparent", // Remove country borders
          borderWidth: 0,
          areaColor: "#6b7280", // Gray background
        },
        emphasis: {
          itemStyle: {
            areaColor: "#6b7280", // Keep same gray background on hover
          },
          label: {
            show: false, // Disable map labels on hover
          },
        },
        // Disable all map interactions
        silent: true,
        select: {
          disabled: true,
        },
        // Disable map tooltips
        tooltip: {
          show: false,
        },
        // Disable map labels
        label: {
          show: false,
        },
      },
      series: [
        // Channel series with dynamic legend
        ...channelSeries.series,
        // Node scatter series - optimized for performance
        {
          name: `Nodes (${nodeScatterData.length})`,
          type: "scatter",
          coordinateSystem: "geo",
          data: nodeScatterData,
          symbolSize: 8, // Larger symbols for easier hovering
          itemStyle: {
            color: "#22c55e", // Green for nodes
            shadowBlur: 0, // Disable shadows for better performance
          },
          emphasis: {
            itemStyle: {
              color: "#16a34a", // Darker green on hover
              shadowBlur: 0,
            },
          },
          // Performance optimizations
          progressive: 50, // Progressive rendering
          progressiveThreshold: 300,
          large: true, // Enable large mode for better performance with many points
          largeThreshold: 100,
          // Enable tooltips for nodes
          silent: false,
          // Ensure tooltip works
          tooltip: {
            show: true,
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    // Add legend click handler for invisible connections
    chartInstance.current.on("legendselectchanged", (params: unknown) => {
      const legendParams = params as { selected?: Record<string, boolean> };
      // Check if any invisible connections should be highlighted
      const selectedSeries = new Set<string>();
      if (legendParams.selected) {
        Object.entries(legendParams.selected).forEach(([name, selected]) => {
          if (selected === true) {
            selectedSeries.add(name);
          }
        });
      }

      // Update node colors based on invisible connections
      const updatedNodeData = nodeScatterData.map(node => {
        let highlightColor = null;

        // Check if this node is part of any invisible connections in selected series
        invisibleConnections.forEach(connection => {
          if (selectedSeries.has(connection.seriesName)) {
            if (
              node.nodeName === connection.node1Name ||
              node.nodeName === connection.node2Name
            ) {
              highlightColor = connection.color;
            }
          }
        });

        return {
          ...node,
          itemStyle: {
            color: highlightColor ? "#fbbf24" : "#22c55e", // Bright yellow for highlighted nodes, green for normal
            shadowBlur: highlightColor ? 12 : 0,
            shadowColor: highlightColor ? "#fbbf24" : "#22c55e",
          },
        };
      });

      // Update the nodes series with new colors
      chartInstance.current?.setOption({
        series: [
          {
            name: `Nodes (${nodeScatterData.length})`,
            data: updatedNodeData,
          },
        ],
      });
    });

    setMapLoaded(true);
  }, [nodeScatterData, channelLinesData, nodes.length, invisibleConnections]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={chartRef} style={{ height }} className={className} />
      {!mapLoaded && !mapError && (
        <div
          className={`${className} absolute inset-0 flex items-center justify-center pointer-events-none`}
        >
          <div className="text-muted-foreground">Loading node map...</div>
        </div>
      )}
      {mapError && (
        <div
          className={`${className} absolute inset-0 flex items-center justify-center pointer-events-none`}
        >
          <div className="text-center">
            <div className="text-destructive mb-2">Failed to load node map</div>
            <div className="text-sm text-muted-foreground">{mapError}</div>
          </div>
        </div>
      )}
      {/* Data summary overlay */}
      {mapLoaded &&
        !mapError &&
        (nodes.length > maxNodes || channels.length > maxChannels) && (
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground">
            Showing {nodeScatterData.length}/{nodes.length} nodes,{" "}
            {channelLinesData.length}/{channels.length} channels
          </div>
        )}
    </div>
  );
}
