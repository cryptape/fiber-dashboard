import Image from "next/image";
import { useState } from "react";
import { GlassCardContainer } from "./GlassCardContainer";
import { Tooltip } from "./Tooltip";

/**
 * 格式化数字显示
 * @param value - 数字字符串，可能包含逗号等格式
 * @returns 格式化后的数字和单位对象
 */
function formatNumber(value: string): { number: string; suffix: string } {
  // 先尝试直接分离数字和后缀（如 "249.3K" -> { number: "249.3", suffix: "K" }）
  const directMatch = value.match(/^([\d.,]+)([A-Z]*)$/);
  if (directMatch && directMatch[2]) {
    // 如果已经包含后缀，直接返回
    return {
      number: directMatch[1].replace(/,/g, ''),
      suffix: directMatch[2]
    };
  }
  
  // 移除逗号并转换为数字
  const numStr = value.replace(/,/g, '');
  const num = parseFloat(numStr);
  
  if (isNaN(num)) {
    return { number: value, suffix: '' };
  }
  
  // 对于小于 1 的数字,保留更多小数位,不使用 compact 模式
  if (num < 1 && num > 0) {
    return { 
      number: num.toFixed(2).replace(/\.?0+$/, ''), // 最多保留4位小数,去除尾部的0
      suffix: '' 
    };
  }
  
  // 使用 Intl.NumberFormat 的 compact notation
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  });
  
  const formatted = formatter.format(num);
  
  // 分离数字和单位后缀 (如 "1.2K" -> { number: "1.2", suffix: "K" })
  const match = formatted.match(/^([\d.]+)([A-Z]*)$/);
  
  if (match) {
    return {
      number: match[1],
      suffix: match[2]
    };
  }
  
  return { number: formatted, suffix: '' };
}

export interface KpiCardProps {
  /** 卡片标题 */
  label: string;
  /** 主要数值 */
  value: string;
  /** 单位 */
  unit?: string;
  /** 变化百分比 */
  changePercent?: number;
  /** 变化描述文本 */
  changeLabel?: string;
  /** 趋势方向 */
  trending?: 'up' | 'down';
  /** 查看详情回调函数 */
  onViewDetails?: () => void;
  /** 额外的 className */
  className?: string;
  /** Tooltip 提示内容 */
  tooltip?: string;
}

export default function KpiCard({
  label,
  value,
  unit,
  changePercent,
  changeLabel = 'from last week',
  trending = 'up',
  onViewDetails,
  className = '',
  tooltip
}: KpiCardProps) {
  const showTrend = changePercent !== undefined;
  const isPositive = trending === 'up';
  const { number, suffix } = formatNumber(value);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <GlassCardContainer className={`w-full inline-flex flex-col justify-center items-start gap-2 ${className}`.trim()}>
      {/* 标题和查看详情 */}
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="type-label text-secondary">
            {label}
          </div>
          {tooltip && (
            <Tooltip 
              content={tooltip} 
              show={showTooltip}
              tooltipClassName="!whitespace-normal min-w-[360px] max-w-[420px] text-left"
              showArrow={false}
              placement="bottom"
            >
              <div 
                className="w-4 h-4 relative cursor-pointer flex-shrink-0"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <Image
                  src="/info.svg"
                  alt="info"
                  width={16}
                  height={16}
                  className="w-full h-full"
                />
              </div>
            </Tooltip>
          )}
        </div>
        {onViewDetails && (
          <button 
            onClick={onViewDetails}
            className="type-button2 text-purple cursor-pointer hover:underline"
          >
            View details
          </button>
        )}
      </div>

      {/* 数值和单位 */}
      <div className="inline-flex justify-start items-end gap-2">
        <div className="type-h1 text-primary">
          {number}{suffix && <span className="">{suffix}</span>}
        </div>
        {unit && (
          <div className="type-body text-secondary">
            {unit}
          </div>
        )}
      </div>

      {/* 变化趋势 */}
      {showTrend && (
        <div className="inline-flex justify-start items-center gap-1">
          <div
            className={`h-5 px-2 rounded-full border  flex justify-center items-center gap-1 ${
              isPositive
                ? 'bg-success border-success'
                : 'bg-error border-error'
            }`.trim()}
          >
            {/* 箭头图标 */}
            <div className={`w-4 h-4 relative flex items-center justify-center transition-transform ${!isPositive ? 'rotate-180 scale-x-[-1]' : ''}`.trim()}>
              <Image
                src="/trend.svg"
                alt="trend"
                width={14}
                height={8}
                className="w-3.5 h-2"
                style={{
                  filter: isPositive 
                    ? 'invert(30%) sepia(50%) saturate(500%) hue-rotate(120deg)' 
                    : 'invert(40%) sepia(50%) saturate(500%) hue-rotate(330deg)'
                }}
              />
            </div>
            <div className={`type-caption ${isPositive ? 'text-success' : 'text-error'}`.trim()}>
              {changePercent}%
            </div>
          </div>
          <div className="type-body text-secondary">
            {changeLabel}
          </div>
        </div>
      )}
    </GlassCardContainer>
  );
}
