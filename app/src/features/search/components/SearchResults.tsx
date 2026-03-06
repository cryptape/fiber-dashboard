"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { RustNodeInfo } from "@/lib/types";
import {
  Table,
  Pagination,
  ColumnDef,
  SortState,
  GlassCardContainer,
  CopyButton,
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
          <div className="flex items-center gap-2 group min-w-0">
            <button
              onClick={() => router.push(`/node/${row.nodeId}`)}
              className="text-primary group-hover:text-[#674BDC] hover:underline font-medium cursor-pointer transition-colors truncate min-w-0 flex-1"
            >
              {row.nodeId.slice(0, 10)}...{row.nodeId.slice(-6)}
            </button>
            <CopyButton text={row.nodeId} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
          </div>
        ),
      },
      {
        key: "nodeName",
        label: "Node name",
        sortable: false,
        render: (_value: unknown, row: NodeData) => (
          <div className="flex items-center gap-2 group min-w-0">
            <button
              onClick={() => router.push(`/node/${row.nodeId}`)}
              className="text-primary group-hover:text-[#674BDC] hover:underline font-medium cursor-pointer transition-colors truncate min-w-0 flex-1"
            >
              {row.nodeName || "-"}
            </button>
            <CopyButton text={row.nodeId} className="opacity-0 group-hover:opacity-100 flex-shrink-0" />
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
    [router]
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
        <div className="flex items-center gap-3">
          <Image
            src="/back.svg"
            alt="Back"
            width={24}
            height={24}
            className="cursor-pointer"
            onClick={() => router.back()}
          />
          <h2 className="type-h2 text-primary">Search results</h2>
        </div>
        <GlassCardContainer>
          <p className="text-secondary type-body">Please enter a search query.</p>
        </GlassCardContainer>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-3">
          <Image
            src="/back.svg"
            alt="Back"
            width={24}
            height={24}
            className="cursor-pointer"
            onClick={() => router.back()}
          />
          <h2 className="type-h2 text-primary">Search results</h2>
        </div>
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
