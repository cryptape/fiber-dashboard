import { ReactNode } from "react";

interface GlassCardContainerProps {
  children: ReactNode;
  className?: string;
}

export const GlassCardContainer = ({
  children,
  className = "",
}: GlassCardContainerProps) => {
  return (
    <div className={`glass-card p-4 rounded-2xl ${className}`.trim()}>
      {children}
    </div>
  );
};
