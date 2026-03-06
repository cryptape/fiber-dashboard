"use client";

import React, { ReactNode, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

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
  /** Tooltip 位置：top（上方）或 bottom（下方），默认 top */
  placement?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  show,
  className = "",
  showArrow = true,
  tooltipClassName = "",
  placement = "top",
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const isTop = placement === "top";

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      if (isTop) {
        setPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
      } else {
        setPosition({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        });
      }
    }
  }, [show, isTop]);

  const arrowClass = isTop
    ? "left-1/2 -translate-x-1/2 top-full border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-[#0f0f10]"
    : "left-1/2 -translate-x-1/2 bottom-full border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-[#0f0f10]";

  const tooltipContent = show && position && (
    <div
      className={`fixed px-3 py-2 bg-inverse rounded-lg whitespace-nowrap pointer-events-none ${tooltipClassName}`}
      style={{
        zIndex: 999999,
        top: isTop ? 'auto' : position.top,
        bottom: isTop ? `calc(100vh - ${position.top}px)` : 'auto',
        left: position.left,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="text-body text-on-color">{content}</div>
      {/* 小三角 */}
      {showArrow && (
        <div className={`absolute w-0 h-0 ${arrowClass}`}></div>
      )}
    </div>
  );

  return (
    <div ref={triggerRef} className={`inline-block ${className}`}>
      {children}
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </div>
  );
};
