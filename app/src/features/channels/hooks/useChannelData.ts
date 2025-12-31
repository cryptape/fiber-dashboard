import { useQuery } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";

export function useChannelData(channelOutpoint: string) {
  const { apiClient, currentNetwork } = useNetwork();

  // 获取通道信息
  const {
    data: channelInfo,
    isLoading: channelLoading,
    error: channelError,
  } = useQuery({
    queryKey: ["channel-info", channelOutpoint, currentNetwork],
    queryFn: () => apiClient.getChannelInfo(channelOutpoint),
    enabled: !!channelOutpoint,
    retry: 3,
  });

  // 获取通道状态和交易信息
  const {
    data: channelState,
    isLoading: stateLoading,
    error: stateError,
  } = useQuery({
    queryKey: ["channel-state", channelOutpoint, currentNetwork],
    queryFn: () => apiClient.getChannelState(channelOutpoint),
    enabled: !!channelOutpoint,
    retry: 3,
  });

  // 获取节点1信息
  const { data: node1Info } = useQuery({
    queryKey: ["node-info", channelInfo?.node1, currentNetwork],
    queryFn: () => apiClient.getNodeInfo(channelInfo!.node1),
    enabled: !!channelInfo?.node1,
  });

  // 获取节点2信息
  const { data: node2Info } = useQuery({
    queryKey: ["node-info", channelInfo?.node2, currentNetwork],
    queryFn: () => apiClient.getNodeInfo(channelInfo!.node2),
    enabled: !!channelInfo?.node2,
  });

  return {
    channelInfo,
    channelState,
    node1Info,
    node2Info,
    isLoading: channelLoading || stateLoading,
    error: channelError || stateError,
  };
}
