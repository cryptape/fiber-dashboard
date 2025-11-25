'use client';

import { useState } from 'react';

// 搜索图标组件
const SearchIcon = ({ className = '' }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export interface SearchInputProps {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
}

export const SearchInput = ({
  value: externalValue,
  placeholder = 'Search',
  onChange,
  onSearch,
  className = '',
}: SearchInputProps) => {
  const [internalValue, setInternalValue] = useState('');
  const value = externalValue !== undefined ? externalValue : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (externalValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(value);
    }
  };

  return (
    <div className={`w-80 h-10 px-3 py-2.5 bg-layer/30 rounded-[40px]  glass-card backdrop-blur-[5px] inline-flex items-center gap-2 ${className}`}>
      <SearchIcon className="text-secondary flex-shrink-0" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-base font-medium leading-5 text-primary placeholder:text-tertiary"
      />
    </div>
  );
};
