"use client";

import { useState, useEffect } from "react";
import NetworkGraphChart from "@/features/charts/NetworkGraphChart";
import { generateMockData } from "@/test/data";
import { RustNodeInfo, RustChannelInfo } from "@/lib/types";

export default function NetworkGraphTestPage() {
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
    setLoading(false);
  }, []);

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
        <h1 className="text-3xl font-bold mb-2">Network Graph Test</h1>
        <p className="text-muted-foreground">
          Testing the NetworkGraph component with {nodes.length} nodes and{" "}
          {channels.length} channels
        </p>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <NetworkGraphChart
          nodes={nodes}
          channels={channels}
          height="600px"
          className="w-full"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Nodes</h3>
          <p className="text-2xl font-bold text-primary">{nodes.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Channels</h3>
          <p className="text-2xl font-bold text-primary">{channels.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Data Type</h3>
          <p className="text-sm text-muted-foreground">Mock Generated</p>
        </div>
      </div>
    </div>
  );
}
