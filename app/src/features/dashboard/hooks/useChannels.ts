import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { ChannelState } from "@/lib/types";

// Query keys for channels
export const channelQueryKeys = {
  all: ["channels"] as const,
  byState: (state: ChannelState, page: number = 0) =>
    [...channelQueryKeys.all, "by-state", state, page] as const,
  detail: (channelId: string) =>
    [...channelQueryKeys.all, "detail", channelId] as const,
  state: (channelId: string) =>
    [...channelQueryKeys.all, "state", channelId] as const,
};

// Custom hooks for channel data
export function useChannelsByState(state: ChannelState, page: number = 0) {
  const { apiClient, currentNetwork } = useNetwork();

  return useQuery({
    queryKey: [...channelQueryKeys.byState(state, page), currentNetwork],
    queryFn: () => apiClient.getGroupChannelsByState(state, page),
    refetchInterval: 300000, // 5 minutes
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
