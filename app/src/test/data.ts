import { RustNodeInfo, RustChannelInfo } from "../lib/types";

export interface MockDataConfig {
  nodeCount: number;
  channelCount: number;
}

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
      loc: `${city}, ${country}`,
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
