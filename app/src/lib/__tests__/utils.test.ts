import { formatCompactNumber } from "../utils";

describe("formatCompactNumber", () => {
  it("should format numbers less than 1000 correctly", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(123)).toBe("123.0");
    expect(formatCompactNumber(999)).toBe("999.0");
    expect(formatCompactNumber(123.45)).toBe("123.5");
  });

  it("should format thousands with k suffix", () => {
    expect(formatCompactNumber(1000)).toBe("1.0k");
    expect(formatCompactNumber(1500)).toBe("1.5k");
    expect(formatCompactNumber(999999)).toBe("1000.0k");
  });

  it("should format millions with m suffix", () => {
    expect(formatCompactNumber(1000000)).toBe("1.0m");
    expect(formatCompactNumber(2500000)).toBe("2.5m");
    expect(formatCompactNumber(999999999)).toBe("1000.0m");
  });

  it("should format billions with b suffix", () => {
    expect(formatCompactNumber(1000000000)).toBe("1.0b");
    expect(formatCompactNumber(2500000000)).toBe("2.5b");
  });

  it("should handle negative numbers", () => {
    expect(formatCompactNumber(-1000)).toBe("-1.0k");
    expect(formatCompactNumber(-1500000)).toBe("-1.5m");
  });

  it("should respect precision parameter", () => {
    expect(formatCompactNumber(1234, 0)).toBe("1k");
    expect(formatCompactNumber(1234, 2)).toBe("1.23k");
    expect(formatCompactNumber(1234567, 3)).toBe("1.235m");
  });

  it("should handle null precision (no decimals)", () => {
    expect(formatCompactNumber(123, null)).toBe("123");
    expect(formatCompactNumber(1234, null)).toBe("1k");
    expect(formatCompactNumber(1234567, null)).toBe("1m");
    expect(formatCompactNumber(1234567890, null)).toBe("1b");
    expect(formatCompactNumber(123.45, null)).toBe("123");
    expect(formatCompactNumber(1234.56, null)).toBe("1k");
    expect(formatCompactNumber(-1234.56, null)).toBe("-1k");
  });

  it("should handle string inputs with numbers", () => {
    expect(formatCompactNumber("123")).toBe("123.0");
    expect(formatCompactNumber("1,234")).toBe("1.2k");
    expect(formatCompactNumber("1,234,567")).toBe("1.2m");
    expect(formatCompactNumber("1,234,567,890")).toBe("1.2b");
  });

  it("should handle string inputs with decimals", () => {
    expect(formatCompactNumber("123.45")).toBe("123.5");
    expect(formatCompactNumber("1,234.56")).toBe("1.2k");
  });

  it("should handle string inputs with null precision", () => {
    expect(formatCompactNumber("123.45", null)).toBe("123");
    expect(formatCompactNumber("1,234.56", null)).toBe("1k");
    expect(formatCompactNumber("1,234,567.89", null)).toBe("1m");
  });

  it("should return original string for non-numeric strings", () => {
    expect(formatCompactNumber("abc")).toBe("abc");
    expect(formatCompactNumber("123abc")).toBe("123abc");
    expect(formatCompactNumber("")).toBe("");
  });
});
