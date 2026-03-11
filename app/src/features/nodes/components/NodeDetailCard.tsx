'use client';

import React from "react";
import { GlassCardContainer } from "@/shared/components/ui/GlassCardContainer";
import { StatusBadge, StatusType } from "@/shared/components/ui/StatusBadge";
import Image from "next/image";
import { CopyButton } from "@/shared/components/ui/CopyButton";

export interface NodeDetailCardProps {
  /** 节点名称 */
  name: string;
  /** 节点状态 */
  status?: StatusType;
  /** 哈希值 */
  hash: string;
  /** 地理位置 */
  location?: string;
  /** 最后出现时间 */
  lastSeen?: string;
  /** 自定义类名 */
  className?: string;
}

export const NodeDetailCard: React.FC<NodeDetailCardProps> = ({
  name,
  status = "Active",
  hash,
  location,
  lastSeen,
  className = "",
}) => {
  return (
    <GlassCardContainer className={className}>
      <div className="flex flex-col justify-center items-start gap-2">
        {/* 标题和状态 */}
        <div className="flex justify-between items-center w-full">
          <div className="inline-flex justify-start items-center gap-2">
            <div className="text-primary text-lg font-semibold leading-5">
              {name}
            </div>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* 哈希值和复制按钮 - 不显示 label，copy 按钮离 value 8px */}
        <div className="inline-flex justify-start items-start gap-2 w-full">
          <div className="text-purple text-sm leading-5 break-all">
            {hash}
          </div>
          <CopyButton
            text={hash}
            ariaLabel="Copy hash"
            className="flex-shrink-0"
          />
        </div>

        {/* 位置和 Last seen on - 在同一行，间距 24px */}
        {location && (
          <div className="inline-flex justify-start items-center gap-6">
            <div className="flex justify-start items-center gap-1">
              <div className="w-4 h-4 relative">
                <Image
                  src="/location.svg"
                  alt="Location"
                  width={16}
                  height={16}
                  className="w-full h-full"
                />
              </div>
              <div className="text-primary text-sm leading-5">{location}</div>
            </div>
            
            {/* Last seen on 显示在地点右侧 24px */}
            {lastSeen && (
              <div className="text-primary text-sm leading-5">
                Last seen on: {lastSeen}
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCardContainer>
  );
};
