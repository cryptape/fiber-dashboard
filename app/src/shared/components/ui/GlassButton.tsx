import Image from "next/image";

export interface GlassButtonProps {
  /** SVG 图标路径，位于 public 目录下，如 "/collapse.svg" */
  icon: string;
  /** 图标描述文字，用于无障碍访问 */
  alt: string;
  /** 点击事件处理函数 */
  onClick?: () => void;
  /** 额外的 className */
  className?: string;
}

export default function GlassButton({ 
  icon, 
  alt, 
  onClick,
  className = ""
}: GlassButtonProps) {
  return (
    <div
      onClick={onClick}
      className={`glass-card flex justify-center items-center w-10 h-10 p-3 rounded-full shrink-0 cursor-pointer transition-colors ${className}`.trim()}
    >
      <Image 
        src={icon} 
        alt={alt} 
        width={16} 
        height={16} 
        className="w-4 h-4" 
      />
    </div>
  );
}
