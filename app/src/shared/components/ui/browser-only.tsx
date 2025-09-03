"use client";

import { useEffect, useState } from "react";

interface BrowserOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function BrowserOnly({ children, fallback = null }: BrowserOnlyProps) {
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  if (!isBrowser) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
