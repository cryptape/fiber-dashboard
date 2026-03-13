"use client";

import { useRouter } from "next/navigation";
import { DetailCard } from "@/shared/components/ui";
import { GlassCardContainer } from "@/shared/components/ui/GlassCardContainer";
import { CopyButton } from "@/shared/components/ui/CopyButton";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { formatTimestamp } from "../utils";
import type { NodeInfoResponse } from "@/lib/types";
import Image from "next/image";
import { useState } from "react";

interface ChannelParticipantsProps {
  node1Info?: NodeInfoResponse | null;
  node2Info?: NodeInfoResponse | null;
  node1Id?: string;
  node2Id?: string;
}

function UnannouncedNodeCard({
  nodeLabel,
  nodeId,
}: {
  nodeLabel: string;
  nodeId?: string;
}) {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <GlassCardContainer>
      <div className="flex flex-col justify-center items-start gap-2">
        {/* 顶部标签行 */}
        <div className="flex items-center justify-between w-full">
          <div className="type-label text-secondary">{nodeLabel}</div>
          {nodeId && (
            <button
              onClick={() => router.push(`/node/${encodeURIComponent(nodeId)}`)}
              className="type-button2 text-purple cursor-pointer hover:underline"
            >
              View details
            </button>
          )}
        </div>

        {/* 标题行 */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold leading-5" style={{ color: "#76778B" }}>
            Unannounced node
          </span>
          <Tooltip
            content="Participates in the network but does not publish its address"
            show={showTooltip}
            placement="top"
          >
            <div
              className="w-4 h-4 cursor-pointer"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Image src="/info.svg" alt="info" width={16} height={16} className="w-full h-full" />
            </div>
          </Tooltip>
        </div>

        {/* Last seen */}
        <div className="type-body text-secondary mt-2 mb-3">Last seen: -</div>

        {/* Node ID hash */}
        {nodeId && (
          <div className="inline-flex justify-start items-start gap-2 w-full">
            <div className="flex items-start min-w-0 flex-1">
              <div className="text-purple text-sm leading-5 break-all">{nodeId}</div>
              <CopyButton text={nodeId} ariaLabel="Copy node id" className="ml-2 flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Location placeholder */}
        <div className="inline-flex justify-start items-start gap-6">
          <div className="flex justify-start items-center gap-1">
            <div className="w-4 h-4 relative">
              <Image src="/location.svg" alt="Location" width={16} height={16} className="w-full h-full" />
            </div>
            <div className="text-primary text-sm leading-5">-</div>
          </div>
        </div>
      </div>
    </GlassCardContainer>
  );
}

export function ChannelParticipants({
  node1Info,
  node2Info,
  node1Id,
  node2Id,
}: ChannelParticipantsProps) {
  const router = useRouter();

  const renderNodeCard = (
    nodeInfo: NodeInfoResponse | null | undefined,
    nodeId: string | undefined,
    label: string
  ) => {
    if (nodeInfo) {
      return (
        <DetailCard
          name={nodeInfo.node_name || "Unknown Node"}
          status="Active"
          hash={nodeInfo.node_id}
          showHashLabel={false}
          location={
            nodeInfo.city && nodeInfo.country_or_region
              ? `${nodeInfo.city}, ${nodeInfo.country_or_region}`
              : nodeInfo.country_or_region || "Unknown"
          }
          lastSeen={formatTimestamp(nodeInfo.announce_timestamp)}
          topExtra={
            <div className="flex items-center justify-between">
              <div className="type-label text-secondary">{label}</div>
              <button
                onClick={() =>
                  router.push(`/node/${encodeURIComponent(nodeInfo.node_id)}`)
                }
                className="type-button2 text-purple cursor-pointer hover:underline"
              >
                View details
              </button>
            </div>
          }
        />
      );
    }
    return <UnannouncedNodeCard nodeLabel={label} nodeId={nodeId} />;
  };

  // 有信息的节点排在左边
  const node1HasInfo = !!node1Info;
  const node2HasInfo = !!node2Info;
  const swapOrder = !node1HasInfo && node2HasInfo;

  const leftCard = swapOrder
    ? renderNodeCard(node2Info, node2Id, "NODE #1")
    : renderNodeCard(node1Info, node1Id, "NODE #1");
  const rightCard = swapOrder
    ? renderNodeCard(node1Info, node1Id, "NODE #2")
    : renderNodeCard(node2Info, node2Id, "NODE #2");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {leftCard}
      {rightCard}
    </div>
  );
}
