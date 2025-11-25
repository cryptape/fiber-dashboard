'use client';

// 左箭头 SVG 组件
const LeftArrowIcon = ({ className = '' }: { className?: string }) => (
  <svg width="9" height="15" viewBox="0 0 9 15" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M7.25 13.25L1.25 7.25L7.25 1.25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) => {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const handlePrevious = () => {
    if (!isFirstPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage) {
      onPageChange(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (showEllipsisStart) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (showEllipsisEnd) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={`inline-flex justify-start items-center gap-2 ${className}`}>
      {/* Previous Button */}
      <button
        onClick={handlePrevious}
        disabled={isFirstPage}
        className={`w-10 h-10 p-2.5 rounded-sm inline-flex justify-center items-center ${
          isFirstPage ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <LeftArrowIcon className={isFirstPage ? 'text-tertiary' : 'text-primary'} />
      </button>

      {/* Page Numbers */}
      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={typeof page === 'string'}
          className={`w-10 h-10 p-2.5 rounded-sm inline-flex flex-col justify-center items-center gap-2.5 ${
            page === currentPage ? 'bg-inverse' : ''
          } ${
            typeof page === 'string' ? 'cursor-default' : 'cursor-pointer'
          }`}
        >
          <div className={`self-stretch text-center text-base font-medium leading-5 ${
            page === currentPage
              ? 'text-on'
              : 'text-tertiary'
          }`}>
            {page}
          </div>
        </button>
      ))}

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={isLastPage}
        className={`w-10 h-10 p-2.5 rounded-sm inline-flex justify-center items-center ${
          isLastPage ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <LeftArrowIcon className={`rotate-180 ${isLastPage ? 'text-tertiary' : 'text-primary'}`} />
      </button>
    </div>
  );
};
