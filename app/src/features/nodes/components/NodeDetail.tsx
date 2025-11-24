import { DetailCard, PageHeader, KpiCard, SectionHeader, Table, Pagination, GlassCardContainer, StatusBadge } from "@/shared/components/ui";
import type { ColumnDef, SortState } from "@/shared/components/ui";
import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { RustChannelInfo, RustNodeInfo } from "@/lib/types";
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
  const [sortKey, setSortKey] = useState<string>('capacity');
  const [sortState, setSortState] = useState<SortState>('descending');
  const itemsPerPage = 10;

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

  // 拉取所有活跃通道并过滤出与当前节点相关的通道
  const { data: allChannels = [] } = useQuery<RustChannelInfo[]>({
    queryKey: ["channels", currentNetwork],
    queryFn: () => apiClient.fetchAllActiveChannels(),
    staleTime: 300000,
  });

  const nodeChannels = useMemo(() => {
    return allChannels.filter(
      (ch) => ch.node1 === nodeId || ch.node2 === nodeId
    );
  }, [allChannels, nodeId]);

  // 统计：总通道数与总容量（容量统计不除以2）
  const totalChannels = nodeChannels.length;

  const totalCapacity = useMemo(() => {
    // 使用工具方法汇总容量（CKB）
    return APIUtils.getTotalCapacityFromChannels(nodeChannels);
  }, [nodeChannels]);

  const autoAcceptCkb = useMemo(() => {
    // auto_accept_min_ckb_funding_amount 已经是 Shannon 单位的数值
    // 直接返回该值，由 KpiCard 的 formatNumber 自动格式化
    return nodeInfo?.auto_accept_min_ckb_funding_amount ?? 0;
  }, [nodeInfo]);

  const locationText = useMemo(() => {
    if (!nodeInfo) return "Unknown";
    const { city, country } = nodeInfo;
    return city && country ? `${city}, ${country}` : country || "Unknown";
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

  // 将真实通道数据映射到表格所需结构，同时保留原始数值用于排序
  const realChannelRows = useMemo(() => {
    return nodeChannels.map((ch) => {
      const capacityCkb = APIUtils.parseChannelCapacityToCKB(ch.capacity);
      const createdTimestamp = ch.created_timestamp ? new Date(ch.created_timestamp).getTime() : 0;
      const commitTimestamp = ch.commit_timestamp ? new Date(ch.commit_timestamp).getTime() : 0;
      
      return {
        channelId: ch.channel_outpoint,
        status: "Active" as const,
        capacity: formatCompactNumber(capacityCkb),
        capacityRaw: capacityCkb, // 用于排序的原始数值
        createdOn: ch.created_timestamp ? new Date(ch.created_timestamp).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        }) : "-",
        createdOnRaw: createdTimestamp, // 用于排序的时间戳
        lastCommittedOn: ch.commit_timestamp ? new Date(ch.commit_timestamp).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        }) : "-",
        lastCommittedOnRaw: commitTimestamp, // 用于排序的时间戳
      };
    });
  }, [nodeChannels]);

  // 先排序，再分页
  const sortedChannelRows = useMemo(() => {
    const rows = [...realChannelRows];
    
    rows.sort((a, b) => {
      switch (sortKey) {
        case 'capacity': {
          const aValue = a.capacityRaw as number;
          const bValue = b.capacityRaw as number;
          return sortState === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        case 'createdOn': {
          const aValue = a.createdOnRaw as number;
          const bValue = b.createdOnRaw as number;
          return sortState === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        case 'lastCommittedOn': {
          const aValue = a.lastCommittedOnRaw as number;
          const bValue = b.lastCommittedOnRaw as number;
          return sortState === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        default:
          return 0;
      }
    });

    return rows;
  }, [realChannelRows, sortKey, sortState]);

  const tableSource = sortedChannelRows;

  const totalPages = Math.ceil(tableSource.length / itemsPerPage);
  const paginatedData = tableSource.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 表格列定义
  const columns: ColumnDef<ChannelData>[] = [
    {
      key: "channelId",
      label: "Channel ID",
      width: "flex-1",
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
      sortable: true,
      render: (value) => <span className="text-purple font-semibold">{value as string}</span>,
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
          value={String(totalCapacity)}
          unit="CKB"
        />
        <KpiCard
          label="AUTO ACCEPT"
          value={String(autoAcceptCkb)}
          unit="CKB"
        />
      </div>
      <SectionHeader title={`Channels(${tableSource.length})`} />
      
      {/* 表格和分页 */}
      <GlassCardContainer className="mt-4">
        <Table 
          columns={columns} 
          data={paginatedData}
          onSort={(key, state) => {
            setSortKey(key);
            setSortState(state);
          }}
          defaultSortKey="capacity"
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
