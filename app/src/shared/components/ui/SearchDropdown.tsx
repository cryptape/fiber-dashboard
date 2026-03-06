import Image from "next/image";

interface SearchDropdownProps {
  showHistory: boolean;
  showNoResults: boolean;
  searchHistory: string[];
  query: string;
  highlightedIndex?: number;
  onClearHistory: () => void;
  onHistoryClick: (item: string) => void;
  onHighlightChange?: (index: number) => void;
}

export default function SearchDropdown({
  showHistory,
  showNoResults,
  searchHistory,
  query,
  highlightedIndex = -1,
  onClearHistory,
  onHistoryClick,
  onHighlightChange,
}: SearchDropdownProps) {
  return (
    <>
      {/* Recently Searched Dropdown */}
      {showHistory && searchHistory.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-popover rounded-xl shadow-[0px_4px_6px_0px_rgba(0,0,0,0.08)] z-50">
          <div className="px-5 pt-4 pb-2 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div className="type-caption text-tertiary uppercase">Recent Searches</div>
              <button
                onClick={onClearHistory}
                className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/trash.svg"
                  alt="Clear"
                  width={14}
                  height={14}
                  className="w-3.5 h-3.5"
                />
                <div className="type-caption text-tertiary uppercase">Clear History</div>
              </button>
            </div>
            <div className="flex flex-col">
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => onHistoryClick(item)}
                  onMouseEnter={() => onHighlightChange?.(index)}
                  onMouseLeave={() => onHighlightChange?.(-1)}
                  style={{
                    backgroundColor: index === highlightedIndex ? 'rgba(0,0,0,0.05)' : undefined,
                  }}
                  className="h-8 flex items-center gap-2 transition-colors cursor-pointer px-2 rounded-md"
                >
                  <Image
                    src="/history.svg"
                    alt="History"
                    width={14}
                    height={14}
                    className="w-3.5 h-3.5"
                  />
                  <div className="type-body text-secondary truncate">{item}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Results Dropdown */}
      {showNoResults && (
        <div className="absolute left-0 right-0 mt-1 bg-popover rounded-xl shadow-[0px_4px_6px_0px_rgba(0,0,0,0.08)] z-50">
          <div className="px-5 py-4 flex flex-col gap-2.5">
            <div className="flex flex-col gap-2">
              <div className="type-body text-primary">
                Your search <span className="font-bold">&quot;{query}&quot;</span> did not match any records.
              </div>
              <div className="flex flex-col gap-1">
                <div className="type-body text-secondary">Try searching with:</div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-[var(--text-secondary)] mt-2 shrink-0" style={{ marginLeft: '2px' }}></div>
                  <div className="type-body text-secondary">A full channel outpoint</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-[var(--text-secondary)] mt-2 shrink-0" style={{ marginLeft: '2px' }}></div>
                  <div className="type-body text-secondary">A full node ID</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-[var(--text-secondary)] mt-2 shrink-0" style={{ marginLeft: '2px' }}></div>
                  <div className="type-body text-secondary">A node name (partial match supported)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
