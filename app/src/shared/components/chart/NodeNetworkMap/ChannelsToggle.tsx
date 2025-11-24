import React from "react";

type Props = {
  showChannels: boolean;
  onToggle: () => void;
  className?: string;
};

export function ChannelsToggle({ showChannels, onToggle, className }: Props) {
  const baseClass = "p-4 bg-popover rounded inline-flex justify-start items-center gap-2 cursor-pointer";
  const rootClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <div className={rootClass} onClick={onToggle}>
      <div className="w-6 h-6 p-1 relative inline-flex flex-col justify-center items-center">
        <div className={`w-4 h-4 rounded-sm transition-colors ${showChannels ? 'bg-purple' : 'bg-border'}`} />
        {showChannels && (
          <div className="w-6 h-6 left-[12px] top-[21px] absolute overflow-hidden pointer-events-none">
            <div className="w-3 h-2.5 left-[6px] top-[7px] absolute text-on" style={{ backgroundColor: 'var(--text-on)' }} />
          </div>
        )}
      </div>
      <div className="justify-start text-primary text-sm font-normal leading-5">
        Show channels
      </div>
    </div>
  );
}
