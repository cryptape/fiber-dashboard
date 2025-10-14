"use client";

import { useParams } from "next/navigation";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Copy, Users, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { formatCompactNumber } from "@/lib/utils";
import { queryClient } from "@/features/dashboard/hooks/useDashboard";

function NodeDetailContent() {
  const params = useParams();
  const nodeId = decodeURIComponent(params.nodeId as string);
  const { apiClient, currentNetwork } = useNetwork();

  console.log("NodeDetailContent - nodeId:", nodeId);
  console.log("NodeDetailContent - currentNetwork:", currentNetwork);

  const {
    data: nodeInfo,
    isLoading: nodeLoading,
    error: nodeError,
  } = useQuery({
    queryKey: ["node-info", nodeId, currentNetwork],
    queryFn: () => apiClient.getNodeInfo(nodeId),
    enabled: !!nodeId,
    retry: 3,
  });

  console.log("NodeDetailContent - nodeInfo:", nodeInfo);
  console.log("NodeDetailContent - nodeLoading:", nodeLoading);
  console.log("NodeDetailContent - nodeError:", nodeError);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatNodeId = (nodeId: string) => {
    if (nodeId.length <= 16) return nodeId;
    return `${nodeId.slice(0, 12)}...${nodeId.slice(-12)}`;
  };

  if (nodeError) {
    console.log("NodeDetailContent - showing error UI, error:", nodeError);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Node Not Found</h2>
              <p className="text-muted-foreground">
                The node with ID {nodeId} could not be found or is not
                accessible.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Error: {nodeError?.message || "Unknown error"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Node Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              Node Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {nodeLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : nodeInfo ? (
              <>
                {console.log(
                  "NodeDetailContent - rendering nodeInfo:",
                  nodeInfo
                )}
                {/* Node ID */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Node ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {formatNodeId(nodeInfo.node_id)}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(nodeInfo.node_id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Node Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nodeInfo.node_name && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Name</span>
                      <p className="text-lg font-semibold">
                        {nodeInfo.node_name}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-sm font-medium">Funding Amount</span>
                    <p className="text-lg font-semibold text-primary">
                      {formatCompactNumber(
                        nodeInfo.auto_accept_min_ckb_funding_amount
                      )}{" "}
                      CKB
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-sm font-medium">Last Seen</span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(nodeInfo.announce_timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Location Information */}
                {(nodeInfo.country || nodeInfo.city || nodeInfo.region) && (
                  <>
                    <div className="space-y-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </span>
                      <p className="text-sm">
                        {[nodeInfo.city, nodeInfo.region, nodeInfo.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Addresses */}
                {nodeInfo.addresses && nodeInfo.addresses.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Addresses</span>
                    <div className="space-y-2">
                      {nodeInfo.addresses.map((address, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded break-all flex-1">
                            {address}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Chain Information */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Chain Hash</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                      {nodeInfo.chain_hash}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(nodeInfo.chain_hash)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function NodeDetailPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <NodeDetailContent />
    </QueryClientProvider>
  );
}
