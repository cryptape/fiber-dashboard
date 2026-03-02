"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { RustNodeInfo } from "@/lib/types";
import Image from "next/image";
import {
  Table,
  Pagination,
  ColumnDef,
  SortState,
  GlassCardContainer,
} from "@/shared/components/ui";

// 节点数据类型
interface NodeData extends Record<string, unknown> {
  nodeId: string;
  nodeName: string;
  channels: number;
  region: string;
  capacity: number;
  autoAccept: number;
  lastSeen: string;
}

export default function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiClient, currentNetwork } = useNetwork();
  const searchQuery = searchParams.get("q") || "";

  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortState, setSortState] = useState<SortState>("none");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (nodeId: string) => {
    try {
      await navigator.clipboard.writeText(nodeId);
      setCopiedId(nodeId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const backendPage = currentPage - 1;
  const PAGE_SIZE = 10;

  const getSortBy = (key: string): string | undefined => {
    if (!key) return undefined;
    switch (key) {
      case "channels":
        return "channel_count";
      case "region":
        return "region";
      case "lastSeen":
        return "last_seen";
      default:
        return undefined;
    }
  };

  const getOrder = (state: SortState): string | undefined => {
    if (state === "none") return undefined;
    return state === "ascending" ? "asc" : "desc";
  };

  const { data: nodesResponse, isLoading } = useQuery({
    queryKey: ["search-nodes", currentNetwork, searchQuery, backendPage, sortKey, sortState],
    queryFn: async () => {
      const sortBy = getSortBy(sortKey);
      const order = getOrder(sortState);
      return apiClient.searchNodesByName(searchQuery, backendPage, sortBy, order, PAGE_SIZE);
    },
    enabled: !!searchQuery,
  });

  const nodes = nodesResponse?.nodes || [];
  const totalCount = nodesResponse?.total_count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const tableData: NodeData[] = useMemo(() => {
    return nodes.map((node: RustNodeInfo) => {
      const location =
        node.city && node.country_or_region
          ? `${node.city}, ${node.country_or_region}`
          : node.country_or_region || "Unknown";

      const lastSeen = node.announce_timestamp
        ? new Date(node.announce_timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "";

      return {
        nodeId: node.node_id || "",
        nodeName: node.node_name || "",
        channels: node.channel_count || 0,
        region: location,
        capacity: 0,
        autoAccept: node.auto_accept_min_ckb_funding_amount || 0,
        lastSeen,
      };
    });
  }, [nodes]);

  const columns: ColumnDef<NodeData>[] = useMemo(
    () => [
      {
        key: "nodeId",
        label: "Node ID",
        sortable: false,
        render: (_value: unknown, row: NodeData) => (
          <div className="flex items-center gap-2 group">
            <button
              onClick={() => router.push(`/node/${row.nodeId}`)}
              className="text-primary group-hover:text-[#674BDC] hover:underline font-medium cursor-pointer transition-colors"
            >
              {row.nodeId.slice(0, 10)}...{row.nodeId.slice(-6)}
            </button>
            <button
              onClick={() => handleCopy(row.nodeId)}
              className="flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Image
                src={copiedId === row.nodeId ? "/copy_success.svg" : "/copy.svg"}
                alt="Copy"
                width={16}
                height={16}
                className="w-4 h-4"
              />
            </button>
          </div>
        ),
      },
      {
        key: "nodeName",
        label: "Node name",
        sortable: false,
        render: (_value: unknown, row: NodeData) => (
          <div className="flex items-center gap-2 group">
            <button
              onClick={() => router.push(`/node/${row.nodeId}`)}
              className="text-primary group-hover:text-[#674BDC] hover:underline font-medium cursor-pointer transition-colors"
            >
              {row.nodeName || "-"}
            </button>
            <button
              onClick={() => handleCopy(row.nodeId)}
              className="flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Image
                src={copiedId === row.nodeId ? "/copy_success.svg" : "/copy.svg"}
                alt="Copy"
                width={16}
                height={16}
                className="w-4 h-4"
              />
            </button>
          </div>
        ),
      },
      {
        key: "channels",
        label: "Channels",
        sortable: true,
        render: (_value: unknown, row: NodeData) => (
          <span className="text-primary">{Math.floor(row.channels)}</span>
        ),
      },
      {
        key: "region",
        label: "Location",
        sortable: true,
        render: (_value: unknown, row: NodeData) => <span className="text-primary">{row.region}</span>,
      },
      {
        key: "lastSeen",
        label: "Last seen on",
        sortable: true,
        render: (_value: unknown, row: NodeData) => <span className="text-primary">{row.lastSeen}</span>,
      },
    ],
    [router, copiedId, handleCopy]
  );

  const handleSort = (key: string, state: SortState) => {
    setSortKey(key);
    setSortState(state);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [sortKey, sortState]);

  if (!searchQuery) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="type-h2 text-primary">Search results</h2>
        <GlassCardContainer>
          <p className="text-secondary type-body">Please enter a search query.</p>
        </GlassCardContainer>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="type-h2 text-primary">Search results</h2>
        <p className="text-secondary type-body mt-2">
          {totalCount} node{totalCount !== 1 ? "s" : ""} found for &quot;{searchQuery}&quot;
        </p>
      </div>

      <GlassCardContainer>
        {/* <SectionHeader title="Nodes" /> */}
        {isLoading ? (
          <div className="py-8 text-center text-secondary">Loading...</div>
        ) : tableData.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-primary type-body mb-2">No results found</p>
            <p className="text-secondary type-body">
              Try adjusting your search terms
            </p>
          </div>
        ) : (
          <>
            <Table
              data={tableData}
              columns={columns}
              onSort={handleSort}
              defaultSortKey={sortKey}
              defaultSortState={sortState}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </GlassCardContainer>
    </div>
  );
}
