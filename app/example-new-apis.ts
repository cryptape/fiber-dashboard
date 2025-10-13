// Example usage of the new APIs added to client.ts
import { APIClient, ChannelState } from "./src/lib";

async function exampleUsage() {
  const client = new APIClient();

  // Example channel ID and node ID (replace with actual values)
  const exampleChannelId = "0x1234567890abcdef";
  const exampleNodeId = "0xabcdef1234567890";

  try {
    // 1. Get channel state
    console.log("Getting channel state...");
    const channelState = await client.getChannelState(exampleChannelId);
    console.log("Channel state:", channelState);

    // 2. Get channels grouped by state
    console.log("\nGetting open channels...");
    const openChannels = await client.getGroupChannelsByState("open", 0);
    console.log("Open channels (page 0):", openChannels);

    console.log("\nGetting closed channels...");
    const closedChannels = await client.getGroupChannelsByState("closed", 0);
    console.log("Closed channels (page 0):", closedChannels);

    // 3. Get detailed channel info
    console.log("\nGetting channel info...");
    const channelInfo = await client.getChannelInfo(exampleChannelId);
    console.log("Channel info:", channelInfo);

    // 4. Get detailed node info
    console.log("\nGetting node info...");
    const nodeInfo = await client.getNodeInfo(exampleNodeId);
    console.log("Node info:", nodeInfo);
  } catch (error) {
    console.error("Error calling API:", error);
  }
}

// Uncomment to run the example
// exampleUsage();
