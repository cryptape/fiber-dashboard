"use client";

import { useParams } from "next/navigation";
import {
  DetailCard,
  KpiCard,
  SectionHeader,
  PageHeader,
} from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCompactNumber, hexToDecimal } from "@/lib/utils";
import { formatTimestamp } from "../utils";
import { useChannelData } from "../hooks/useChannelData";
import { ChannelParticipants } from "./ChannelParticipants";
import { ChannelLifecycle } from "./ChannelLifecycle";

export default function ChannelDetailPage() {
  const params = useParams();
  const channelOutpoint = params.channelOutpoint
    ? decodeURIComponent(params.channelOutpoint as string)
    : "";

  const {
    channelInfo,
    channelState,
    node1Info,
    node2Info,
    isLoading,
    error,
  } = useChannelData(channelOutpoint);

  // 格式化时间戳为日期和时间
  const formatTxTimestamp = (timestamp: string) => {
    let date: Date;
    
    if (typeof timestamp === "string") {
      if (timestamp.startsWith("0x")) {
        date = new Date(Number(hexToDecimal(timestamp)));
      } else if (/^\d+$/.test(timestamp)) {
        date = new Date(Number(timestamp));
      } else {
        date = new Date(timestamp);
      }
    } else {
      date = new Date(timestamp);
    }
    
    const dateStr = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    
    const timeStr = date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    
    return { date: dateStr, time: timeStr };
  };

  // 错误处理
  if (error) {
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
            Error: {error?.message || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  // 加载状态
  if (isLoading) {
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Channel Details" />
      {/* Channel 基本信息卡片 */}
      <DetailCard
        name="Channel"
        status={channelState.state}
        hash={channelInfo.channel_outpoint}
        showHashLabel={false}
        createdOn={formatTimestamp(channelInfo.created_timestamp)}
        lastCommitted={formatTimestamp(channelInfo.commit_timestamp)}
      />

      {/* KPI 卡片 */}
      <div className={`grid grid-cols-1 gap-5 ${channelState.state === "commitment" || channelState.state === "settled" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <KpiCard
          label="CAPACITY"
          value={(() => {
            // 将容量从十六进制 Shannon 转换为 CKB
            const capacityInShannon = hexToDecimal(channelInfo.capacity);
            const capacityInCKB = Number(capacityInShannon) / 100_000_000;
            return formatCompactNumber(capacityInCKB);
          })()}
          unit="CKB"
        />
        <KpiCard
          label="OPENED ON"
          value={channelState.txs.length > 0 ? formatTxTimestamp(channelState.txs[0].timestamp).date : "-"}
          unit={channelState.txs.length > 0 ? formatTxTimestamp(channelState.txs[0].timestamp).time : ""}
        />
        {/* 如果是 commitment 状态，显示最后提交时间 */}
        {channelState.state === "commitment" && channelState.txs.length > 0 && (
          <KpiCard
            label="LAST COMMITTED ON"
            value={formatTxTimestamp(channelState.txs[channelState.txs.length - 1].timestamp).date}
            unit={formatTxTimestamp(channelState.txs[channelState.txs.length - 1].timestamp).time}
          />
        )}
        {/* 如果是 settled 状态，显示关闭时间 */}
        {channelState.state === "settled" && channelState.txs.length > 0 && (
          <KpiCard
            label="CLOSED ON"
            value={formatTxTimestamp(channelState.txs[channelState.txs.length - 1].timestamp).date}
            unit={formatTxTimestamp(channelState.txs[channelState.txs.length - 1].timestamp).time}
          />
        )}
      </div>

      {/* Nodes */}
      <div className="mt-3">
        <SectionHeader title="Channel Participants" />
      </div>

      <ChannelParticipants node1Info={node1Info} node2Info={node2Info} />

      <div className="mt-3">
        <SectionHeader title="Channel Lifecycle" />
      </div>

      <ChannelLifecycle
        channelState={channelState}
      />
      
    </div>
  );
}
