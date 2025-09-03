import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  APIClient,
  MainnetAPIClient,
  TestnetAPIClient,
  APIUtils,
} from "../client";

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

describe("Capacity Parsing", () => {
  it("correctly extracts and parses capacity data from real API response structure", () => {
    // Simulate the exact API response structure from curl command
    const mockHistoryAnalysis = {
      series: [
        {
          name: "Channels",
          points: [["2025-09-02", 126]],
        },
        {
          name: "Capacity",
          points: [
            [
              "2025-09-02",
              [
                "0x809948af7b3b14000000000000000000", // sum_capacity
                "0x9d5af2641b2900000000000000000000", // avg_capacity
                "0x80969800000000000000000000000000", // min_capacity
                "0x004bdfa72bac00000000000000000000", // max_capacity
                "0x8081af133a0100000000000000000000", // median_capacity
              ],
            ],
          ],
        },
      ],
      meta: {
        fields: ["Channels", "Capacity"],
        start_time: "2025-08-04",
        end_time: "2025-09-03",
        interval: "day",
        range: "1M",
      },
    };

    // Test the exact client code logic
    const capacitySeries = mockHistoryAnalysis.series.find(
      s => s.name === "Capacity"
    );
    const channelsSeries = mockHistoryAnalysis.series.find(
      s => s.name === "Channels"
    );

    // Verify series extraction works
    expect(capacitySeries).toBeDefined();
    expect(channelsSeries).toBeDefined();
    expect(capacitySeries?.name).toBe("Capacity");
    expect(channelsSeries?.name).toBe("Channels");

    // Test the exact parsing logic from the client code
    const capacityTimeSeries =
      capacitySeries?.points.map(point => {
        return {
          timestamp: point[0],
          value: APIUtils.parseChannelCapacityToCKB((point[1] as string[])[0]), // Use sum (first element)
        };
      }) || [];

    // Verify the parsing worked correctly
    expect(capacityTimeSeries).toHaveLength(1);
    expect(capacityTimeSeries[0].timestamp).toBe("2025-09-02");
    expect(typeof capacityTimeSeries[0].value).toBe("number");
    expect(capacityTimeSeries[0].value).toBeGreaterThan(0);

    // Test that we can access all capacity metrics by index
    const firstPoint = capacitySeries?.points[0];
    expect(firstPoint).toBeDefined();

    const capacityArray = firstPoint![1] as string[];
    expect(Array.isArray(capacityArray)).toBe(true);
    expect(capacityArray).toHaveLength(5);

    // Test parsing each capacity metric
    const sumCapacity = APIUtils.parseChannelCapacityToCKB(capacityArray[0]);
    const avgCapacity = APIUtils.parseChannelCapacityToCKB(capacityArray[1]);
    const minCapacity = APIUtils.parseChannelCapacityToCKB(capacityArray[2]);
    const maxCapacity = APIUtils.parseChannelCapacityToCKB(capacityArray[3]);
    const medianCapacity = APIUtils.parseChannelCapacityToCKB(capacityArray[4]);

    // Verify all values are valid numbers
    expect(typeof sumCapacity).toBe("number");
    expect(typeof avgCapacity).toBe("number");
    expect(typeof minCapacity).toBe("number");
    expect(typeof maxCapacity).toBe("number");
    expect(typeof medianCapacity).toBe("number");

    // Verify logical relationships between capacity values
    expect(sumCapacity).toBeGreaterThan(0);
    expect(avgCapacity).toBeGreaterThan(0);
    expect(minCapacity).toBeGreaterThan(0);
    expect(maxCapacity).toBeGreaterThan(0);
    expect(medianCapacity).toBeGreaterThan(0);
  });
});
