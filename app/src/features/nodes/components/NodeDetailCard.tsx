'use client';

import React, { useState } from "react";
import { GlassCardContainer } from "@/shared/components/ui/GlassCardContainer";
import { StatusBadge, StatusType } from "@/shared/components/ui/StatusBadge";
import { Tooltip } from "@/shared/components/ui/Tooltip";
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
  /** 是否为未公告节点 */
  isUnannounced?: boolean;
}

export const NodeDetailCard: React.FC<NodeDetailCardProps> = ({
  name,
  status = "Active",
  hash,
  location,
  lastSeen,
  className = "",
  isUnannounced = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <GlassCardContainer className={className}>
      <div className="flex flex-col justify-center items-start gap-2">
        {/* 标题和状态 */}
        <div className="flex justify-between items-center w-full">
          <div className="inline-flex justify-start items-center gap-2">
            {isUnannounced ? (
              <>
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
              </>
            ) : (
              <>
                <div className="text-primary text-lg font-semibold leading-5">
                  {name}
                </div>
                <StatusBadge status={status} />
              </>
            )}
          </div>
        </div>

        {/* Last seen */}
        {isUnannounced ? (
          <div className="type-body text-secondary mt-2 mb-3">Last seen: -</div>
        ) : (
          lastSeen && (
            <div className="type-body text-secondary mt-2 mb-3">
              Last seen on: {lastSeen}
            </div>
          )
        )}

        {/* 哈希值和复制按钮 */}
        {hash && (
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
        )}

        {/* 位置 */}
        {isUnannounced ? (
          <div className="inline-flex justify-start items-start gap-6">
            <div className="flex justify-start items-center gap-1">
              <div className="w-4 h-4 relative">
                <Image src="/location.svg" alt="Location" width={16} height={16} className="w-full h-full" />
              </div>
              <div className="text-primary text-sm leading-5">-</div>
            </div>
          </div>
        ) : (
          location && (
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
            </div>
          )
        )}
      </div>
    </GlassCardContainer>
  );
};
