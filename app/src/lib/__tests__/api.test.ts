import { describe, it, expect, vi, beforeEach } from "vitest";
import { APIClient, MainnetAPIClient, TestnetAPIClient } from "../client";

// Mock fetch
global.fetch = vi.fn();

describe("API Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("APIClient Constructor", () => {
    it("creates client with default mainnet", () => {
      const client = new APIClient();
      expect(client.net).toBe("mainnet");
    });

    it("creates client with testnet", () => {
      const client = new APIClient("http://localhost:8080", "testnet");
      expect(client.net).toBe("testnet");
    });

    it("creates mainnet client via factory method", () => {
      const client = new MainnetAPIClient();
      expect(client.net).toBe("mainnet");
    });

    it("creates testnet client via factory method", () => {
      const client = new TestnetAPIClient();
      expect(client.net).toBe("testnet");
    });
  });

  describe("API Request with net parameter", () => {
    it("adds net parameter to API requests", async () => {
      const mockResponse = { nodes: [], total: 0 };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new APIClient("http://localhost:8080", "testnet");
      await client.getActiveNodesByPage(0);

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8080/nodes_hourly?page=0&net=testnet",
        expect.any(Object)
      );
    });
  });

  describe("Historical data with date parameters", () => {
    it("adds start and end parameters to historical nodes request", async () => {
      const mockResponse = { nodes: [], total: 0 };
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new APIClient();
      await client.getHistoricalNodesByPage(0, "2024-01-01", "2024-01-31");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("start=2024-01-01&end=2024-01-31"),
        expect.any(Object)
      );
    });
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
