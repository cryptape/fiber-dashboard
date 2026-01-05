'use client';

import React, { useState } from 'react';
import { StatusBadge, StatusType } from './StatusBadge';
import Image from 'next/image';
import type { ColumnDef } from './Table';
import { Table } from './Table';
import { GlassCardContainer } from './GlassCardContainer';

export interface CollapsibleSectionProps<T = Record<string, unknown>> {
  /** 标题 */
  title: string;
  /** 标题右侧文字 */
  titleRight?: string;
  /** 徽章信息 */
  badge?: {
    text: string;
    status: StatusType;
  };
  /** 表格列定义 */
  tableColumns?: ColumnDef<T>[];
  /** 表格数据 */
  tableData?: T[];
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 是否禁用折叠功能（纯标题模式） */
  disableCollapse?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const CollapsibleSection = <T extends Record<string, unknown>>({
  title,
  titleRight,
  badge,
  tableColumns,
  tableData,
  defaultExpanded = false,
  disableCollapse = false,
  className = '',
}: CollapsibleSectionProps<T>) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <GlassCardContainer className={className}>
      <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-start gap-4">
          {disableCollapse ? (
            // 纯标题模式
            <div className="type-h3 text-primary">{title}</div>
          ) : (
            // 可折叠模式
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-start gap-1 cursor-pointer transition-opacity hover:opacity-70"
              aria-label={isExpanded ? '收起' : '展开'}
            >
              <div className="relative h-4 w-4 overflow-hidden flex items-center justify-center">
                <Image
                  src="/right.svg"
                  alt={isExpanded ? '收起' : '展开'}
                  width={16}
                  height={16}
                  className="transition-transform duration-200"
                  style={{
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                />
              </div>
              <div className="type-subheader text-primary">{title}</div>
            </button>
          )}
          {badge && <StatusBadge text={badge.text} status={badge.status} />}
        </div>
        {titleRight && (
          <div className="type-body text-secondary">{titleRight}</div>
        )}
      </div>

      {/* Expanded Content - Table */}
      {!disableCollapse && isExpanded && tableColumns && tableData && (
        <div className="w-full">
          <Table columns={tableColumns} data={tableData} />
        </div>
      )}
      </div>
    </GlassCardContainer>
  );
};

export default CollapsibleSection;
