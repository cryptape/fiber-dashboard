import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import KpiCard from "../KpiCard";
import { TrendingUp } from "lucide-react";

describe("KpiCard", () => {
  it("renders with title and value", () => {
    render(<KpiCard title="Total Capacity" value="15,420.5 BTC" />);

    expect(screen.getByText("Total Capacity")).toBeInTheDocument();
    expect(screen.getByText("15,420.5 BTC")).toBeInTheDocument();
  });

  it("renders with positive change", () => {
    render(
      <KpiCard
        title="Total Nodes"
        value="18,743"
        change={12.5}
        changeLabel="vs last month"
      />
    );

    expect(screen.getByText("+12.5%")).toBeInTheDocument();
    expect(screen.getByText("vs last month")).toBeInTheDocument();
  });

  it("renders with negative change", () => {
    render(
      <KpiCard
        title="Total Channels"
        value="89,234"
        change={-5.2}
        changeLabel="vs last month"
      />
    );

    expect(screen.getByText("-5.2%")).toBeInTheDocument();
  });

  it("renders with icon", () => {
    render(
      <KpiCard title="Network Growth" value="12.5%" icon={<TrendingUp />} />
    );

    expect(screen.getByText("Network Growth")).toBeInTheDocument();
    expect(screen.getByText("12.5%")).toBeInTheDocument();
  });
});
