import React from 'react';
import { CopyButton } from './CopyButton';
import { StatusBadge, StatusType } from './StatusBadge';
import { Separator } from './separator';
import { GlassCardContainer } from './GlassCardContainer';

export interface TransactionOverviewField {
  label: string;
  value: string;
  copyable?: boolean;
  badge?: {
    text: string;
    status: StatusType;
  };
  /** 是否为分割线 */
  isSeparator?: boolean;
}

export interface TransactionOverviewProps {
  /** 标题 */
  title?: string;
  /** 交易哈希（显示在标题旁） */
  txHash?: string;
  /** 完整的交易哈希（用于复制） */
  fullTxHash?: string;
  /** 确认状态文本 */
  confirmationText?: string;
  /** 字段列表 */
  fields: TransactionOverviewField[];
  /** 自定义类名 */
  className?: string;
}

export const TransactionOverview: React.FC<TransactionOverviewProps> = ({
  title = 'Transaction overview',
  txHash,
  fullTxHash,
  confirmationText,
  fields,
  className = '',
}) => {
  return (
    <GlassCardContainer className={className}>
      <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="type-h3 text-primary">{title}</div>
          {txHash && fullTxHash && (
            <div className="flex items-center gap-1">
              <span className="type-body text-purple">{txHash}</span>
              <div className="flex items-center">
                <CopyButton text={fullTxHash} ariaLabel="复制交易哈希" />
              </div>
            </div>
          )}
        </div>
        {confirmationText && (
          <div className="flex items-center justify-center gap-2.5 rounded-sm px-2 py-1 bg-success border-success">
            <div className="type-caption text-success">{confirmationText}</div>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => {
          // 如果是分割线
          if (field.isSeparator) {
            return (
              <div key={index} className="py-1">
                <Separator />
              </div>
            );
          }
          
          // 普通字段
          return (
            <div key={index} className="flex items-start gap-2">
              <div className="type-body text-secondary w-32 flex-shrink-0">{field.label}:</div>
              {field.badge ? (
                <StatusBadge text={field.badge.text} status={field.badge.status} />
              ) : (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <div className="type-body text-primary break-all">{field.value}</div>
                  {field.copyable && (
                    <CopyButton text={field.value} ariaLabel={`复制${field.label}`} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </GlassCardContainer>
  );
};

export default TransactionOverview;
