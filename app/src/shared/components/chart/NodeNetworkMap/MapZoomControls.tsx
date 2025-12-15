import React from "react";
import Image from "next/image";

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
};

export function MapZoomControls({ onZoomIn, onZoomOut, className }: Props) {
  // 移动端：横向排列，桌面端：纵向排列
  const baseClass = "inline-flex justify-start items-start gap-2 md:gap-3 md:flex-col";
  const rootClass = className ? `${baseClass} ${className}` : baseClass;

  const buttonClass = "w-8 h-8 md:w-10 md:h-10 p-2 md:p-2.5 bg-popover rounded inline-flex justify-center items-center gap-2.5 cursor-pointer hover:bg-layer transition-colors";

  return (
    <div className={rootClass}>
      {/* 缩小按钮 */}
      <div className={buttonClass} onClick={onZoomOut} title="Zoom Out">
        <Image src="/minus.svg" alt="Zoom Out" width={20} height={20} className="w-5 h-5 md:w-6 md:h-6" />
      </div>

      {/* 放大按钮 */}
      <div className={buttonClass} onClick={onZoomIn} title="Zoom In">
        <Image src="/plus.svg" alt="Zoom In" width={20} height={20} className="w-5 h-5 md:w-6 md:h-6" />
      </div>
    </div>
  );
}
