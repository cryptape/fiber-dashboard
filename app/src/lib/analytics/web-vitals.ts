"use client";

import { useEffect } from "react";
import { captureEvent } from "./posthog";

type WebVitalsMetric = {
  id: string;
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  entries: PerformanceEntry[];
  navigationType: string;
};

function getRating(name: string, value: number): WebVitalsMetric["rating"] {
  switch (name) {
    case "CLS":
      return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
    case "FCP":
      return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
    case "FID":
      return value <= 100 ? "good" : value <= 300 ? "needs-improvement" : "poor";
    case "INP":
      return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
    case "LCP":
      return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
    case "TTFB":
      return value <= 800 ? "good" : value <= 1800 ? "needs-improvement" : "poor";
    default:
      return "good";
  }
}

function sendToAnalytics(metric: WebVitalsMetric) {
  captureEvent("web_vitals", {
    metric_name: metric.name,
    metric_value: Math.round(metric.value * 1000) / 1000,
    metric_rating: metric.rating,
    metric_id: metric.id,
    navigation_type: metric.navigationType,
  });
}

function initWebVitals() {
  if (typeof window === "undefined") return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const name = entry.name;
        let value: number;

        switch (name) {
          case "largest-contentful-paint":
            value = (entry as PerformanceEntry & { startTime: number }).startTime;
            sendToAnalytics({
              id: entry.entryType + entry.startTime,
              name: "LCP",
              value,
              rating: getRating("LCP", value),
              delta: value,
              entries: [entry],
              navigationType: "navigate",
            });
            break;
          case "first-input":
            {
              const fidEntry = entry as PerformanceEntry & {
                processingStart: number;
                startTime: number;
              };
              value = fidEntry.processingStart - fidEntry.startTime;
              sendToAnalytics({
                id: entry.entryType + entry.startTime,
                name: "FID",
                value,
                rating: getRating("FID", value),
                delta: value,
                entries: [entry],
                navigationType: "navigate",
              });
            }
            break;
          case "layout-shift":
            {
              const clsEntry = entry as PerformanceEntry & { value: number };
              if (!(clsEntry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
                value = clsEntry.value;
                sendToAnalytics({
                  id: entry.entryType + entry.startTime,
                  name: "CLS",
                  value,
                  rating: getRating("CLS", value),
                  delta: value,
                  entries: [entry],
                  navigationType: "navigate",
                });
              }
            }
            break;
          case "paint":
            if (entry.name === "first-contentful-paint") {
              value = (entry as PerformanceEntry & { startTime: number }).startTime;
              sendToAnalytics({
                id: entry.entryType + entry.startTime,
                name: "FCP",
                value,
                rating: getRating("FCP", value),
                delta: value,
                entries: [entry],
                navigationType: "navigate",
              });
            }
            break;
        }
      }
    });

    observer.observe({ entryTypes: ["largest-contentful-paint", "first-input", "layout-shift", "paint"] });

    // TTFB from navigation timing
    window.addEventListener("load", () => {
      setTimeout(() => {
        const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        if (navEntry) {
          const value = navEntry.responseStart - navEntry.startTime;
          sendToAnalytics({
            id: "ttfb-" + navEntry.startTime,
            name: "TTFB",
            value,
            rating: getRating("TTFB", value),
            delta: value,
            entries: [navEntry],
            navigationType: navEntry.type,
          });
        }
      }, 0);
    });
  } catch (error) {
    console.error("Web Vitals monitoring error:", error);
  }
}

export function useWebVitals() {
  useEffect(() => {
    initWebVitals();
  }, []);
}

export function capturePageReadyTime(startTime: number) {
  const readyTime = performance.now() - startTime;
  captureEvent("page_ready_time", {
    duration_ms: Math.round(readyTime),
    timestamp: new Date().toISOString(),
  });
}
