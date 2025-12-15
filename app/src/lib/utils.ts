import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToDecimal(hex: string, isLittleEndian: boolean = false): bigint {
  let hexStr = hex.startsWith("0x") ? hex.slice(2) : hex;
  
  if (isLittleEndian) {
    // 小端序：每两个字符为一组，反转字节序
    const bytes = hexStr.match(/.{2}/g) || [];
    hexStr = bytes.reverse().join('');
  }
  
  return BigInt("0x" + hexStr);
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
 * Converts a u64 little-endian hex string to a decimal value
 * The hex string represents 8 bytes in little-endian order
 * @param hex - Hex string like "0xb4821e0100000000"
 * @returns BigInt representing the decimal value
 */
export function u64LittleEndianToDecimal(hex: string): bigint {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;

  // Ensure the hex string is 16 characters (8 bytes) by padding with zeros
  const paddedHex = cleanHex.padStart(16, "0");

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

export function formatCompactNumber(
  value: number | string | bigint,
  precision: number | null = 1
): string {
  let processedValue: number | bigint;

  // Handle string input
  if (typeof value === "string") {
    // Check if it's a hex string
    if (value.startsWith("0x")) {
      try {
        processedValue = hexToDecimal(value);
      } catch {
        return value; // Return original string if hex conversion fails
      }
    } else {
      // Try to extract number from string (e.g., "1,234.56" -> 1234.56)
      const cleanValue = value.replace(/,/g, "");

      // Check if the string contains only numeric characters, decimal point, and minus sign
      if (!/^[-]?\d*\.?\d*$/.test(cleanValue)) {
        return value; // Return original string if it contains non-numeric characters
      }

      const numberValue = parseFloat(cleanValue);

      if (isNaN(numberValue)) {
        return value; // Return original string if not a valid number
      }

      processedValue = numberValue; // Continue with number processing
    }
  } else {
    processedValue = value;
  }

  // Convert bigint to number for formatting
  if (typeof processedValue === "bigint") {
    processedValue = Number(processedValue);
  }

  const numValue = processedValue as number;

  if (numValue === 0) return "0";

  const absValue = Math.abs(numValue);
  const sign = numValue < 0 ? "-" : "";

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

export function buildTransactionLinkUrl(
  txHash: string,
  network: "mainnet" | "testnet"
): string {
  const baseUrl =
    network === "mainnet"
      ? "https://explorer.nervos.org"
      : "https://testnet.explorer.nervos.org";
  return `${baseUrl}/transaction/${txHash}`;
}
