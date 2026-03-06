"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { initPostHog, capturePageView } from "./posthog";
import { useWebVitals } from "./web-vitals";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (pathname) {
      const url =
        pathname +
        (searchParams?.toString() ? `?${searchParams.toString()}` : "");
      capturePageView(url);
    }
  }, [pathname, searchParams]);

  return null;
}

function WebVitalsTracker() {
  useWebVitals();
  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
        <WebVitalsTracker />
      </Suspense>
      {children}
    </>
  );
}
