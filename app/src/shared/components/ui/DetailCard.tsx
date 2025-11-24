import React from "react";
import { GlassCardContainer } from "./GlassCardContainer";
import { StatusBadge, StatusType } from "./StatusBadge";
import Image from "next/image";

export interface DetailCardProps {
  /** 节点名称 */
  name: string;
  /** 节点状态 */
  status?: StatusType;
  /** 是否显示状态徽章 */
  showStatus?: boolean;
  /** 哈希值 */
  hash: string;
  /** 地理位置 */
  location?: string;
  /** 最后出现时间 */
  lastSeen?: string;
  /** 创建时间 */
  createdOn?: string;
  /** 最后提交时间 */
  lastCommitted?: string;
  /** 右上角标签（如 Block Number） */
  topRightLabel?: string;
  /** 顶部额外内容（如 NODE #1 标签） */
  topExtra?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 复制哈希的回调函数 */
  onCopyHash?: () => void;
}

export const DetailCard: React.FC<DetailCardProps> = ({
  name,
  status = "Active",
  showStatus = true,
  hash,
  location,
  lastSeen,
  createdOn,
  lastCommitted,
  topRightLabel,
  topExtra,
  className = "",
  onCopyHash,
}) => {
  const handleCopyHash = () => {
    navigator.clipboard.writeText(hash);
    onCopyHash?.();
  };

  return (
    <GlassCardContainer className={className}>
      <div className="flex flex-col justify-center items-start gap-2">
        {/* 顶部额外内容 */}
        {topExtra && <div className="w-full">{topExtra}</div>}

        {/* 标题和状态 */}
        <div className="flex justify-between items-center w-full">
          <div className="inline-flex justify-start items-center gap-2">
            <div className="text-primary text-lg font-semibold leading-5">
              {name}
            </div>
            {showStatus && <StatusBadge text={status} status={status} />}
          </div>
          {topRightLabel && (
            <div className="type-body text-primary border border-[#D9D9D9] px-2 py-1">
              {topRightLabel}
            </div>
          )}
        </div>

        {/* 哈希值和复制按钮 */}
        <div className="inline-flex justify-start items-center gap-2 w-full">
          <div className="text-purple text-base leading-7 font-['Lato'] break-all flex-1">
            {hash}
          </div>
          <button
            onClick={handleCopyHash}
            className="w-4 h-4 relative cursor-pointer hover:opacity-70 transition-opacity flex-shrink-0"
            aria-label="复制哈希"
          >
            <Image
              src="/copy.svg"
              alt="复制"
              width={16}
              height={16}
              className="w-full h-full"
            />
          </button>
        </div>

        {/* 位置和最后出现时间 */}
        <div className="inline-flex justify-start items-start gap-6">
          {location && (
            <div className="flex justify-start items-center gap-1">
              <div className="w-4 h-4 relative">
                <Image
                  src="/location.svg"
                  alt="位置"
                  width={16}
                  height={16}
                  className="w-full h-full"
                />
              </div>
              <div className="text-primary text-sm leading-5">{location}</div>
            </div>
          )}

          {lastSeen && (
            <div className="flex justify-start items-center gap-2">
              <div className="text-primary text-sm leading-5">
                Last seen on: {lastSeen}
              </div>
            </div>
          )}
        </div>

        {/* 创建时间和最后提交时间 */}
        {(createdOn || lastCommitted) && (
          <div className="inline-flex justify-start items-start gap-6">
            {createdOn && (
              <div className="flex justify-start items-center gap-2">
                <div className="text-primary text-sm leading-5">
                  Created on: {createdOn}
                </div>
              </div>
            )}

            {lastCommitted && (
              <div className="flex justify-start items-center gap-2">
                <div className="text-primary text-sm leading-5">
                  Last committed: {lastCommitted}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCardContainer>
  );
};
