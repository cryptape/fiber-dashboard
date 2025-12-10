import React from "react";

type Props = {
  showChannels: boolean;
  onToggle: () => void;
  className?: string;
};

export function ChannelsToggle({ showChannels, onToggle, className }: Props) {
  const baseClass = "p-2 md:p-4 bg-popover rounded inline-flex justify-start items-center gap-1.5 md:gap-2 cursor-pointer";
  const rootClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <div className={rootClass} onClick={onToggle}>
      <div className="relative inline-flex justify-center items-center flex-shrink-0" style={{ width: '14px', height: '14px' }}>
        <div className="rounded-sm bg-purple transition-colors" style={{ width: '14px', height: '14px' }} />
        {showChannels && (
          <svg 
            className="absolute pointer-events-none" 
            width="9" 
            height="9"
            viewBox="0 0 12 12" 
            fill="none"
          >
            <path 
              d="M2 6L5 9L10 3" 
              stroke="white" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="justify-start text-primary text-[11px] md:text-sm font-normal leading-4 md:leading-5 whitespace-nowrap">
        Show channels
      </div>
    </div>
  );
}
