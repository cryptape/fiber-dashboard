import React from "react";
import { GlassCardContainer } from "./GlassCardContainer";
import { StatusBadge, StatusType } from "./StatusBadge";
import Image from "next/image";
import { CopyButton } from "./CopyButton";

export interface DetailCardProps {
  /** 节点名称 */
  name: string;
  /** 节点状态 */
  status?: StatusType;
  /** 是否显示状态徽章 */
  showStatus?: boolean;
  /** 哈希值 */
  hash: string;
  /** 是否显示哈希值标签 */
  showHashLabel?: boolean;
  /** 地理位置 */
  location?: string;
  /** 最后出现时间 */
  lastSeen?: string;
  /** 创建时间 */
  createdOn?: string;
  /** 最后提交时间 */
  lastCommitted?: string;
  /** Commitment Args */
  commitmentArgs?: string;
  /** 右上角标签（如 Block Number） */
  topRightLabel?: string;
  /** 顶部额外内容（如 NODE #1 标签） */
  topExtra?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 额外的键值对字段（在 commitmentArgs 下方显示） */
  extraFields?: Array<{
    key: string;
    label: string;
    value: string;
    copyable?: boolean;
  }>;
}

export const DetailCard: React.FC<DetailCardProps> = ({
  name,
  status = "Active",
  showStatus = true,
  hash,
  showHashLabel = true,
  location,
  lastSeen,
  createdOn,
  lastCommitted,
  commitmentArgs,
  topRightLabel,
  topExtra,
  className = "",
  extraFields,
}) => {

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
        <div className="inline-flex justify-start items-start gap-2 w-full">
          {showHashLabel && (
            <div className="text-body text-secondary w-32 flex-shrink-0">
              Tx hash:
            </div>
          )}
          <div className="text-purple text-sm leading-5 break-all flex-1">
            {hash}
          </div>
          <CopyButton
            text={hash}
            ariaLabel="复制哈希"
          />
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

        {/* Commitment Args */}
        {commitmentArgs && (
          <div className="inline-flex justify-start items-start gap-2 w-full">
            <div className="text-body text-secondary w-32 flex-shrink-0">
              Commitment Args:
            </div>
            <div className="text-purple text-sm leading-5 break-all flex-1">
              {commitmentArgs}
            </div>
            {commitmentArgs !== "-" && (
              <CopyButton
                text={commitmentArgs}
                ariaLabel="复制 Commitment Args"
              />
            )}
          </div>
        )}

        {/* 额外字段 */}
        {extraFields && extraFields.map((field) => (
          <div key={field.key} className="inline-flex justify-start items-start gap-2 w-full">
            <div className="text-body text-secondary w-32 flex-shrink-0">
              {field.label}:
            </div>
            <div className="text-purple text-sm leading-5 break-all flex-1">
              {field.value}
            </div>
            {field.copyable && field.value !== "-" && (
              <CopyButton
                text={field.value}
                ariaLabel={`复制 ${field.label}`}
              />
            )}
          </div>
        ))}
      </div>
    </GlassCardContainer>
  );
};
