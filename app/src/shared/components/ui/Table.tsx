'use client';

import { ReactNode, useState } from 'react';
import Image from 'next/image';
import * as Tooltip from '@radix-ui/react-tooltip';

export type SortState = 'none' | 'ascending' | 'descending';

export interface ColumnDef<T = Record<string, unknown>> {
  key: string;
  label: string;
  width?: string; // Tailwind width class like 'w-36', 'flex-1'
  sortable?: boolean;
  showInfo?: boolean;
  infoTooltip?: string; // Tooltip text for info icon
  render?: (value: unknown, row: T) => ReactNode;
  className?: string; // Additional className for cell content
}

export interface TableProps<T = Record<string, unknown>> {
  columns: ColumnDef<T>[];
  data: T[];
  onSort?: (key: string, state: SortState) => void;
  defaultSortKey?: string;
  defaultSortState?: SortState;
  className?: string;
  loading?: boolean;
  loadingText?: string;
  onRowClick?: (row: T) => void;
}

export const Table = <T extends Record<string, unknown>>({
  columns,
  data,
  onSort,
  defaultSortKey,
  defaultSortState = 'none',
  className = '',
  loading = false,
  loadingText = 'Loading...',
  onRowClick,
}: TableProps<T>) => {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortState, setSortState] = useState<SortState>(defaultSortState);

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;

    let newState: SortState = 'none';
    
    if (sortKey === key) {
      // Cycle through: none -> ascending -> descending -> none
      if (sortState === 'none') {
        newState = 'ascending';
      } else if (sortState === 'ascending') {
        newState = 'descending';
      } else {
        newState = 'none';
      }
    } else {
      newState = 'ascending';
    }

    setSortKey(key);
    setSortState(newState);
    onSort?.(key, newState);
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="relative w-full">
        <div className={`w-full overflow-x-auto ${className}`}>
          <div className="flex flex-col" style={{ minWidth: '800px' }}>
            {/* Table Header */}
            <div className="flex w-full">
              {columns.map((column) => {
                const isCurrentSort = sortKey === column.key;
                const currentSortState = isCurrentSort ? sortState : 'none';
                
                return (
                  <div
                    key={column.key}
                    data-showinfo={column.showInfo || false}
                    data-sortable={column.sortable || false}
                    className={`h-12 px-3 py-2.5 border-b-2 border-color flex items-center ${
                      column.width || 'flex-1'
                    } ${column.sortable ? 'cursor-pointer' : ''} ${
                      column.width?.startsWith('flex') ? 'justify-start' : 'justify-between'
                    }`}
                    onClick={() => handleSort(column.key, column.sortable)}
                  >
                    <div className="text-secondary text-base font-medium leading-5">
                      {column.label}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {column.sortable && (
                        <SortIcon state={currentSortState} />
                      )}
                      {column.showInfo && (
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <Image
                              src="/info.svg"
                              alt="info"
                              width={16}
                              height={16}
                              className="opacity-100 cursor-help"
                            />
                          </Tooltip.Trigger>
                          {column.infoTooltip && (
                            <Tooltip.Portal>
                              <Tooltip.Content
                                className="bg-[var(--surface-inverse)] rounded-lg px-3 py-2 text-sm text-on-color type-body shadow-lg max-w-[240px] z-50"
                                sideOffset={5}
                              >
                                {column.infoTooltip}
                                <Tooltip.Arrow className="fill-[var(--surface-inverse)]" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          )}
                        </Tooltip.Root>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Body */}
            <div className="flex flex-col">
              {data.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className={`flex w-full transition-colors ${
                    rowIndex < data.length - 1 ? 'border-b border-color' : ''
                  } ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  style={{
                    ...(onRowClick && {
                      transition: 'background-color 0.2s',
                    }),
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-layer-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (onRowClick) {
                      e.currentTarget.style.backgroundColor = '';
                    }
                  }}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className={`h-12 px-3 py-2.5 flex items-center gap-2.5 min-w-0 ${
                        column.width || 'flex-1'
                      }`}
                    >
                      {column.render ? (
                        <div className="w-full min-w-0">
                          {column.render(row[column.key], row)}
                        </div>
                      ) : (
                        <div
                          className={`text-sm leading-5 w-full text-primary font-normal truncate ${
                            column.className || ''
                          }`}
                          title={String(row[column.key] || '')}
                        >
                          {row[column.key] as ReactNode}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute top-12 left-0 right-0 bottom-0 flex items-center justify-center">
            <div className="text-muted-foreground">{loadingText}</div>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  );
};

// Sort Icon Component
const SortIcon = ({ state }: { state: SortState }) => {
  return (
    <div className="w-4 h-4 relative overflow-hidden">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        {/* Top triangle */}
        <path
          d="M7.99989 1.77777L11.5554 7.1111H4.44434L7.99989 1.77777Z"
          fill={state === 'ascending' ? 'var(--purple)' : 'var(--text-tertiary)'}
        />
        {/* Bottom triangle */}
        <path
          d="M7.99989 14.2222L11.5554 8.8889H4.44434L7.99989 14.2222Z"
          fill={state === 'descending' ? 'var(--purple)' : 'var(--text-tertiary)'}
        />
      </svg>
    </div>
  );
};
