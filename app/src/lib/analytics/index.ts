export {
  initPostHog,
  capturePageView,
  capturePageLeave,
  identifyUser,
  resetUser,
  captureEvent,
  posthog,
} from "./posthog";

export { PostHogProvider } from "./PostHogProvider";

export { useWebVitals, capturePageReadyTime } from "./web-vitals";
