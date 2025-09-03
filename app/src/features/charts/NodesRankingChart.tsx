"use client";

import { useState, useMemo, useCallback } from "react";
import { RustNodeInfo, RustChannelInfo } from "@/lib/types";
import {
  formatCompactNumber,
  u128LittleEndianToDecimal,
  hexToDecimal,
} from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface NodesRankingChartProps {
  nodes: RustNodeInfo[];
  channels?: RustChannelInfo[];
  height?: string;
  className?: string;
  itemsPerPage?: number;
  onNodeClick?: (node: RustNodeInfo) => void;
}

type SortField =
  | "total_channels"
  | "total_capacity"
  | "node_name"
  | "city"
  | "announce_timestamp"
  | "auto_accept_min_ckb_funding_amount";
type SortDirection = "asc" | "desc";

interface NodeWithStats extends RustNodeInfo {
  totalChannels: number;
  totalCapacity: number;
  formattedAnnounceDate: string;
  isActive: boolean;
}

export default function NodesRankingChart({
  nodes,
  channels = [],
  height = "600px",
  className = "",
  itemsPerPage = 20,
  onNodeClick,
}: NodesRankingChartProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("total_channels");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");

  // Capacity parsing utility
  const parseChannelCapacityToCKB = useCallback(
    (capacity: string | number): number => {
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

  // Calculate node statistics from channels
  const nodeStats = useMemo(() => {
    const stats = new Map<string, { channels: number; capacity: number }>();

    channels.forEach(channel => {
      try {
        const capacityInCKB = parseChannelCapacityToCKB(channel.capacity);

        // Add to node1 stats
        const node1Stats = stats.get(channel.node1) || {
          channels: 0,
          capacity: 0,
        };
        node1Stats.channels += 1;
        node1Stats.capacity += capacityInCKB;
        stats.set(channel.node1, node1Stats);

        // Add to node2 stats
        const node2Stats = stats.get(channel.node2) || {
          channels: 0,
          capacity: 0,
        };
        node2Stats.channels += 1;
        node2Stats.capacity += capacityInCKB;
        stats.set(channel.node2, node2Stats);
      } catch (error) {
        console.warn("Error processing channel:", error, channel);
      }
    });

    return stats;
  }, [channels, parseChannelCapacityToCKB]);

  // Process nodes with additional stats
  const processedNodes = useMemo((): NodeWithStats[] => {
    return nodes.map(node => {
      const announceDate = new Date(node.announce_timestamp);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const nodeStat = nodeStats.get(node.node_id) || {
        channels: 0,
        capacity: 0,
      };

      return {
        ...node,
        totalChannels: nodeStat.channels,
        totalCapacity: nodeStat.capacity,
        formattedAnnounceDate: announceDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        isActive: announceDate > thirtyDaysAgo,
      };
    });
  }, [nodes, nodeStats]);

  // Filter and sort nodes
  const filteredAndSortedNodes = useMemo(() => {
    let filtered = processedNodes;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        node =>
          node.node_name.toLowerCase().includes(term) ||
          node.node_id.toLowerCase().includes(term) ||
          (node.city && node.city.toLowerCase().includes(term)) ||
          node.totalChannels.toString().includes(term) ||
          formatCompactNumber(node.totalCapacity)
            .toLowerCase()
            .includes(term) ||
          node.auto_accept_min_ckb_funding_amount.includes(term) ||
          (node.addresses[0] && node.addresses[0].toLowerCase().includes(term))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "total_channels":
          aValue = a.totalChannels;
          bValue = b.totalChannels;
          break;
        case "total_capacity":
          aValue = a.totalCapacity;
          bValue = b.totalCapacity;
          break;
        case "node_name":
          aValue = a.node_name.toLowerCase();
          bValue = b.node_name.toLowerCase();
          break;
        case "city":
          aValue = (a.city || "").toLowerCase();
          bValue = (b.city || "").toLowerCase();
          break;
        case "auto_accept_min_ckb_funding_amount":
          aValue = parseInt(a.auto_accept_min_ckb_funding_amount) || 0;
          bValue = parseInt(b.auto_accept_min_ckb_funding_amount) || 0;
          break;
        case "announce_timestamp":
          aValue = new Date(a.announce_timestamp).getTime();
          bValue = new Date(b.announce_timestamp).getTime();
          break;
        default:
          aValue = a.totalChannels;
          bValue = b.totalChannels;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [processedNodes, sortField, sortDirection, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedNodes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNodes = filteredAndSortedNodes.slice(startIndex, endIndex);

  // Handle sorting
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
      setCurrentPage(1); // Reset to first page when sorting
    },
    [sortField, sortDirection]
  );

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: RustNodeInfo) => {
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick]
  );

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 opacity-30" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Nodes Ranking</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Total: {nodes.length}</span>
            <span>•</span>
            <span>Showing: {filteredAndSortedNodes.length}</span>
            {channels.length > 0 && (
              <>
                <span>•</span>
                <span>Channels: {channels.length}</span>
              </>
            )}
          </div>
        </CardTitle>

        {/* Search and filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search nodes by name, ID, city, channels, capacity, auto accept, or address..."
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background border-input focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span>Active nodes:</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {processedNodes.filter(n => n.isActive).length}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto" style={{ height }}>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Node ID
                </th>
                <th
                  className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("total_channels")}
                >
                  <div className="flex items-center gap-1">
                    Channels
                    {getSortIcon("total_channels")}
                  </div>
                </th>
                <th
                  className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("total_capacity")}
                >
                  <div className="flex items-center gap-1">
                    Capacity (CKB)
                    {getSortIcon("total_capacity")}
                  </div>
                </th>
                <th
                  className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("node_name")}
                >
                  <div className="flex items-center gap-1">
                    Node Name
                    {getSortIcon("node_name")}
                  </div>
                </th>
                <th
                  className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("city")}
                >
                  <div className="flex items-center gap-1">
                    City
                    {getSortIcon("city")}
                  </div>
                </th>
                <th
                  className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() =>
                    handleSort("auto_accept_min_ckb_funding_amount")
                  }
                >
                  <div className="flex items-center gap-1">
                    Auto Accept (CKB)
                    {getSortIcon("auto_accept_min_ckb_funding_amount")}
                  </div>
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Address
                </th>
                <th
                  className="text-left p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort("announce_timestamp")}
                >
                  <div className="flex items-center gap-1">
                    Announce Date
                    {getSortIcon("announce_timestamp")}
                  </div>
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {currentNodes.map(node => (
                <tr
                  key={node.node_id}
                  className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleNodeClick(node)}
                >
                  <td className="p-3">
                    <div
                      className="font-mono text-xs text-muted-foreground max-w-[120px] truncate"
                      title={node.node_id}
                    >
                      {node.node_id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-center">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {node.totalChannels}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-center">
                      <span className="font-mono text-sm text-green-600 font-semibold">
                        {formatCompactNumber(node.totalCapacity)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div
                      className="font-medium max-w-[200px] truncate"
                      title={node.node_name}
                    >
                      {node.node_name || "Unknown"}
                    </div>
                  </td>
                  <td className="p-3">
                    <div
                      className="max-w-[100px] truncate"
                      title={node.city || "Unknown"}
                    >
                      {node.city || "Unknown"}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-mono text-sm">
                      {formatCompactNumber(
                        parseInt(node.auto_accept_min_ckb_funding_amount) /
                          100000000
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div
                      className="font-mono text-xs max-w-[150px] truncate"
                      title={node.addresses[0] || "No address"}
                    >
                      {node.addresses[0] || "No address"}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-muted-foreground">
                      {node.formattedAnnounceDate}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={node.isActive ? "default" : "secondary"}
                      className={
                        node.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }
                    >
                      {node.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty state */}
          {currentNodes.length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">No nodes found</div>
                <div className="text-sm">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "No nodes available"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredAndSortedNodes.length)} of{" "}
              {filteredAndSortedNodes.length} nodes
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
