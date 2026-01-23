'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import './AssetSelect.css';

// Check Icon Component
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.3334 4L6.00002 11.3333L2.66669 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Arrow Icon Component
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export interface AssetSelectOption {
  value: string;
  label: string;
  color?: string; // Asset 颜色
}

export interface AssetSelectProps {
  options: AssetSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function AssetSelect({
  options,
  value: controlledValue,
  onChange,
  defaultValue,
  placeholder = 'All assets',
  className = '',
}: AssetSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(
    controlledValue || defaultValue || ''
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : selectedValue;
  const selectedOption = options.find((opt) => opt.value === value);
  
  // 判断是否选中了具体的资产（不是 "All assets"）
  const hasAssetSelected = value !== '';

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
      {/* 主按钮 */}
      <div
        onClick={handleToggle}
        className={`w-full h-10 px-3 py-2.5 rounded-[40px] inline-flex justify-center items-center gap-3 cursor-pointer transition-colors ${
          hasAssetSelected 
            ? 'bg-[#674BDC]' 
            : 'glass-card hover:bg-layer-hover/30'
        }`}
      >
        <div className="flex justify-start items-center gap-2">
          {/* Filter Icon - 根据选中状态切换图标 */}
          <div className="w-4 h-4 relative overflow-hidden">
            <Image 
              src={hasAssetSelected ? "/filter-1.svg" : "/filter.svg"}
              alt="Filter" 
              width={16} 
              height={16} 
              className="w-4 h-4"
            />
          </div>
          <div className={`justify-start font-medium font-['Inter'] leading-5 text-base ${
            hasAssetSelected ? 'text-on-color' : 'text-primary'
          }`}>
            {hasAssetSelected && 'Asset: '}{selectedOption?.label || placeholder}
          </div>
        </div>
        <div className={`w-4 h-4 transition-transform ${
          isOpen ? 'rotate-180' : ''
        } ${
          hasAssetSelected ? 'text-on-color' : 'text-primary'
        }`}>
          <ArrowIcon />
        </div>
      </div>

      {/* 下拉菜单 - 使用 surface/popover 背景色和自定义阴影 */}
      {isOpen && (
        <div className="asset-select-dropdown absolute top-full mt-2 left-0 w-full z-50 rounded-xl flex flex-col bg-popover">
          {/* 具体的资产选项 */}
          {options.filter(opt => opt.value !== '').map((option, index) => {
            const isSelected = option.value === value;
            const isFirst = index === 0;

            return (
              <div
                key={option.value}
                data-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={`
                  asset-select-option self-stretch h-10 px-3 inline-flex items-center justify-between cursor-pointer transition-colors
                  ${isFirst ? 'rounded-tl-xl rounded-tr-xl' : ''}
                `}
              >
                <div className="flex justify-start items-center gap-2">
                  {/* Asset 色块 */}
                  {option.color && (
                    <div 
                      className="w-3 h-3 flex-shrink-0" 
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <div className="justify-start text-primary text-base font-medium font-['Inter'] leading-5">
                    {option.label}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-4 h-4 text-primary">
                    <CheckIcon />
                  </div>
                )}
              </div>
            );
          })}
          
          {/* 分割线 */}
          <div className="h-px bg-[#D9D9D9]" />
          
          {/* All assets 选项 */}
          {options.filter(opt => opt.value === '').map((option) => {
            const isSelected = option.value === value;

            return (
              <div
                key={option.value}
                data-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className="asset-select-option self-stretch h-10 px-3 inline-flex items-center justify-between cursor-pointer transition-colors rounded-bl-xl rounded-br-xl"
              >
                <div className="justify-start text-primary text-base font-medium font-['Inter'] leading-5">
                  {option.label}
                </div>
                {isSelected && (
                  <div className="w-4 h-4 text-primary">
                    <CheckIcon />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
