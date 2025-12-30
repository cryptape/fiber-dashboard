import React from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  primaryButtonIcon?: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  primaryButtonText = 'Done',
  secondaryButtonText,
  onPrimaryClick,
  onSecondaryClick,
  primaryButtonIcon,
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(12, 10, 9, 0.6)' }}
    >
      <div
        className={`glass-card relative w-full max-w-[1100px] max-h-[90vh] flex flex-col gap-5 rounded-xl p-10 shadow-lg overflow-hidden ${className}`}
        style={{
          background: 'linear-gradient(to bottom right, rgb(241 245 249), rgb(241 245 249), rgb(254 243 199))',
          outline: '1px solid var(--border-default)',
          outlineOffset: '-1px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="type-h2 text-primary">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center overflow-hidden transition-opacity hover:opacity-70"
            aria-label="Close dialog"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              className="text-primary"
            >
              <path
                d="M24 8L8 24M8 8L24 24"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer Buttons */}
        <div className="flex items-start gap-8">
          {secondaryButtonText && (
            <button
              onClick={onSecondaryClick}
              className="flex h-11 flex-1 items-center justify-center gap-2.5 rounded-full border-purple transition-opacity hover:opacity-80"
              style={{
                outline: '1px solid var(--purple)',
                outlineOffset: '-1px',
              }}
            >
              {primaryButtonIcon && (
                <div className="relative h-4 w-4 overflow-hidden">
                  {primaryButtonIcon}
                </div>
              )}
              <span className="type-button1 text-purple">{secondaryButtonText}</span>
            </button>
          )}
          <button
            onClick={onPrimaryClick || onClose}
            className="bg-purple flex h-11 flex-1 items-center justify-center gap-2.5 rounded-full transition-opacity hover:opacity-90"
          >
            <span className="type-button1 text-on-color">{primaryButtonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
