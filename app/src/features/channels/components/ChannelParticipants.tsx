"use client";

import { useRouter } from "next/navigation";
import { DetailCard } from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatTimestamp } from "../utils";
import type { NodeInfoResponse } from "@/lib/types";

interface ChannelParticipantsProps {
  node1Info?: NodeInfoResponse;
  node2Info?: NodeInfoResponse;
}

export function ChannelParticipants({
  node1Info,
  node2Info,
}: ChannelParticipantsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Node 1 */}
      {node1Info ? (
        <DetailCard
          name={node1Info.node_name || "Unknown Node"}
          status="Active"
          hash={node1Info.node_id}
          showHashLabel={false}
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
                  router.push(`/node/${encodeURIComponent(node1Info.node_id)}`)
                }
                className="type-button2 text-purple cursor-pointer hover:underline"
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
          showHashLabel={false}
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
                  router.push(`/node/${encodeURIComponent(node2Info.node_id)}`)
                }
                className="type-button2 text-purple cursor-pointer hover:underline"
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
  );
}
