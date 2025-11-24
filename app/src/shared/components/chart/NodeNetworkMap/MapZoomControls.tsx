import React from "react";
import Image from "next/image";

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
};

export function MapZoomControls({ onZoomIn, onZoomOut, className }: Props) {
  const baseClass = "inline-flex flex-col justify-start items-start gap-3";
  const rootClass = className ? `${baseClass} ${className}` : baseClass;

  const buttonClass = "w-12 h-12 p-2.5 bg-popover rounded  inline-flex justify-center items-center gap-2.5 cursor-pointer hover:bg-layer transition-colors";

  return (
    <div className={rootClass}>
      {/* 放大按钮 */}
      <div className={buttonClass} onClick={onZoomIn} title="Zoom In">
        <Image src="/plus.svg" alt="Zoom In" width={24} height={24} />
      </div>

      {/* 缩小按钮 */}
      <div className={buttonClass} onClick={onZoomOut} title="Zoom Out">
        <Image src="/minus.svg" alt="Zoom Out" width={24} height={24} />
      </div>
    </div>
  );
}
