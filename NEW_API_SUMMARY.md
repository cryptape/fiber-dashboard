# New API Endpoints Added to client.ts

This document summarizes the 4 new API endpoints that have been added to the `app/src/lib/client.ts` file based on the backend updates mentioned in the README.

## Changes Made

### 1. Types Added (app/src/lib/types.ts)

- **ChannelState**: Union type for channel states (`"open" | "commitment" | "closed"`)
- **ChannelStateInfo**: Schema and type for channel state information
- **ChannelInfoResponse**: Type for single channel detailed information  
- **NodeInfoResponse**: Type for single node detailed information
- **GroupChannelsByStateResponse**: Schema and type for paginated channels grouped by state

### 2. API Methods Added (app/src/lib/client.ts)

#### `getChannelState(channelId: string): Promise<ChannelStateInfo>`
- **Endpoint**: `/channel_state?channel_id=0x..`
- **Purpose**: Get the current state of a specific channel
- **Parameters**: 
  - `channelId`: The channel ID (hex string)
- **Returns**: Channel state information

#### `getGroupChannelsByState(state: ChannelState, page: number = 0): Promise<GroupChannelsByStateResponse>`
- **Endpoint**: `/group_channel_by_state?state="open/commitment/closed"&page=0`
- **Purpose**: Get paginated list of channels filtered by their state
- **Parameters**:
  - `state`: Channel state filter (`"open"`, `"commitment"`, or `"closed"`)
  - `page`: Page number for pagination (defaults to 0)
- **Returns**: Paginated response with channels in the specified state

#### `getChannelInfo(channelId: string): Promise<ChannelInfoResponse>`
- **Endpoint**: `/channel_info?channel_id=0x..`
- **Purpose**: Get detailed information about a specific channel
- **Parameters**:
  - `channelId`: The channel ID (hex string)
- **Returns**: Detailed channel information (uses existing `RustChannelInfo` schema)

#### `getNodeInfo(nodeId: string): Promise<NodeInfoResponse>`
- **Endpoint**: `/node_info?node_id=0x..`
- **Purpose**: Get detailed information about a specific node
- **Parameters**:
  - `nodeId`: The node ID (hex string)  
- **Returns**: Detailed node information (uses existing `RustNodeInfo` schema)

## Features

- ✅ All methods include proper TypeScript typing with Zod schemas
- ✅ URL encoding for parameters to handle special characters
- ✅ Consistent error handling via the existing `apiRequest` method
- ✅ Automatic `net` parameter addition (mainnet/testnet)
- ✅ All new types are exported via the existing module exports

## Usage Example

```typescript
import { APIClient } from './src/lib';

const client = new APIClient();

// Get channel state
const state = await client.getChannelState('0x1234...');

// Get open channels (first page)
const openChannels = await client.getGroupChannelsByState('open', 0);

// Get channel details
const channelInfo = await client.getChannelInfo('0x1234...');

// Get node details  
const nodeInfo = await client.getNodeInfo('0xabcd...');
```

## Backwards Compatibility

- ✅ No breaking changes to existing API methods
- ✅ All existing functionality remains unchanged
- ✅ New types and methods are additive only
