'use client';

import { useState, useRef, useEffect } from 'react';
import { Separator } from './separator';
import GlassButton from './GlassButton';

export interface MenuItem {
  value: string;
  label: string;
}

export interface MenuOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: 'purple' | 'yellow' | 'blue';
}

export interface CustomMenuProps {
  // 顶部菜单项
  menuItems: MenuItem[];
  selectedMenuItem?: string;
  onMenuItemChange?: (value: string) => void;
  
  // 底部选项
  options: MenuOption[];
  selectedOption?: string;
  onOptionChange?: (value: string) => void;
}

export function CustomMenu({
  menuItems,
  selectedMenuItem: controlledMenuItem,
  onMenuItemChange,
  options,
  selectedOption: controlledOption,
  onOptionChange,
}: CustomMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalMenuItem, setInternalMenuItem] = useState(menuItems[0]?.value || '');
  const [internalOption, setInternalOption] = useState(options[0]?.value || '');
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 支持受控和非受控模式
  const selectedMenuItem = controlledMenuItem !== undefined ? controlledMenuItem : internalMenuItem;
  const selectedOption = controlledOption !== undefined ? controlledOption : internalOption;

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInside = 
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target));
      
      if (!isClickInside) {
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

  const handleMenuItemClick = (value: string) => {
    if (controlledMenuItem === undefined) {
      setInternalMenuItem(value);
    }
    onMenuItemChange?.(value);
    setIsOpen(false);
  };

  const handleOptionClick = (value: string) => {
    if (controlledOption === undefined) {
      setInternalOption(value);
    }
    onOptionChange?.(value);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* 触发按钮 */}
      <div ref={triggerRef}>
        <GlassButton
          icon={isOpen ? "/close.svg" : "/collapse.svg"}
          alt="Menu"
          onClick={handleToggle}
        />
      </div>

      {/* 下拉菜单 */}
      {isOpen && (
        <div 
          ref={menuRef}
          className=" bg-popover absolute top-[52px] right-0 left-0 p-5 rounded-2xl flex flex-col justify-start items-center gap-3 z-[9999]"
        >
          {/* 菜单项部分 */}
          <div className="self-stretch flex flex-col justify-start items-start">
            {menuItems.map((item) => {
              const isSelected = item.value === selectedMenuItem;
              
              return (
                <div
                  key={item.value}
                  onClick={() => handleMenuItemClick(item.value)}
                  className={`
                    self-stretch h-10 p-2.5 rounded-[999px] inline-flex justify-center items-center gap-2.5 cursor-pointer transition-colors
                    ${isSelected ? 'bg-inverse' : ''}
                  `}
                >
                  <div className={`justify-start text-sm font-medium font-['Inter'] leading-4 ${isSelected ? 'text-on' : 'text-tertiary'}`}>
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分隔线 */}
          <Separator />

          {/* 底部选项部分 */}
          <div className="self-stretch flex flex-col md:inline-flex md:flex-row justify-start items-start gap-2 md:gap-5">
            {options.map((option) => {
              const isSelected = option.value === selectedOption;
              
              return (
                <div
                  key={option.value}
                  onClick={() => handleOptionClick(option.value)}
                  className={`
                    w-full md:flex-1 h-10 px-3 rounded-[999px] border border-border flex items-center cursor-pointer transition-colors
                    ${
                      isSelected
                        ? 'bg-purple justify-between'
                        : 'justify-start'
                    }
                  `}
                >
                  <div className="flex justify-start items-center gap-2">
                    {option.icon && (
                      <div data-size="16" className="w-4 h-4 relative overflow-hidden">
                        <div className={isSelected ? 'brightness-0 invert' : ''}>
                          {option.icon}
                        </div>
                      </div>
                    )}
                    <div className={`justify-start text-sm font-medium font-['Inter'] leading-4 ${isSelected ? 'text-on' : 'text-primary'}`}>
                      {option.label}
                    </div>
                  </div>
                  {isSelected && (
                    <img
                      src="/check.svg"
                      alt="Selected"
                      width={16}
                      height={16}
                      className="w-4 h-4 brightness-0 invert"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
