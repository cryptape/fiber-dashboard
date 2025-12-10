"use client";

import React, { ReactNode } from "react";

export interface TooltipProps {
  /** Tooltip 显示的内容 */
  content: ReactNode;
  /** 触发 Tooltip 的子元素 */
  children: ReactNode;
  /** 是否显示 Tooltip */
  show: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否显示小三角指示器 */
  showArrow?: boolean;
  /** Tooltip 容器的自定义类名 */
  tooltipClassName?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  show,
  className = "",
  showArrow = true,
  tooltipClassName = "",
}) => {
  return (
    <div className={`relative inline-block ${className}`} style={{ isolation: 'isolate' }}>
      {children}
      
      {show && (
        <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-inverse rounded-lg whitespace-nowrap pointer-events-none z-[9999] ${tooltipClassName}`}>
          <div className="text-body text-on-color">{content}</div>
          {/* 小三角 */}
          {showArrow && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-[#0f0f10]"></div>
          )}
        </div>
      )}
    </div>
  );
};
