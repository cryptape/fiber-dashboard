import React from "react";

export type StatusType = "Active" | "Inactive" | string;

export interface StatusBadgeProps {
  /** 状态文本 */
  text: string;
  /** 状态类型 */
  status: StatusType;
  /** 自定义类名 */
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  text,
  status,
  className = "",
}) => {
  // 根据状态类型确定样式
  let statusStyles: string;
  
  if (status === "Active" || status === "open") {
    // Active 和 open 状态 - 绿色
    statusStyles = "bg-success border-success text-success";
  } else if (status === "commitment") {
    // commitment 状态 - 黄色
    statusStyles = "bg-warning border-warning text-warning";
  } else if (status === "Inactive" || status === "settled") {
    // Inactive 和 settled 状态 - 红色
    statusStyles = "bg-error border-error text-error";
  } else {
    // 默认样式
    statusStyles = "bg-gray-100 border-gray-300 text-gray-700";
  }

  return (
    <div
      className={`h-6 px-2 rounded-full border inline-flex justify-center items-center gap-1 ${statusStyles} ${className}`.trim()}
    >
      <div className="text-sm leading-5">{text}</div>
    </div>
  );
};
