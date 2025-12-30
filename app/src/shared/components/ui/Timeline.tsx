import { ReactNode, useState } from "react";
import { GlassCardContainer } from "./GlassCardContainer";
import { CopyButton } from "./CopyButton";
import { Separator } from "./separator";
import { Table, ColumnDef } from "./Table";

// Timeline 事件状态类型
export type TimelineEventStatus = "success" | "warning" | "error" | "info";

// 标签配置
export interface TimelineBadge {
  text: string;
  color: "success" | "warning" | "error" | "info";
  showIcon?: boolean;
  icon?: ReactNode;
}

// 底部链接配置
export interface TimelineFooterLink {
  text: string;
  onClick?: () => void;
}

// Timeline 事件项配置
export interface TimelineEventProps<T = Record<string, unknown>> {
  // 状态点颜色
  status: TimelineEventStatus;
  // 是否是第一个事件（影响顶部连接线）
  isFirst?: boolean;
  // 是否是最后一个事件（影响底部连接线）
  isLast?: boolean;
  // 标题
  title: string;
  // 标题右侧的标签（可选）
  badges?: TimelineBadge[];
  // 标题右侧的图标（可选）
  titleIcon?: ReactNode;
  // 副标题/描述（可选）
  subtitle?: string;
  // 时间戳
  timestamp?: string;
  // 主体内容
  children?: ReactNode;
  // 底部链接
  footerLinks?: TimelineFooterLink[];
  // 表格数据（可选）
  tableColumns?: ColumnDef<T>[];
  tableData?: T[];
  // 是否默认展开表格
  defaultExpanded?: boolean;
}

// 状态颜色映射
const statusColorMap: Record<
  TimelineEventStatus,
  { dot: string; badge: { bg: string; border: string; text: string } }
> = {
  success: {
    dot: "bg-success-dot",
    badge: { bg: "bg-success", border: "border-success", text: "text-success" },
  },
  warning: {
    dot: "bg-warning-dot",
    badge: { bg: "bg-warning", border: "border-warning", text: "text-warning" },
  },
  error: {
    dot: "bg-error-dot",
    badge: { bg: "bg-error", border: "border-error", text: "text-error" },
  },
  info: {
    dot: "bg-blue",
    badge: { bg: "bg-info", border: "border-info", text: "text-info" },
  },
};

// 单个 Timeline 事件组件
export const TimelineEvent = <T extends Record<string, unknown>>({
  status,
  isFirst = false,
  isLast = false,
  title,
  badges = [],
  titleIcon,
  subtitle,
  timestamp,
  children,
  footerLinks = [],
  tableColumns,
  tableData,
  defaultExpanded = false,
}: TimelineEventProps<T>) => {
  const colors = statusColorMap[status];
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasTable = tableColumns && tableData;

  return (
    <div className="flex justify-start gap-5 w-full">
      {/* 左侧时间线 */}
      <div className="flex flex-col items-center relative" style={{ width: '16px' }}>
        {/* 整条连接线 - 从顶部到底部 */}
        {!isFirst && (
          <div 
            className="w-px bg-border absolute left-1/2 -translate-x-1/2"
            style={{ top: 0, height: '16px' }}
          />
        )}
        
        {/* 状态点 */}
        <div 
          className={`w-4 h-4 rounded-full flex-shrink-0 relative z-10 ${colors.dot}`}
          style={{ marginTop: '16px' }}
        />
        
        {/* 底部连接线 */}
        {!isLast && (
          <div 
            className="w-px bg-border absolute left-1/2 -translate-x-1/2"
            style={{ top: '32px', bottom: '-48px' }}
          />
        )}
      </div>

      {/* 右侧内容卡片 */}
      <div className="flex-1">
        <GlassCardContainer className="flex flex-col gap-3">
          {/* 头部：标题 + 标签 */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex justify-start items-center gap-2">
                <h3 className="text-primary text-lg font-semibold leading-5">
                  {title}
                </h3>
                {badges.map((badge, idx) => (
                  <div
                    key={idx}
                    className={`h-6 px-2 rounded-full border inline-flex justify-center items-center gap-1 ${statusColorMap[badge.color].badge.bg} ${statusColorMap[badge.color].badge.border}`}
                  >
                    {badge.icon && <div className="w-4 h-4 flex-shrink-0">{badge.icon}</div>}
                    <span
                      className={`text-sm leading-5 ${statusColorMap[badge.color].badge.text}`}
                    >
                      {badge.text}
                    </span>
                  </div>
                ))}
                {titleIcon && (
                  <button
                    onClick={() => hasTable && setIsExpanded(!isExpanded)}
                    className={hasTable ? "cursor-pointer" : ""}
                  >
                    {titleIcon}
                  </button>
                )}
              </div>
            </div>

            {/* 副标题 */}
            {subtitle && (
              <p className="text-body text-secondary">
                {subtitle}
              </p>
            )}

            {/* 时间戳 */}
            {timestamp && (
              <div className="inline-flex justify-start items-center gap-4">
                <span className="text-primary text-sm font-normal leading-5">
                  {timestamp}
                </span>
              </div>
            )}
          </div>

          {/* 主体内容 */}
          {children && <div className="flex flex-col gap-2">{children}</div>}

          {/* 表格 */}
          {hasTable && isExpanded && (
            <div className="-mx-4 px-4">
              <Table<T>
                columns={tableColumns}
                data={tableData}
                className=""
              />
            </div>
          )}

          {/* 底部链接 */}
          {footerLinks.length > 0 && (
            <>
              <div className="-mx-4">
                <Separator />
              </div>
              <div className="inline-flex justify-start items-center gap-4">
                {footerLinks.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={link.onClick}
                    className="text-purple text-xs font-medium leading-4 hover:opacity-80 transition-opacity"
                  >
                    {link.text}
                  </button>
                ))}
              </div>
            </>
          )}
        </GlassCardContainer>
      </div>
    </div>
  );
};

// Timeline 容器组件
export interface TimelineProps {
  children: ReactNode;
  className?: string;
}

export const Timeline = ({ children, className = "" }: TimelineProps) => {
  return (
    <div className={`flex flex-col gap-8 ${className}`}>
      {children}
    </div>
  );
};

// 内容行组件（用于显示 key-value 信息）
export interface TimelineContentRowProps {
  label: string;
  value: string;
  showCopy?: boolean;
}

export const TimelineContentRow = ({
  label,
  value,
  showCopy = true,
}: TimelineContentRowProps) => {
  return (
    <div className="inline-flex justify-start items-start gap-2 w-full">
      <div className="text-secondary text-sm font-normal leading-5 w-20 flex-shrink-0">
        {label}
      </div>
      <div className="text-primary text-sm leading-5 break-all">
        {value}
      </div>
      {showCopy && (
        <CopyButton
          text={value}
          ariaLabel={`复制 ${label}`}
        />
      )}
    </div>
  );
};
