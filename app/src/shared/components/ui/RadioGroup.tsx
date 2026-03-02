import React from 'react';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  label?: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`p-1 bg-layer/30 rounded-lg glass-card outline-offset-[-2px] outline-white backdrop-blur-[5px] inline-flex justify-start items-center ${className}`}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <div
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex-1 px-2.5 py-1 pt-2 md:pt-1 rounded flex justify-center items-center gap-2.5 cursor-pointer ${
              isSelected ? 'bg-popover' : ''
            }`}
          >
            <div className={`justify-start text-base font-medium font-['Inter'] leading-5 ${
              isSelected ? 'text-primary' : 'text-tertiary'
            }`}>
              {option.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
