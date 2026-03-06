"use client";

import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

export function initPostHog() {
  if (typeof window === "undefined") return;

  if (!POSTHOG_KEY) {
    console.warn("PostHog key is not configured");
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    session_recording: {
      recordCrossOriginIframes: false,
    },
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") {
        posthog.debug(false);
      }
    },
  });
}

export function capturePageView(url: string) {
  if (!POSTHOG_KEY) return;
  posthog.capture("$pageview", {
    $current_url: url,
  });
}

export function capturePageLeave(url: string) {
  if (!POSTHOG_KEY) return;
  posthog.capture("$pageleave", {
    $current_url: url,
  });
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

export function resetUser() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  if (!POSTHOG_KEY) return;
  posthog.capture(eventName, properties);
}

export { posthog };
