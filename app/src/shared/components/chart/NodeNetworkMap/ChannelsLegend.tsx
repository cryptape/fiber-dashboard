import React from "react";

type Props = {
  className?: string;
};

export function ChannelsLegend({ className }: Props) {
  // 移动端：横向布局，标题和格子在同一行（3:7 比例），数字在颜色块下方；桌面端：纵向布局，数字在颜色块右侧
  const baseClass = "bg-layer backdrop-blur-sm rounded p-2 md:p-2 lg:p-4 w-full md:w-44";
  const rootClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <div className={rootClass}>
      {/* 移动端：横向布局 */}
      <div className="flex md:hidden items-center gap-2">
        {/* 左侧标题 - 30% 宽度 */}
        <div className="flex-[3] flex items-center">
          <div className="type-label text-secondary leading-3 text-[9px]"># OF CHANNELS</div>
        </div>
        
        {/* 右侧颜色块和数字 - 70% 宽度 */}
        <div className="flex-[7] flex flex-col gap-1">
          {/* 颜色块行 - 无间隙 */}
          <div className="flex">
            {[
              { color: '#2F1C96' },
              { color: '#5034C4' },
              { color: '#7459E6' },
              { color: '#B8A8F4' },
              { color: '#E6E2FB' },
            ].map((item, index) => (
              <div key={index} className="flex-1 h-6" style={{ backgroundColor: item.color }} />
            ))}
          </div>
          {/* 数字行 */}
          <div className="flex justify-between">
            {['♾️', '40', '30', '20', '10'].map((label, index) => (
              <div key={index} className="text-tertiary text-[9px] font-normal leading-3" style={{ width: '20%', textAlign: 'left' }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 桌面端：纵向布局 */}
      <div className="hidden md:block">
        <div className="type-label text-secondary leading-4 text-xs mb-2"># OF CHANNELS</div>
        <div className="flex items-center gap-2">
          <div className="inline-flex flex-col justify-center items-start">
            <div className="w-4 h-5 lg:w-8 lg:h-10" style={{ backgroundColor: '#2F1C96' }} />
            <div className="w-4 h-5 lg:w-8 lg:h-10" style={{ backgroundColor: '#5034C4' }} />
            <div className="w-4 h-5 lg:w-8 lg:h-10" style={{ backgroundColor: '#7459E6' }} />
            <div className="w-4 h-5 lg:w-8 lg:h-10" style={{ backgroundColor: '#B8A8F4' }} />
            <div className="w-4 h-5 lg:w-8 lg:h-10" style={{ backgroundColor: '#E6E2FB' }} />
          </div>
          <div className="inline-flex flex-col justify-start items-start">
            <div className="h-5 lg:h-10 text-tertiary text-xs font-normal leading-4 flex items-center">♾️</div>
            <div className="h-5 lg:h-10 text-tertiary text-xs font-normal leading-4 flex items-center">40</div>
            <div className="h-5 lg:h-10 text-tertiary text-xs font-normal leading-4 flex items-center">30</div>
            <div className="h-5 lg:h-10 text-tertiary text-xs font-normal leading-4 flex items-center">20</div>
            <div className="h-5 lg:h-10 text-tertiary text-xs font-normal leading-4 flex items-center">10</div>
          </div>
        </div>
      </div>
    </div>
  );
}
