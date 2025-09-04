"use client";

import { useState, useEffect } from "react";
import { generateMockData } from "@/test/data";
import { RustNodeInfo, RustChannelInfo } from "@/lib/types";
import NodeMapChart from "@/features/charts/CityMapChart";
import { APIUtils } from "@/lib/client";

export default function ChannelOnMapTestPage() {
  const [nodes, setNodes] = useState<RustNodeInfo[]>([]);
  const [channels, setChannels] = useState<RustChannelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockData = generateMockData({
      nodeCount: 5000,
      channelCount: 10000,
    });

    setNodes(mockData.nodes);
    setChannels(mockData.channels);
    console.log(mockData.nodes);
    setLoading(false);
  }, []);

  const cityNodes = APIUtils.calculateCityGeographicalDistribution(
    nodes,
    channels
  );

  const nodeLocations = APIUtils.getNodeLocations(nodes, channels);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-muted-foreground">Generating mock data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Channels On Map Test</h1>
        <p className="text-muted-foreground">
          Testing the ChannelMapChart component with {nodes.length} nodes and{" "}
          {channels.length} channels
        </p>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <NodeMapChart
          cityNodes={cityNodes}
          nodeLocations={nodeLocations}
          height="600px"
          className="w-full"
        />
      </div>
    </div>
  );
}
