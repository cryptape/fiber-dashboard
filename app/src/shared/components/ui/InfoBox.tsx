import React from 'react';

interface InfoBoxProps {
  title: string;
  content: string;
  className?: string;
}

export const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  content,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col gap-1 rounded p-2 ${className}`}
      style={{
        backgroundColor: '#674BDC1A',
        outline: '1px solid var(--purple)',
        outlineOffset: '-1px',
      }}
    >
      <div className="type-body text-primary" style={{ fontWeight: 700 }}>
        {title}
      </div>
      <div className="type-body text-primary">{content}</div>
    </div>
  );
};

export default InfoBox;
