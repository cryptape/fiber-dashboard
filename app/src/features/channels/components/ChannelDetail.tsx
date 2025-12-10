"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DetailCard,
  KpiCard,
  SectionHeader,
  PageHeader,
} from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { formatCompactNumber, hexToDecimal } from "@/lib/utils";

export default function ChannelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const channelOutpoint = params.channelOutpoint
    ? decodeURIComponent(params.channelOutpoint as string)
    : "";
  const { apiClient, currentNetwork } = useNetwork();

  // 获取通道信息
  const {
    data: channelInfo,
    isLoading: channelLoading,
    error: channelError,
  } = useQuery({
    queryKey: ["channel-info", channelOutpoint, currentNetwork],
    queryFn: () => apiClient.getChannelInfo(channelOutpoint),
    enabled: !!channelOutpoint,
    retry: 3,
  });

  // 获取通道状态和交易信息
  const {
    data: channelState,
    isLoading: stateLoading,
    error: stateError,
  } = useQuery({
    queryKey: ["channel-state", channelOutpoint, currentNetwork],
    queryFn: () => apiClient.getChannelState(channelOutpoint),
    enabled: !!channelOutpoint,
    retry: 3,
  });

  // 获取节点1信息
  const { data: node1Info } = useQuery({
    queryKey: ["node-info", channelInfo?.node1, currentNetwork],
    queryFn: () => apiClient.getNodeInfo(channelInfo!.node1),
    enabled: !!channelInfo?.node1,
  });

  // 获取节点2信息
  const { data: node2Info } = useQuery({
    queryKey: ["node-info", channelInfo?.node2, currentNetwork],
    queryFn: () => apiClient.getNodeInfo(channelInfo!.node2),
    enabled: !!channelInfo?.node2,
  });

  // 错误处理
  if (channelError || stateError) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Channel Details" />
        <div className="card-zed p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Channel Not Found</h2>
          <p className="text-secondary">
            The channel with ID {channelOutpoint} could not be found or is not
            accessible.
          </p>
          <p className="text-sm text-secondary mt-2">
            Error:{" "}
            {channelError?.message || stateError?.message || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  // 加载状态
  if (channelLoading || stateLoading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Channel Details" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // 没有数据
  if (!channelInfo || !channelState) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Channel Details" />
        <div className="card-zed p-8 text-center">
          <p className="text-secondary">No channel data available.</p>
        </div>
      </div>
    );
  }

  // 转换数据格式
  const getStatusFromState = (state: string): "Active" | "Inactive" => {
    return state === "open" ? "Active" : "Inactive";
  };

  const formatTimestamp = (timestamp: string | number) => {
    let date: Date;

    if (typeof timestamp === "string") {
      if (timestamp.startsWith("0x")) {
        // 十六进制格式，需要转换
        date = new Date(Number(hexToDecimal(timestamp)));
      } else if (/^\d+$/.test(timestamp)) {
        // 纯数字字符串（时间戳）
        date = new Date(Number(timestamp));
      } else {
        // ISO 字符串或其他日期格式
        date = new Date(timestamp);
      }
    } else {
      date = new Date(timestamp);
    }

    // 检查是否是有效日期
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Channel Details" />
      {/* Channel 基本信息卡片 */}
      <DetailCard
        name="Channel"
        status={getStatusFromState(channelState.state)}
        hash={channelInfo.channel_outpoint}
        createdOn={formatTimestamp(channelInfo.created_timestamp)}
        lastCommitted={formatTimestamp(channelInfo.commit_timestamp)}
      />

      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <KpiCard
          label="CAPACITY"
          value={formatCompactNumber(channelInfo.capacity)}
          unit="CKB"
        />
        <KpiCard
          label="TOTAL TRANSACTIONS"
          value={channelState.txs.length.toString()}
        />
      </div>

      {/* Channel Transactions */}
      <div className="mt-3">
        <SectionHeader
          title={`Channel Transactions (${channelState.txs.length})`}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {channelState.txs.length > 0 ? (
          channelState.txs.map((tx, index) => (
            <DetailCard
              key={tx.tx_hash}
              name={`Transaction #${index + 1}`}
              showStatus={false}
              hash={tx.tx_hash}
              topRightLabel={`BLOCK #${tx.block_number}`}
              commitmentArgs={tx.commitment_args ?? "-"}
            />
          ))
        ) : (
          <div className="col-span-2 card-zed p-8 text-center">
            <p className="text-secondary">No transactions found</p>
          </div>
        )}
      </div>

      {/* Nodes */}
      <div className="mt-3">
        <SectionHeader title="Nodes" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Node 1 */}
        {node1Info ? (
          <DetailCard
            name={node1Info.node_name || "Unknown Node"}
            status="Active"
            hash={node1Info.node_id}
            location={
              node1Info.city && node1Info.country_or_region
                ? `${node1Info.city}, ${node1Info.country_or_region}`
                : node1Info.country_or_region || "Unknown"
            }
            lastSeen={formatTimestamp(node1Info.announce_timestamp)}
            topExtra={
              <div className="flex items-center justify-between">
                <div className="type-label text-secondary">NODE #1</div>
                <button
                  onClick={() =>
                    router.push(
                      `/node/${encodeURIComponent(node1Info.node_id)}`
                    )
                  }
                  className="type-button1 text-purple cursor-pointer hover:underline"
                >
                  View details
                </button>
              </div>
            }
          />
        ) : (
          <Skeleton className="h-48 w-full" />
        )}

        {/* Node 2 */}
        {node2Info ? (
          <DetailCard
            name={node2Info.node_name || "Unknown Node"}
            status="Active"
            hash={node2Info.node_id}
            location={
              node2Info.city && node2Info.country_or_region
                ? `${node2Info.city}, ${node2Info.country_or_region}`
                : node2Info.country_or_region || "Unknown"
            }
            lastSeen={formatTimestamp(node2Info.announce_timestamp)}
            topExtra={
              <div className="flex items-center justify-between">
                <div className="type-label text-secondary">NODE #2</div>
                <button
                  onClick={() =>
                    router.push(
                      `/node/${encodeURIComponent(node2Info.node_id)}`
                    )
                  }
                  className="type-button1 text-purple cursor-pointer hover:underline"
                >
                  View details
                </button>
              </div>
            }
          />
        ) : (
          <Skeleton className="h-48 w-full" />
        )}
      </div>
    </div>
  );
}
