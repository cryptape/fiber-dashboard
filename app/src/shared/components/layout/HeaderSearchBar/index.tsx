"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import Image from "next/image";
import { useSearch } from "@/shared/hooks/useSearch";
import SearchDropdown from "@/shared/components/ui/SearchDropdown";
import { SearchIcon } from "@/shared/components/icons";

export interface HeaderSearchBarRef {
  focus: () => void;
}

interface HeaderSearchBarProps {
  scrolled?: boolean;
}

const HeaderSearchBar = forwardRef<HeaderSearchBarRef, HeaderSearchBarProps>((_props, ref) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const {
    query,
    showNoResults,
    isSearching,
    showHistory,
    searchHistory,
    highlightedIndex,
    wrapperRef,
    inputRef,
    handleSearch,
    handleInputChange,
    handleKeyDown,
    handleFocus,
    clearQuery,
    clearHistory,
    handleHistoryClick,
    setHighlightedIndex,
  } = useSearch();

  // 暴露 focus 方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    handleFocus();
  };

  const handleSearchBlur = () => {
    // 不在这里设置 setIsSearchFocused(false)，因为点击下拉框会触发失焦
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="h-10 rounded-lg backdrop-blur-[5px] inline-flex justify-start items-center gap-2 relative bg-popover" style={{ padding: '10px 12px', width: '488px' }}>
        <div className="w-4 h-4 relative overflow-hidden flex-shrink-0">
          <SearchIcon className="text-secondary" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search by Channel outpoint / Node ID / Node name"
          className="bg-transparent outline-none text-primary text-base font-medium font-['Inter'] leading-5 placeholder:text-tertiary"
          style={{ width: '464px' }}
          disabled={isSearching}
        />
        {query && (
          <>
            <Image
              src="/cancle.svg"
              alt="Clear"
              width={16}
              height={16}
              className="w-4 h-4 cursor-pointer flex-shrink-0"
              onClick={clearQuery}
            />
            <Image
              src="/enter.svg"
              alt="Enter"
              width={16}
              height={16}
              className="w-4 h-4 flex-shrink-0 cursor-pointer"
              onClick={handleSearch}
            />
          </>
        )}
        {!isSearchFocused && (
          <Image
            src="/key.svg"
            alt="Key"
            width={18}
            height={18}
            className="w-[18px] h-[18px] flex-shrink-0"
          />
        )}
      </div>

      <SearchDropdown
        showHistory={showHistory}
        showNoResults={showNoResults}
        searchHistory={searchHistory}
        query={query}
        highlightedIndex={highlightedIndex}
        onClearHistory={clearHistory}
        onHistoryClick={handleHistoryClick}
        onHighlightChange={setHighlightedIndex}
      />
    </div>
  );
});

HeaderSearchBar.displayName = 'HeaderSearchBar';

export default HeaderSearchBar;
