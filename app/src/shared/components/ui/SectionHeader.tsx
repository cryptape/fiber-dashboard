import { useState } from "react";
import { GlassButton, CustomSelect, SelectOption } from "@/shared/components/ui";

export interface SectionHeaderProps {
  /** 标题文本 */
  title: string;
  /** 最后更新时间文本 */
  lastUpdated?: string;
  /** 刷新按钮点击回调 */
  onRefresh?: () => void;
  /** 下拉选择器选项数组，如果不传则不显示选择器 */
  selectOptions?: SelectOption[];
  /** 下拉选择器当前值 */
  selectValue?: string;
  /** 下拉选择器值改变回调 */
  onSelectChange?: (value: string) => void;
  /** 下拉选择器自定义样式 */
  selectClassName?: string;
}

export function SectionHeader({
  title,
  lastUpdated,
  onRefresh,
  selectOptions,
  selectValue,
  onSelectChange,
  selectClassName = "w-[154px] md:w-[104px]",
}: SectionHeaderProps) {
  const [isRotating, setIsRotating] = useState(false);

  const handleRefresh = () => {
    if (onRefresh) {
      setIsRotating(true);
      onRefresh();
      // 动画结束后重置状态
      setTimeout(() => setIsRotating(false), 300);
    }
  };

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <span className="type-h2 text-primary">{title}</span>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 md:gap-4">
          {lastUpdated && (
            <span className="type-caption text-secondary">
              {lastUpdated}
            </span>
          )}
          {onRefresh && (
            <GlassButton 
              icon="/refresh.svg" 
              alt="refresh" 
              onClick={handleRefresh}
              className={isRotating ? "animate-spin" : ""}
            />
          )}
        </div>
        {selectOptions && selectValue !== undefined && onSelectChange && (
          <CustomSelect
            options={selectOptions}
            value={selectValue}
            onChange={onSelectChange}
            className={selectClassName}
          />
        )}
      </div>
    </div>
  );
}
