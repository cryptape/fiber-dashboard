import React from "react";

export type StatusType = "Active" | "Inactive";

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
  const statusStyles =
    status === "Active"
      ? "bg-success border-success text-success"
      : "bg-error border-error text-error";

  return (
    <div
      className={`h-6 px-2 rounded-full border flex justify-center items-center gap-1 ${statusStyles} ${className}`.trim()}
    >
      <div className="text-sm leading-5">{text}</div>
    </div>
  );
};
