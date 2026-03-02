"use client";

import { useRef, forwardRef, useImperativeHandle } from "react";
import { useSearch } from "@/shared/hooks/useSearch";
import SearchDropdown from "@/shared/components/ui/SearchDropdown";
import Image from "next/image";

export interface HomeSearchBarRef {
  focus: () => void;
}

const HomeSearchBar = forwardRef<HomeSearchBarRef>((props, ref) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const {
    query,
    showNoResults,
    isSearching,
    showHistory,
    searchHistory,
    wrapperRef,
    handleSearch,
    handleInputChange,
    handleKeyDown,
    handleFocus,
    clearQuery,
    clearHistory,
    handleHistoryClick,
  } = useSearch();

  // 暴露 focus 方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      searchInputRef.current?.focus();
    }
  }));

  return (
    <div className="w-full relative" ref={wrapperRef}>
      <div className="w-full relative bg-gradient-to-r from-[#F4EFD9] to-[#D5CDF7] overflow-visible mt-[60px] md:mt-[64px]  md:mb-0">
        <div className="w-full md:max-w-[800px] mx-auto py-5 px-4 md:py-8 md:px-16">
          <div className="relative">
            <div className="px-5 py-2 bg-popover rounded-[999px] outline outline-2 outline-offset-[-2px] outline-white backdrop-blur-[5px] flex items-center gap-3">
              <input
                ref={searchInputRef}
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-primary type-button1 placeholder:text-secondary"
                placeholder="Search by Channel outpoint / Node ID / Node name"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                disabled={isSearching}
              />
              {query && (
                <button
                  type="button"
                  className="flex justify-center items-center shrink-0 cursor-pointer"
                  onClick={clearQuery}
                  style={{ marginRight: '4px' }}
                >
                  <Image
                    src="/cancle.svg"
                    alt="Clear"
                    width={14}
                    height={14}
                    className="w-3.5 h-3.5"
                  />
                </button>
              )}
              <button
                type="button"
                className="w-8 h-8 bg-purple rounded-[999px] flex justify-center items-center shrink-0"
                onClick={handleSearch}
                disabled={isSearching}
              >
                <Image
                  src="/search.svg"
                  alt="Search"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
              </button>
            </div>
            
            <SearchDropdown
              showHistory={showHistory}
              showNoResults={showNoResults}
              searchHistory={searchHistory}
              query={query}
              onClearHistory={clearHistory}
              onHistoryClick={handleHistoryClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

HomeSearchBar.displayName = 'HomeSearchBar';

export default HomeSearchBar;
