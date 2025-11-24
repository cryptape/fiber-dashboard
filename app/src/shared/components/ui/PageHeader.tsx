'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  backUrl?: string;
  showBackButton?: boolean;
  className?: string;
}

export const PageHeader = ({
  title,
  onBack,
  backUrl,
  showBackButton = true,
  className = '',
}: PageHeaderProps) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <div className={`flex items-center gap-3 mb-5 ${className}`}>
      {showBackButton && (
        <Image
          src="/back.svg"
          alt="Back"
          width={24}
          height={24}
          className="cursor-pointer"
          onClick={handleBack}
        />
      )}
      <div className="type-h2">{title}</div>
    </div>
  );
};
