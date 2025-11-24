import React from "react";

export type IndicatorMode = "light" | "dark";

export interface StatusIndicatorProps {
  /** 显示文本 */
  text: string;
  /** 指示器颜色 (预设颜色或自定义hex值) */
  color?: "success" | "error" | "purple" | "yellow" | "blue" | string;
  /** 显示模式 */
  mode?: IndicatorMode;
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onClick?: () => void;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  text,
  color = "success",
  mode = "light",
  className = "",
  onClick,
}) => {
  // 根据颜色获取对应的背景色类或自定义颜色
  const getDotStyle = () => {
    const colorMap: Record<string, string> = {
      success: "bg-success",
      error: "bg-error",
      purple: "bg-purple",
      yellow: "bg-yellow",
      blue: "bg-blue",
    };
    
    // 如果是预设颜色，返回类名
    if (color in colorMap) {
      return { className: colorMap[color] };
    }
    
    // 否则作为自定义颜色值处理
    return { style: { backgroundColor: color } };
  };

  // 根据模式获取样式
  const modeStyles = {
    light: {
      container: "bg-layer",
      text: "text-primary",
      outline: "",
    },
    dark: {
      container: "bg-inverse",
      text: "text-on",
      outline: "outline outline-2 outline-offset-[-2px] outline-black",
    },
  };

  const currentModeStyle = modeStyles[mode];
  const glassCardClass = mode === "light" ? "glass-card" : "";

  return (
    <div
      className={`py-2.5 px-3 rounded-[40px] ${glassCardClass} ${currentModeStyle.outline} backdrop-blur-[5px] inline-flex justify-center items-center gap-2 ${currentModeStyle.container} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`.trim()}
      onClick={onClick}
    >
      <div 
        className={`w-2 h-2 rounded-full ${getDotStyle().className || ""}`}
        style={getDotStyle().style}
      />
      <div
        className={`text-base font-medium leading-5 ${currentModeStyle.text}`}
      >
        {text}
      </div>
    </div>
  );
};
