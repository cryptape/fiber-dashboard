"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ArrowRight, Zap, Clock, X } from "lucide-react";
import { ChannelState, BasicChannelInfo } from "@/lib/types";
import { u64LittleEndianToDecimal } from "@/lib/utils";
import { useChannelsByState } from "../hooks/useChannels";

interface ChannelsByStateProps {
  className?: string;
}

export default function ChannelsByState({ className }: ChannelsByStateProps) {
  const router = useRouter();
  const [selectedState, setSelectedState] = useState<ChannelState>("open");

  const { data: channelsData, isLoading } = useChannelsByState(
    selectedState,
    0
  );

  // Fetch counts for all states
  const { data: openCount } = useChannelsByState("open", 0);
  const { data: commitmentCount } = useChannelsByState("commitment", 0);
  const { data: closedCount } = useChannelsByState("closed", 0);

  const getStateCount = (state: ChannelState) => {
    const data =
      state === "open"
        ? openCount
        : state === "commitment"
          ? commitmentCount
          : closedCount;
    const count = data?.list?.length || 0;
    const hasMore = (data?.next_page || 0) > 1;
    return hasMore ? `${count}+` : count.toString();
  };

  console.log("ChannelsByState data:", channelsData);
  console.log("ChannelsByState isLoading:", isLoading);

  const handleChannelClick = (channelOutpoint: string) => {
    router.push(`/channel/${encodeURIComponent(channelOutpoint)}`);
  };

  const getStateIcon = (state: ChannelState) => {
    switch (state) {
      case "open":
        return <Zap className="h-4 w-4 text-green-500" />;
      case "commitment":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "closed":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStateBadgeVariant = (
    state: ChannelState
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

  const formatChannelId = (channelId: string) => {
    if (channelId.length <= 16) return channelId;
    return `${channelId.slice(0, 8)}...${channelId.slice(-8)}`;
  };

  const states: ChannelState[] = ["open", "commitment", "closed"];

  console.log("Rendering with channelsData:", channelsData);
  console.log("List length:", channelsData?.list?.length);

  return (
    <Card className={`card-zed card-zed-hover group ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg font-semibold text-foreground">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            Channels by State
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* State selector buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {states.map(state => (
            <Button
              key={state}
              variant={selectedState === state ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedState(state)}
              className="flex items-center gap-2 capitalize"
            >
              {getStateIcon(state)}
              {state}
              <span className="text-xs opacity-75">
                ({getStateCount(state)})
              </span>
            </Button>
          ))}
        </div>

        {/* Channels list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {channelsData?.list && channelsData.list.length > 0 ? (
              channelsData.list.map((channel: BasicChannelInfo) => (
                <div
                  key={channel.channel_outpoint}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group/item"
                  onClick={() => handleChannelClick(channel.channel_outpoint)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStateIcon(selectedState)}
                      <Badge
                        variant={getStateBadgeVariant(selectedState)}
                        className="capitalize text-xs"
                      >
                        {selectedState}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground truncate">
                        {formatChannelId(channel.channel_outpoint)}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Last Block:{" "}
                        {Number(
                          u64LittleEndianToDecimal(channel.last_block_number)
                        ).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono truncate hidden md:inline">
                        Last TX: {formatChannelId(channel.last_tx_hash)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
                      onClick={e => {
                        e.stopPropagation();
                        handleChannelClick(channel.channel_outpoint);
                      }}
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No {selectedState} channels found
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
