import React, { ReactNode } from "react";
import { Separator } from "./separator";
import { GlassCardContainer } from "./GlassCardContainer";

// 表格列定义
export interface TableColumn {
  key: string;
  label: string;
  width?: string; // 如: "w-48", "flex-1"
  format?: (value: unknown, row: TableRow) => ReactNode; // 可选的格式化函数
}

// 表格行数据
export interface TableRow {
  id: string;
  [key: string]: ReactNode; // 支持任意字段
}

// 表格属性
export interface EasyTableProps {
  title?: string;
  actionText?: string;
  onActionClick?: () => void;
  columns: TableColumn[];
  data: TableRow[];
  className?: string;
}

export const EasyTable = ({
  title,
  actionText,
  onActionClick,
  columns,
  data,
  className = "",
}: EasyTableProps) => {
  return (
    <GlassCardContainer className={className}>
      <div className="flex flex-col justify-center items-start gap-2">
        {/* 标题行 */}
        {(title || actionText) && (
          <div className="self-stretch flex justify-between items-start">
            {title && (
              <div className="text-secondary type-label">
                {title}
              </div>
            )}
            {actionText && onActionClick && (
              <button
                onClick={onActionClick}
                className="text-purple type-caption hover:opacity-80 hover:underline transition-opacity cursor-pointer"
              >
                {actionText}
              </button>
            )}
          </div>
        )}

        {/* 表格内容 */}
        <div className="self-stretch flex flex-col justify-start items-start">
          {/* 表头 */}
          <div className="self-stretch h-10 flex justify-start items-center">
            {columns.map((column) => (
              <div
                key={column.key}
                className={`${column.width || "flex-1"} pr-2 py-2 flex justify-start items-center gap-2.5`}
              >
                <div className="text-primary text-sm font-semibold font-['Inter']">
                  {column.label}
                </div>
              </div>
            ))}
          </div>
          
          <Separator />

          {/* 表格行 */}
          {data.map((row) => (
            <React.Fragment key={row.id}>
              <div className="self-stretch h-12 flex justify-start items-center">
                {columns.map((column) => (
                  <div
                    key={`${row.id}-${column.key}`}
                    className={`${column.width || "flex-1"} pr-2 py-2 flex justify-start items-center gap-1.5 min-w-0`}
                  >
                    <div className="text-primary text-sm font-medium font-['Inter'] truncate w-full">
                      {column.format ? column.format(row[column.key], row) : row[column.key]}
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
            </React.Fragment>
          ))}
        </div>
      </div>
    </GlassCardContainer>
  );
};
