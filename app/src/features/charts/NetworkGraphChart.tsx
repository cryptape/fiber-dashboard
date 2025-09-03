"use client";

import { useMemo, memo } from "react";
import { RustNodeInfo, RustChannelInfo } from "@/lib/types";
import { formatCompactNumber } from "@/lib/utils";
import ColorForceGraph from "@/shared/components/chart/ForceGraph";
import { APIUtils } from "@/lib";

export interface NetworkGraphChartProps {
  nodes: RustNodeInfo[];
  channels: RustChannelInfo[];
  height?: string;
  className?: string;
  graphClassName?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  country?: string;
  city?: string;
  region?: string;
  totalChannels: number;
  totalCapacity: number;
}

export interface GraphLink {
  source: string;
  target: string;
  capacity: number;
  // a group is the same connected channel between two nodes.
  // here the order doesn't matters.
  // {source, target} {target, source} are consider the same group with same unique group id
  groupId: number;
}

function NetworkGraphChart({
  nodes,
  channels,
  height = "600px",
  className = "",
  graphClassName = "",
}: NetworkGraphChartProps) {
  const graphData = useMemo(() => {
    // Filter channels to only include those where both nodes exist
    const validChannels = APIUtils.filterChannelsByValidNodes(nodes, channels);

    const graphNodes = APIUtils.getNodeChannelInfoFromChannels(
      nodes,
      validChannels // Use filtered channels instead of all channels
    ).map(node => ({
      id: node.node_id,
      name: node.node_name,
      country: node.country,
      city: node.city,
      region: node.region,
      totalChannels: formatCompactNumber(node.totalChannels),
      totalCapacity: formatCompactNumber(node.totalCapacity),
    }));

    const graphLinks = APIUtils.addGroupToChannels(validChannels).map(
      channel => ({
        source: channel.node1,
        target: channel.node2,
        capacity: formatCompactNumber(channel.capacity),
        groupId: channel.group,
      })
    );

    return { nodes: graphNodes, links: graphLinks };
  }, [nodes, channels]);

  const nodeHoverUI = (node: GraphNode) => {
    return (
      <div className="bg-card border rounded-lg shadow-lg p-3 max-w-xs">
        <div className="font-semibold text-sm mb-2">{node.name}</div>
        <div className="space-y-1 text-xs text-muted-foreground">
          {node.city && (
            <div className="flex items-center gap-2">
              <span>{node.city}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span>Total Channels: {node.totalChannels}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Total Capacity: {node.totalCapacity}</span>
          </div>
        </div>
      </div>
    );
  };

  if (!graphData.nodes.length) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/25 ${className}`}
        style={{ height }}
      >
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No Network Data</div>
          <div className="text-sm">Connect to a network to view the graph</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <ColorForceGraph
        graphData={graphData}
        nodeAutoColorBy="id"
        linkAutoColorBy="groupId"
        height={height}
        className={`${graphClassName}`}
        nodeHoverUI={nodeHoverUI}
      />
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Nodes: {graphData.nodes.length}</div>
          <div>Channels: {graphData.links.length}</div>
          {channels.length !== graphData.links.length && (
            <div className="text-orange-500">
              Filtered: {channels.length - graphData.links.length} invalid
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(NetworkGraphChart);
