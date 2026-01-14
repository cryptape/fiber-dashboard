import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { ChannelState } from "@/lib/types";

// Query keys for channels
export const channelQueryKeys = {
  all: ["channels"] as const,
  byState: (states: ChannelState | ChannelState[], page: number = 0, fuzzName?: string, assetName?: string) => {
    const stateKey = Array.isArray(states) ? states.sort().join(',') : states;
    return [...channelQueryKeys.all, "by-state", stateKey, page, fuzzName || '', assetName || ''] as const;
  },
  detail: (channelId: string) =>
    [...channelQueryKeys.all, "detail", channelId] as const,
  state: (channelId: string) =>
    [...channelQueryKeys.all, "state", channelId] as const,
};

// Custom hooks for channel data
export function useChannelsByState(
  states: ChannelState | ChannelState[], 
  page: number = 0,
  sortBy: string = 'last_commit_time',
  order: 'asc' | 'desc' = 'desc',
  fuzzName?: string,
  assetName?: string
) {
  const { apiClient, currentNetwork } = useNetwork();

  return useQuery({
    queryKey: [...channelQueryKeys.byState(states, page, fuzzName, assetName), currentNetwork, sortBy, order],
    queryFn: () => apiClient.getGroupChannelsByState(states, page, 10, sortBy, order, fuzzName, assetName),
    refetchInterval: 300000, // 5 minutes
    staleTime: 0, // 确保每次排序都重新请求
  });
}

export function useChannelInfo(channelId: string, enabled: boolean = true) {
  const { apiClient, currentNetwork } = useNetwork();

  return useQuery({
    queryKey: [...channelQueryKeys.detail(channelId), currentNetwork],
    queryFn: () => apiClient.getChannelInfo(channelId),
    enabled: enabled && !!channelId,
    retry: 3,
  });
}

export function useChannelState(channelId: string, enabled: boolean = true) {
  const { apiClient, currentNetwork } = useNetwork();

  return useQuery({
    queryKey: [...channelQueryKeys.state(channelId), currentNetwork],
    queryFn: () => apiClient.getChannelState(channelId),
    enabled: enabled && !!channelId,
    retry: 3,
  });
}
