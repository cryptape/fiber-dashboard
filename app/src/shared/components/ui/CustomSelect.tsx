'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import './CustomSelect.css';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string; // 未选择时显示的占位文字
  className?: string;
}

export function CustomSelect({
  options,
  value: controlledValue,
  onChange,
  defaultValue,
  placeholder,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(
    controlledValue || defaultValue || ''
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : selectedValue;
  const selectedOption = options.find((opt) => opt.value === value);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (optionValue: string) => {
    if (controlledValue === undefined) {
      setSelectedValue(optionValue);
    }
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative h-10 ${className || 'w-[207px]'}`.trim()}>
      {/* 主按钮 - 始终显示 */}
      <div
        onClick={handleToggle}
        className="glass-card w-full h-10 px-3 py-2.5 rounded-[40px] inline-flex justify-center items-center gap-3 cursor-pointer hover:bg-layer-hover/30 transition-colors"
      >
        <div className="flex justify-start items-center gap-2">
          {selectedOption?.icon && (
            <div data-size="16" className="w-4 h-4 relative overflow-hidden">
              {selectedOption.icon}
            </div>
          )}
          <div className={`justify-start font-medium font-['Inter'] leading-5 ${
            selectedOption ? 'text-base text-primary' : 'type-button1 text-primary'
          }`}>
            {selectedOption?.label || placeholder || 'Select...'}
          </div>
        </div>
        <div data-size="16" className="w-4 h-4 relative overflow-hidden">
          <Image 
            src="/arrow.svg" 
            alt="Arrow" 
            width={16} 
            height={16} 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* 下拉菜单 - 绝对定位，完全脱离文档流 */}
      {isOpen && (
        <div className="glass-card absolute top-full mt-2 left-0 w-full z-50 rounded-xl flex flex-col">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFirst = index === 0;
            const isLast = index === options.length - 1;

            return (
              <div
                key={option.value}
                data-property-1="Default"
                data-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={`
                  select-option self-stretch h-10 px-3 inline-flex items-center justify-between cursor-pointer transition-colors
                  ${isFirst ? 'rounded-tl-xl rounded-tr-xl' : ''}
                  ${isLast ? 'rounded-bl-xl rounded-br-xl' : ''}
                `}
              >
                <div className="flex justify-start items-center gap-2">
                  {option.icon && (
                    <div data-size="16" className="w-4 h-4 relative overflow-hidden">
                      {option.icon}
                    </div>
                  )}
                  <div className="justify-start text-primary text-base font-medium font-['Inter'] leading-5">
                    {option.label}
                  </div>
                </div>
                {isSelected && (
                  <Image
                    src="/check.svg"
                    alt="Selected"
                    width={16}
                    height={16}
                    className="w-4 h-4"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
