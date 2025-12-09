"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Tooltip } from "./Tooltip";

export interface CopyButtonProps {
  /** 要复制的文本 */
  text: string;
  /** 自定义类名 */
  className?: string;
  /** aria-label */
  ariaLabel?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  className = "",
  ariaLabel = "复制",
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopied(true);
      setTimeout(() => {
        setShowCopied(false);
      }, 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  return (
    <Tooltip content="Copy" show={isHovered && !showCopied}>
      <Tooltip 
        content={
          <div className="flex items-center gap-1">
            <Image
              src="/copy_success.svg"
              alt="成功"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <span>Copied to clipboard</span>
          </div>
        } 
        show={showCopied}
        tooltipClassName="min-w-[188px]"
      >
        <button
          onClick={handleCopy}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`w-4 h-4 relative cursor-pointer transition-all flex-shrink-0 group ${className}`}
          aria-label={ariaLabel}
        >
          <Image
            src="/copy.svg"
            alt="复制"
            width={16}
            height={16}
            className="w-full h-full transition-all"
            style={{
              filter: isHovered && !showCopied
                ? "brightness(0) saturate(100%) invert(4%) sepia(6%) saturate(2234%) hue-rotate(202deg) brightness(98%) contrast(92%)"
                : "none"
            }}
          />
        </button>
      </Tooltip>
    </Tooltip>
  );
};
