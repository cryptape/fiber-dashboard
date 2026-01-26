import React from 'react';
import Image from 'next/image';
import { GlassCardContainer } from './GlassCardContainer';

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
  label,
  options,
  value,
  onChange,
  className = '',
}) => {
  return (
    <GlassCardContainer className={`!p-0 ${className}`}>
      <div className="h-10 px-3 inline-flex justify-start items-center gap-2">
        {label && (
          <div className="justify-start text-primary text-base font-medium font-['Inter'] leading-5">
            {label}
          </div>
        )}
        <div className="flex justify-start items-center gap-2">
          {options.map((option) => (
            <RadioItem
              key={option.value}
              label={option.label}
              selected={value === option.value}
              onClick={() => onChange(option.value)}
            />
          ))}
        </div>
      </div>
    </GlassCardContainer>
  );
};

interface RadioItemProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

const RadioItem: React.FC<RadioItemProps> = ({ label, selected, onClick }) => {
  return (
    <div
      className="flex justify-start items-center gap-1 cursor-pointer"
      onClick={onClick}
    >
      <div className="w-4 h-4 relative">
        <Image
          src={selected ? '/radio-check.svg' : '/radio.svg'}
          alt={selected ? 'Selected' : 'Unselected'}
          width={16}
          height={16}
        />
      </div>
      <div
        className={`justify-start text-base font-medium font-['Inter'] leading-5 ${
          selected ? 'text-primary' : 'text-tertiary'
        }`}
      >
        {label}
      </div>
    </div>
  );
};
