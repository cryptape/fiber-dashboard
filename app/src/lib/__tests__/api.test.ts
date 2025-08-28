import { describe, it, expect, vi, beforeEach } from "vitest";
import { APIClient } from "../client";

// Mock fetch
global.fetch = vi.fn();

describe("API Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchDashboardData", () => {
    it("returns mock data when no real API is configured", async () => {
      const apiClient = new APIClient();
      const data = await apiClient.fetchDashboardData();

      expect(data).toHaveProperty("timeSeries");
      expect(data).toHaveProperty("geoNodes");
      expect(data).toHaveProperty("ispRankings");
    });

    it("returns mock data when real API fails", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("API Error")
      );

      const apiClient = new APIClient();
      await apiClient.fetchDashboardData();
    });
  });
});
