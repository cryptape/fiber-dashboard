"use client";

import { useParams, useRouter } from "next/navigation";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Copy, Zap, Clock, X, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import {
  formatCompactNumber,
  hexToDecimal,
  u64LittleEndianToDecimal,
} from "@/lib/utils";
import { queryClient } from "@/features/dashboard/hooks/useDashboard";

function ChannelDetailContent() {
  const router = useRouter();
  const params = useParams();
  const channelId = decodeURIComponent(params.channelId as string);
  const { apiClient, currentNetwork } = useNetwork();

  console.log("ChannelDetailContent - channelId:", channelId);
  console.log("ChannelDetailContent - currentNetwork:", currentNetwork);

  const {
    data: channelInfo,
    isLoading: channelLoading,
    error: channelError,
  } = useQuery({
    queryKey: ["channel-info", channelId, currentNetwork],
    queryFn: () => apiClient.getChannelInfo(channelId),
    enabled: !!channelId,
    retry: 3,
  });

  console.log("ChannelDetailContent - channelInfo:", channelInfo);
  console.log("ChannelDetailContent - channelLoading:", channelLoading);
  console.log("ChannelDetailContent - channelError:", channelError);

  const {
    data: channelState,
    isLoading: stateLoading,
    error: stateError,
  } = useQuery({
    queryKey: ["channel-state", channelId, currentNetwork],
    queryFn: () => apiClient.getChannelState(channelId),
    enabled: !!channelId,
    retry: 3,
  });

  const { data: node1Info, error: node1Error } = useQuery({
    queryKey: ["node-info", channelInfo?.node1, currentNetwork],
    queryFn: () => apiClient.getNodeInfo(channelInfo!.node1),
    enabled: !!channelInfo?.node1,
  });

  const { data: node2Info, error: node2Error } = useQuery({
    queryKey: ["node-info", channelInfo?.node2, currentNetwork],
    queryFn: () => apiClient.getNodeInfo(channelInfo!.node2),
    enabled: !!channelInfo?.node2,
  });

  // Check for any errors
  const hasError = channelError || stateError || node1Error || node2Error;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStateIcon = (state?: string) => {
    switch (state) {
      case "open":
        return <Zap className="h-4 w-4 text-green-500" />;
      case "commitment":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "closed":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Zap className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStateBadgeVariant = (
    state?: string
  ): "default" | "secondary" | "destructive" => {
    switch (state) {
      case "open":
        return "default";
      case "commitment":
        return "secondary";
      case "closed":
        return "destructive";
      default:
        return "default";
    }
  };

  const formatNodeId = (nodeId: string) => {
    if (nodeId.length <= 16) return nodeId;
    return `${nodeId.slice(0, 12)}...${nodeId.slice(-12)}`;
  };

  if (hasError) {
    console.log("ChannelDetailContent - showing error UI, errors:", {
      channelError,
      stateError,
      node1Error,
      node2Error,
    });
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
              <h2 className="text-xl font-semibold mb-2">Channel Not Found</h2>
              <p className="text-muted-foreground">
                The channel with ID {channelId} could not be found or is not
                accessible.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Error:{" "}
                {channelError?.message ||
                  node1Error?.message ||
                  node2Error?.message ||
                  "Unknown error"}
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

        {/* Channel Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              Channel Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {channelLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : channelInfo ? (
              <>
                {console.log(
                  "ChannelDetailContent - rendering channelInfo:",
                  channelInfo
                )}
                {/* Channel State and ID */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {getStateIcon(channelState?.state)}
                    <Badge
                      variant={getStateBadgeVariant(channelState?.state)}
                      className="capitalize"
                    >
                      {channelState?.state || "unknown"}
                    </Badge>
                    {stateLoading && <Skeleton className="h-6 w-16" />}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Channel ID:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {channelInfo.channel_outpoint}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(channelInfo.channel_outpoint)
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Capacity and Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Capacity</span>
                    <p className="text-2xl font-bold text-primary">
                      {formatCompactNumber(channelInfo.capacity)} CKB
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-sm font-medium">Created</span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(
                        Number(hexToDecimal(channelInfo.created_timestamp))
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-sm font-medium">Last Commit</span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(channelInfo.commit_timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Chain Information */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Chain Hash</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                      {channelInfo.chain_hash}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(channelInfo.chain_hash)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Channel Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              Channel Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stateLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : channelState?.txs && channelState.txs.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {channelState.txs.length} transaction
                  {channelState.txs.length !== 1 ? "s" : ""} found
                </div>
                <div className="space-y-3">
                  {channelState.txs.map((tx, index) => (
                    <div
                      key={tx.tx_hash}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Transaction {index + 1}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Block #{u64LittleEndianToDecimal(tx.block_number)}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Transaction Hash
                          </span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded break-all max-w-md">
                              {tx.tx_hash}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(tx.tx_hash)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {tx.commitment_args && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Commitment Args
                            </span>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded break-all max-w-md">
                                {tx.commitment_args}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(tx.commitment_args!)
                                }
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No transactions found for this channel
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Nodes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Node 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Node 1
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {node1Info ? (
                <>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Node ID</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                        {formatNodeId(node1Info.node_id)}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(node1Info.node_id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/node/${encodeURIComponent(node1Info.node_id)}`
                          )
                        }
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  {node1Info.node_name && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Name</span>
                      <p className="text-sm">{node1Info.node_name}</p>
                    </div>
                  )}

                  {node1Info.country && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Location</span>
                      <p className="text-sm">
                        {node1Info.city ? `${node1Info.city}, ` : ""}
                        {node1Info.country}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <Skeleton className="h-20 w-full" />
              )}
            </CardContent>
          </Card>

          {/* Node 2 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Node 2
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {node2Info ? (
                <>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Node ID</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                        {formatNodeId(node2Info.node_id)}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(node2Info.node_id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/node/${encodeURIComponent(node2Info.node_id)}`
                          )
                        }
                      >
                        View Details
                      </Button>
                    </div>
                  </div>

                  {node2Info.node_name && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Name</span>
                      <p className="text-sm">{node2Info.node_name}</p>
                    </div>
                  )}

                  {node2Info.country && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Location</span>
                      <p className="text-sm">
                        {node2Info.city ? `${node2Info.city}, ` : ""}
                        {node2Info.country}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <Skeleton className="h-20 w-full" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ChannelDetailPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChannelDetailContent />
    </QueryClientProvider>
  );
}
