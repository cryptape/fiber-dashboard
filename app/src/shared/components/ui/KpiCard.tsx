import Image from "next/image";
import { GlassCardContainer } from "./GlassCardContainer";

/**
 * 格式化数字显示
 * @param value - 数字字符串，可能包含逗号等格式
 * @returns 格式化后的数字和单位对象
 */
function formatNumber(value: string): { number: string; suffix: string } {
  // 移除逗号并转换为数字
  const numStr = value.replace(/,/g, '');
  const num = parseFloat(numStr);
  
  if (isNaN(num)) {
    return { number: value, suffix: '' };
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
}

export default function KpiCard({
  label,
  value,
  unit,
  changePercent,
  changeLabel = 'from last week',
  trending = 'up',
  onViewDetails,
  className = ''
}: KpiCardProps) {
  const showTrend = changePercent !== undefined;
  const isPositive = trending === 'up';
  const { number, suffix } = formatNumber(value);

  return (
    <GlassCardContainer className={`w-full inline-flex flex-col justify-center items-start gap-2 ${className}`.trim()}>
      {/* 标题和查看详情 */}
      <div className="w-full flex justify-between items-center">
        <div className="type-label text-secondary">
          {label}
        </div>
        {onViewDetails && (
          <button 
            onClick={onViewDetails}
            className="type-caption text-purple cursor-pointer hover:underline"
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
