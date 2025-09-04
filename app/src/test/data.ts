import { RustNodeInfo, RustChannelInfo } from "../lib/types";

export interface MockDataConfig {
  nodeCount: number;
  channelCount: number;
}

// Weighted anchors around major population centers (very rough, for mock data only)
const populatedAnchors: Array<{
  latitude: number;
  longitude: number;
  weight: number;
}> = [
  { latitude: 40.7128, longitude: -74.006, weight: 5 }, // New York
  { latitude: 34.0522, longitude: -118.2437, weight: 4 }, // Los Angeles
  { latitude: 41.8781, longitude: -87.6298, weight: 3 }, // Chicago
  { latitude: 29.7604, longitude: -95.3698, weight: 2 }, // Houston
  { latitude: 19.4326, longitude: -99.1332, weight: 3 }, // Mexico City
  { latitude: -23.5505, longitude: -46.6333, weight: 3 }, // São Paulo
  { latitude: -34.6037, longitude: -58.3816, weight: 2 }, // Buenos Aires
  { latitude: 51.5074, longitude: -0.1278, weight: 5 }, // London
  { latitude: 48.8566, longitude: 2.3522, weight: 4 }, // Paris
  { latitude: 52.52, longitude: 13.405, weight: 3 }, // Berlin
  { latitude: 41.9028, longitude: 12.4964, weight: 2 }, // Rome
  { latitude: 55.7558, longitude: 37.6173, weight: 3 }, // Moscow
  { latitude: 35.6762, longitude: 139.6503, weight: 5 }, // Tokyo
  { latitude: 31.2304, longitude: 121.4737, weight: 5 }, // Shanghai
  { latitude: 39.9042, longitude: 116.4074, weight: 5 }, // Beijing
  { latitude: 22.2783, longitude: 114.1747, weight: 4 }, // Hong Kong
  { latitude: 28.6139, longitude: 77.209, weight: 5 }, // Delhi
  { latitude: 19.076, longitude: 72.8777, weight: 4 }, // Mumbai
  { latitude: 1.3521, longitude: 103.8198, weight: 4 }, // Singapore
  { latitude: 13.7563, longitude: 100.5018, weight: 3 }, // Bangkok
  { latitude: -6.2088, longitude: 106.8456, weight: 4 }, // Jakarta
  { latitude: -33.8688, longitude: 151.2093, weight: 3 }, // Sydney
  { latitude: -37.8136, longitude: 144.9631, weight: 2 }, // Melbourne
  { latitude: 30.0444, longitude: 31.2357, weight: 3 }, // Cairo
  { latitude: 6.5244, longitude: 3.3792, weight: 4 }, // Lagos
  { latitude: -26.2041, longitude: 28.0473, weight: 3 }, // Johannesburg
  { latitude: 24.7136, longitude: 46.6753, weight: 3 }, // Riyadh
  { latitude: 25.2048, longitude: 55.2708, weight: 3 }, // Dubai
  { latitude: -1.2921, longitude: 36.8219, weight: 2 }, // Nairobi
];

const pickWeightedAnchor = (): { latitude: number; longitude: number } => {
  const total = populatedAnchors.reduce((sum, a) => sum + a.weight, 0);
  let r = Math.random() * total;
  for (const anchor of populatedAnchors) {
    if ((r -= anchor.weight) <= 0) {
      return { latitude: anchor.latitude, longitude: anchor.longitude };
    }
  }
  return {
    latitude: populatedAnchors[0].latitude,
    longitude: populatedAnchors[0].longitude,
  };
};

const generateBiasedLocationString = (): string => {
  const base = pickWeightedAnchor();
  // Add small jitter (~±0.5°) to spread points around cities and land areas
  const jitterLat = (Math.random() - 0.5) * 1.0;
  const jitterLon = (Math.random() - 0.5) * 1.0;
  let latitude = base.latitude + jitterLat;
  let longitude = base.longitude + jitterLon;
  // Clamp to valid ranges
  if (latitude > 90) latitude = 90;
  if (latitude < -90) latitude = -90;
  if (longitude > 180) longitude = 180;
  if (longitude < -180) longitude = -180;
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
};

const generateNodeId = (): string => {
  const prefix = "02";
  const randomHex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return prefix + randomHex;
};

const generateChannelOutpoint = (): string => {
  const txHash = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  const outputIndex = Math.floor(Math.random() * 1000);
  return `${txHash}:${outputIndex}`;
};

const generateCapacity = (): string => {
  const capacityInShannons = Math.floor(Math.random() * 1000000000) + 10000000; // 0.01 to 10 CKB
  return "0x" + capacityInShannons.toString(16);
};

const generateTimestamp = (): number => {
  const now = new Date();
  const randomDaysAgo = Math.floor(Math.random() * 365);
  const randomDate = new Date(
    now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000
  );
  return randomDate.getMilliseconds();
};

const generateTimeString = (): string => {
  const now = new Date();
  const randomDaysAgo = Math.floor(Math.random() * 365);
  const randomDate = new Date(
    now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000
  );
  return randomDate.toISOString();
};

const generateAddress = (): string => {
  const ip = Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 256)
  ).join(".");
  const port = Math.floor(Math.random() * 65535) + 1024;
  return `/ip4/${ip}/tcp/${port}`;
};

const generateNodeName = (): string => {
  const prefixes = ["Node", "Hub", "Gateway", "Router"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNum = Math.floor(Math.random() * 10000);
  return `${prefix}-${randomNum}`;
};

export function generateMockData(
  config: MockDataConfig = { nodeCount: 100, channelCount: 500 }
): {
  nodes: RustNodeInfo[];
  channels: RustChannelInfo[];
} {
  // Generate nodes
  const nodes: RustNodeInfo[] = [];
  for (let i = 0; i < config.nodeCount; i++) {
    const country = [
      "United States",
      "Germany",
      "Netherlands",
      "Japan",
      "Singapore",
    ][Math.floor(Math.random() * 5)];
    const city = ["New York", "Frankfurt", "Amsterdam", "Tokyo", "Singapore"][
      Math.floor(Math.random() * 5)
    ];

    nodes.push({
      node_id: generateNodeId(),
      node_name: generateNodeName(),
      addresses: [generateAddress()],
      commit_timestamp: generateTimeString(),
      announce_timestamp: generateTimestamp(),
      chain_hash:
        "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      auto_accept_min_ckb_funding_amount: 0,
      country,
      city,
      region: country,
      loc: generateBiasedLocationString(),
    });
  }

  // Generate channels
  const channels: RustChannelInfo[] = [];
  for (let i = 0; i < config.channelCount; i++) {
    const node1Index = Math.floor(Math.random() * config.nodeCount);
    let node2Index = Math.floor(Math.random() * config.nodeCount);

    // Ensure node1 and node2 are different
    while (node2Index === node1Index) {
      node2Index = Math.floor(Math.random() * config.nodeCount);
    }

    channels.push({
      channel_outpoint: generateChannelOutpoint(),
      node1: nodes[node1Index].node_id,
      node2: nodes[node2Index].node_id,
      commit_timestamp: generateTimeString(),
      created_timestamp: generateTimeString(),
      capacity: generateCapacity(),
      chain_hash:
        "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      udt_type_script: undefined,
      update_info_of_node1: undefined,
      update_info_of_node2: undefined,
    });
  }

  return { nodes, channels };
}
