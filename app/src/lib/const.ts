import packageJson from "../../package.json";

export const APP_CONFIG = {
  name: "Fiber Dashboard",
  description: "Real-time insights into the CKB Lightning Network Fiber",
  shortDescription: "CKB Lightning Analytics",
  version: packageJson.version,
} as const;

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
} as const;

export const SHANNONS_PER_CKB = 100_000_000;
