import React from "react";

type Props = {
  className?: string;
};

export function ChannelsLegend({ className }: Props) {
  const baseClass = "w-44 p-4 bg-layer backdrop-blur-sm rounded inline-flex flex-col justify-start items-start gap-2";
  const rootClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <div className={rootClass}>
      <div className="type-label text-secondary leading-4"># of CHANNELS</div>

      <div className="inline-flex justify-start items-center gap-2">
        <div className="inline-flex flex-col justify-center items-start">
          <div className="w-8 h-10" style={{ backgroundColor: '#2F1C96' }} />
          <div className="w-8 h-10" style={{ backgroundColor: '#5034C4' }} />
          <div className="w-8 h-10" style={{ backgroundColor: '#7459E6' }} />
          <div className="w-8 h-10" style={{ backgroundColor: '#B8A8F4' }} />
          <div className="w-8 h-10" style={{ backgroundColor: '#E6E2FB' }} />
        </div>

        <div className="w-9 inline-flex flex-col justify-start items-start">
          <div className="w-6 h-10 text-tertiary text-xs font-normal leading-4">♾️</div>
          <div className="w-4 h-10 text-tertiary text-xs font-normal leading-4">40</div>
          <div className="w-4 h-10 text-tertiary text-xs font-normal leading-4">30</div>
          <div className="w-3.5 h-10 text-tertiary text-xs font-normal leading-4">20</div>
          <div className="w-3.5 h-10 text-tertiary text-xs font-normal leading-4">10</div>
        </div>
      </div>
    </div>
  );
}
