import { DetailCard, PageHeader, KpiCard, SectionHeader, Table, Pagination, GlassCardContainer, StatusBadge } from "@/shared/components/ui";
import type { ColumnDef, SortState } from "@/shared/components/ui";
import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { RustNodeInfo } from "@/lib/types";
import { APIUtils } from "@/lib/client";
import { formatCompactNumber } from "@/lib/utils";

interface ChannelData extends Record<string, unknown> {
  channelId: string;
  status: "Active" | "Inactive";
  capacity: string;
  createdOn: string;
  lastCommittedOn: string;
}

export const NodeDetail = () => {
  const params = useParams();
  const nodeId = decodeURIComponent(params.nodeId as string);
  const { apiClient, currentNetwork } = useNetwork();
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('lastCommittedOn');
  const [sortState, setSortState] = useState<SortState>('descending');
  const PAGE_SIZE = 10;

  // 当排序条件改变时，自动重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [sortKey, sortState]);

  // 拉取节点信息
  const { data: nodeInfo } = useQuery<RustNodeInfo>({
    queryKey: ["node-info", nodeId, currentNetwork],
    queryFn: () => apiClient.getNodeInfo(nodeId),
    enabled: !!nodeId,
    retry: 3,
  });

  // 使用新接口：直接拉取该节点的通道数据（支持分页和排序）
  const { data: channelsResponse } = useQuery({
    queryKey: ["node-channels", nodeId, currentNetwork, currentPage, sortKey, sortState],
    queryFn: () => {
      // 将前端的 sortKey 映射到后端的 sort_by
      const sortBy = sortKey === 'createdOn' ? 'create_time' : 'last_commit_time';
      const order = sortState === 'ascending' ? 'asc' : 'desc';
      return apiClient.getChannelsByNodeId(nodeId, currentPage - 1, sortBy, order);
    },
    enabled: !!nodeId,
    staleTime: 0, // 关闭缓存，确保每次排序都重新请求
  });

  const nodeChannels = channelsResponse?.channels || [];
  const totalCount = channelsResponse?.total_count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 统计：总通道数（后端已返回分页数据，需要获取总数）
  const totalChannels = nodeInfo?.channel_count || 0;

  const autoAcceptCkb = useMemo(() => {
    // auto_accept_min_ckb_funding_amount 已经是 Shannon 单位的数值
    // 直接返回该值，由 KpiCard 的 formatNumber 自动格式化
    return nodeInfo?.auto_accept_min_ckb_funding_amount ?? 0;
  }, [nodeInfo]);

  const locationText = useMemo(() => {
    if (!nodeInfo) return "Unknown";
    const { city, country_or_region } = nodeInfo;
    return city && country_or_region ? `${city}, ${country_or_region}` : country_or_region || "Unknown";
  }, [nodeInfo]);

  const lastSeenText = useMemo(() => {
    if (!nodeInfo) return "";
    try {
      return new Date(nodeInfo.announce_timestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }, [nodeInfo]);

  // 将真实通道数据映射到表格所需结构
  const realChannelRows = useMemo(() => {
    return nodeChannels.map((ch) => {
      const capacityCkb = APIUtils.parseChannelCapacityToCKB(ch.capacity);
      
      return {
        channelId: ch.channel_outpoint,
        status: "Active" as const,
        capacity: formatCompactNumber(capacityCkb),
        createdOn: ch.created_timestamp ? new Date(ch.created_timestamp).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        }) : "-",
        lastCommittedOn: ch.last_commit_time ? new Date(ch.last_commit_time).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        }) : "-",
      };
    });
  }, [nodeChannels]);

  // 后端已经处理了排序和分页，前端直接展示
  const paginatedData = realChannelRows;

  // 表格列定义
  const columns: ColumnDef<ChannelData>[] = [
    {
      key: "channelId",
      label: "Channel ID",
      width: "w-100",
      render: (value) => (
        <button
          onClick={() => router.push(`/channel/${value}`)}
          className="text-primary hover:underline cursor-pointer text-left truncate w-full"
        >
          {value as string}
        </button>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "w-32",
      render: (value) => (
        <StatusBadge text={value as string} status={value as "Active" | "Inactive"} />
      ),
    },
    {
      key: "capacity",
      label: "Capacity (CKB)",
      width: "w-40",
      sortable: false,
      render: (value) => (
        <span className="text-purple font-semibold truncate block">
          {value as string}
        </span>
      ),
    },
    {
      key: "createdOn",
      label: "Created on",
      width: "w-36",
      sortable: true,
    },
    {
      key: "lastCommittedOn",
      label: "Last committed on",
      width: "w-50",
      sortable: true,
    },
  ];
  return (
    <div>
      <PageHeader title="Node Details" />
      <DetailCard
        name={nodeInfo?.node_name || ""}
        status={"Active"}
        hash={nodeInfo?.node_id || ""}
        location={locationText}
        lastSeen={lastSeenText}
        onCopyHash={() => {
          const text = nodeInfo?.node_id || "";
          if (text) navigator.clipboard.writeText(text);
        }}
      />
      
      {/* KPI 卡片 */}
      <div className="grid grid-cols-3 gap-4 mt-4 mb-5">
        <KpiCard
          label="TOTAL CHANNELS"
          value={String(totalChannels)}
        />
        <KpiCard
          label="CAPACITY"
          value={'N/A'}
          unit="CKB"
        />
        <KpiCard
          label="AUTO ACCEPT"
          value={String(autoAcceptCkb)}
          unit="CKB"
        />
      </div>
      <SectionHeader title={`Channels(${totalChannels})`} />
      
      {/* 表格和分页 */}
      <GlassCardContainer className="mt-4">
        <Table 
          columns={columns} 
          data={paginatedData}
          onSort={(key, state) => {
            setSortKey(key);
            setSortState(state);
          }}
          defaultSortKey="lastCommittedOn"
          defaultSortState="descending"
        />
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </GlassCardContainer>
    </div>
  );
};
