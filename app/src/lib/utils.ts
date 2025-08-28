import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToDecimal(hex: string): bigint {
  if (hex.startsWith("0x")) {
    return BigInt(hex);
  }
  return BigInt("0x" + hex);
}

/**
 * Converts a u128 little-endian hex string to a decimal value
 * The hex string represents 16 bytes in little-endian order
 * @param hex - Hex string like "0x8005c1de0a3e14000000000000000000"
 * @returns BigInt representing the decimal value
 */
export function u128LittleEndianToDecimal(hex: string): bigint {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;

  // Ensure the hex string is 32 characters (16 bytes) by padding with zeros
  const paddedHex = cleanHex.padStart(32, "0");

  // Split into bytes and reverse (little-endian to big-endian)
  const bytes: number[] = [];
  for (let i = 0; i < paddedHex.length; i += 2) {
    bytes.push(parseInt(paddedHex.substr(i, 2), 16));
  }

  // Reverse the bytes to convert from little-endian to big-endian
  bytes.reverse();

  // Convert back to hex string
  const reversedHex = bytes.map(b => b.toString(16).padStart(2, "0")).join("");

  return BigInt("0x" + reversedHex);
}

/**
 * Formats a number to a compact string with k/m/b suffixes
 * @param value - The number or string to format
 * @param precision - Number of decimal places (default: 1, null for no decimals)
 * @returns Formatted string (e.g., "1.2k", "3.4m", "2.1b")
 */
export function formatCompactNumber(
  value: number | string,
  precision: number | null = 1
): string {
  // Handle string input
  if (typeof value === "string") {
    // Try to extract number from string (e.g., "1,234.56" -> 1234.56)
    const cleanValue = value.replace(/,/g, "");
    const numberValue = parseFloat(cleanValue);

    if (isNaN(numberValue)) {
      return value; // Return original string if not a valid number
    }

    value = numberValue; // Continue with number processing
  }

  if (value === 0) return "0";

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  // Helper function to format with precision
  const formatWithPrecision = (num: number): string => {
    if (precision === null) {
      return Math.round(num).toString();
    }
    return num.toFixed(precision);
  };

  if (absValue >= 1e9) {
    return `${sign}${formatWithPrecision(absValue / 1e9)}b`;
  } else if (absValue >= 1e6) {
    return `${sign}${formatWithPrecision(absValue / 1e6)}m`;
  } else if (absValue >= 1e3) {
    return `${sign}${formatWithPrecision(absValue / 1e3)}k`;
  } else {
    // For numbers less than 1000, show as is
    if (precision === null) {
      return `${sign}${Math.round(absValue)}`;
    }
    return `${sign}${absValue.toFixed(Math.min(precision, 2))}`;
  }
}
