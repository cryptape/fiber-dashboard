import React from "react";

export type StatusType = "Active" | "Inactive" | string;

// 状态文本映射函数
export const getStatusDisplayText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'open': 'Open',
    'closed_waiting_onchain_settlement': 'Closing',
    'closed_cooperative': 'Cooperative closed',
    'closed_uncooperative': 'Uncooperative closed',
    'Active': 'Active',
    'Inactive': 'Inactive',
    // 兼容旧状态
    'commitment': 'Committing',
    'settled': 'Settled',
  };
  
  return statusMap[status] || status;
};

export interface StatusBadgeProps {
  /** 状态文本（可选，如果不传则自动根据 status 映射） */
  text?: string;
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
  // 根据状态类型确定样式和颜色
  let statusStyles: string;
  
  if (status === "Active" || status === "open") {
    // Active 和 open 状态 - 绿色 #208C73
    statusStyles = "bg-success border-success text-success";
  } else if (status === "closed_waiting_onchain_settlement") {
    // closed_waiting_onchain_settlement 状态 - 黄色 #FAB83D
    statusStyles = "bg-warning border-warning text-warning";
  } else if (status === "closed_uncooperative") {
    // closed_uncooperative 状态 - 红色 #B34846
    statusStyles = "bg-error border-error text-error";
  } else if (status === "closed_cooperative") {
    // closed_cooperative 状态 - 紫色 #9B87C8
    statusStyles = "border-[#9B87C8] text-[#9B87C8]";
    // 使用自定义背景色
    statusStyles += " bg-[#9B87C81A]"; // 10% opacity
  } else if (status === "Inactive") {
    // Inactive 状态 - 灰色
    statusStyles = "bg-gray-100 border-gray-300 text-gray-700";
  } else if (status === "commitment") {
    // 兼容旧状态 commitment - 黄色
    statusStyles = "bg-warning border-warning text-warning";
  } else if (status === "settled") {
    // 兼容旧状态 settled - 红色
    statusStyles = "bg-error border-error text-error";
  } else {
    // 默认样式
    statusStyles = "bg-gray-100 border-gray-300 text-gray-700";
  }

  // 使用映射函数获取显示文本，如果没有传入 text 则使用状态值
  const displayText = text || getStatusDisplayText(status);

  return (
    <div
      className={`h-6 px-2 rounded-full border inline-flex justify-center items-center gap-1 ${statusStyles} ${className}`.trim()}
    >
      <div className="text-sm leading-5">{displayText}</div>
    </div>
  );
};
