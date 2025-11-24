"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { RustNodeInfo } from "@/lib/types";
import { formatCompactNumber, hexToDecimal, u128LittleEndianToDecimal } from "@/lib/utils";
import {
  SectionHeader,
  Table,
  Pagination,
  ColumnDef,
  SortState,
  GlassCardContainer,
  SearchInput,
  CustomSelect,
  SelectOption,
} from "@/shared/components/ui";
import NodeNetworkMap, { NodeMapData, NodeConnectionData } from "@/shared/components/chart/NodeNetworkMap";

// 节点数据类型
interface NodeData extends Record<string, unknown> {
  nodeId: string;
  nodeName: string;
  channels: number;
  location: string;
  capacity: number; // 改为数字类型，用于排序和计算
  autoAccept: number;
  lastSeen: string;
}

// 带统计信息的节点类型
interface NodeWithStats extends RustNodeInfo {
  totalChannels: number;
  totalCapacity: number;
  formattedLocation: string;
  formattedLastSeen: string;
}



export const Nodes = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { apiClient, currentNetwork } = useNetwork();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [locationValue, setLocationValue] = useState('');
  const [sortKey, setSortKey] = useState<string>('capacity'); // 排序字段
  const [sortState, setSortState] = useState<SortState>('descending'); // 排序方向
  const itemsPerPage = 10; // 每页显示数量

  // 获取节点和通道数据
  const { data: nodes = [], isLoading: nodesLoading, dataUpdatedAt: nodesUpdatedAt } = useQuery({
    queryKey: ['nodes', currentNetwork],
    queryFn: () => apiClient.fetchAllActiveNodes(),
    refetchInterval: 300000, // 5分钟轮询
  });

  const { data: channels = [], isLoading: channelsLoading, dataUpdatedAt: channelsUpdatedAt } = useQuery({
    queryKey: ['channels', currentNetwork],
    queryFn: () => apiClient.fetchAllActiveChannels(),
    refetchInterval: 300000, // 5分钟轮询
  });

  const isLoading = nodesLoading || channelsLoading;

  // 计算最后更新时间
  const lastUpdated = useMemo(() => {
    const latestUpdateTime = Math.max(nodesUpdatedAt, channelsUpdatedAt);
    if (latestUpdateTime === 0) return "";
    
    const updateDate = new Date(latestUpdateTime);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - updateDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return "Last updated: Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Last updated: ${minutes} min${minutes > 1 ? 's' : ''} ago`;
    } else {
      const formattedTime = updateDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `Last updated: ${formattedTime}`;
    }
  }, [nodesUpdatedAt, channelsUpdatedAt]);

  // 当搜索或筛选条件改变时，自动重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, locationValue, sortKey, sortState]);

  // 容量解析工具
  const parseChannelCapacityToCKB = useCallback(
    (capacity: string | number): number => {
      const SHANNONS_PER_CKB = 100000000;

      try {
        const capacityInShannons =
          typeof capacity === "string"
            ? capacity.startsWith("0x") && capacity.length === 34
              ? u128LittleEndianToDecimal(capacity)
              : hexToDecimal(capacity)
            : BigInt(capacity);
        return Number(capacityInShannons) / SHANNONS_PER_CKB;
      } catch (error) {
        console.warn("Error parsing capacity:", error, capacity);
        return 0;
      }
    },
    []
  );

  // 计算节点统计信息
  const nodeStats = useMemo(() => {
    const stats = new Map<string, { channels: number; capacity: number }>();

    channels.forEach(channel => {
      try {
        const capacityInCKB = parseChannelCapacityToCKB(channel.capacity);

        // Add to node1 stats
        const node1Stats = stats.get(channel.node1) || {
          channels: 0,
          capacity: 0,
        };
        node1Stats.channels += 1;
        node1Stats.capacity += capacityInCKB;
        stats.set(channel.node1, node1Stats);

        // Add to node2 stats
        const node2Stats = stats.get(channel.node2) || {
          channels: 0,
          capacity: 0,
        };
        node2Stats.channels += 1;
        node2Stats.capacity += capacityInCKB;
        stats.set(channel.node2, node2Stats);
      } catch (error) {
        console.warn("Error processing channel:", error, channel);
      }
    });

    return stats;
  }, [channels, parseChannelCapacityToCKB]);

  // 处理节点数据，添加统计信息
  const processedNodes = useMemo((): NodeWithStats[] => {
    return nodes.map(node => {
      const nodeStat = nodeStats.get(node.node_id) || {
        channels: 0,
        capacity: 0,
      };

      const location = node.city && node.country 
        ? `${node.city}, ${node.country}` 
        : node.country || "Unknown";

      const announceDate = new Date(node.announce_timestamp);
      const formattedDate = announceDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return {
        ...node,
        totalChannels: nodeStat.channels,
        totalCapacity: nodeStat.capacity,
        formattedLocation: location,
        formattedLastSeen: formattedDate,
      };
    });
  }, [nodes, nodeStats]);

  // 获取所有唯一的国家/地区选项
  const locationOptions: SelectOption[] = useMemo(() => {
    const uniqueCountries = new Set<string>();
    nodes.forEach(node => {
      if (node.country) {
        uniqueCountries.add(node.country);
      }
    });
    return Array.from(uniqueCountries)
      .sort()
      .map(country => ({ value: country, label: country }));
  }, [nodes]);

  // 筛选和排序节点
  const filteredAndSortedNodes = useMemo(() => {
    let filtered = processedNodes;

    // 应用搜索筛选
    if (searchValue) {
      const term = searchValue.toLowerCase().trim();
      filtered = filtered.filter(
        node =>
          node.node_name.toLowerCase().includes(term) ||
          node.node_id.toLowerCase().includes(term) ||
          node.addresses.some(addr => addr.toLowerCase().includes(term))
      );
    }

    // 应用位置筛选
    if (locationValue) {
      filtered = filtered.filter(node => node.country === locationValue);
    }

    // 应用排序
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortKey) {
        case 'channels':
          aValue = a.totalChannels;
          bValue = b.totalChannels;
          break;
        case 'location':
          aValue = a.formattedLocation.toLowerCase();
          bValue = b.formattedLocation.toLowerCase();
          break;
        case 'capacity':
          aValue = a.totalCapacity;
          bValue = b.totalCapacity;
          break;
        case 'lastSeen':
          aValue = new Date(a.announce_timestamp).getTime();
          bValue = new Date(b.announce_timestamp).getTime();
          break;
        default:
          aValue = a.totalCapacity;
          bValue = b.totalCapacity;
      }

      // 字符串比较
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortState === 'ascending'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // 数字比较
      return sortState === 'ascending'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [processedNodes, searchValue, locationValue, sortKey, sortState]);

  // 分页计算
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedNodes.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNodes = filteredAndSortedNodes.slice(startIndex, endIndex);

  // 转换为 NodeData 格式
  const tableData: NodeData[] = useMemo(() => {
    return currentNodes.map(node => ({
      nodeId: node.node_id,
      nodeName: node.node_name,
      channels: node.totalChannels,
      location: node.formattedLocation,
      capacity: node.totalCapacity,
      autoAccept: node.auto_accept_min_ckb_funding_amount / 100000000,
      lastSeen: node.formattedLastSeen,
    }));
  }, [currentNodes]);

  // 转换为地图数据格式
  const mapData: NodeMapData[] = useMemo(() => {
    return processedNodes
      .filter(node => node.loc)
      .map(node => {
        const [lat, lng] = (node.loc || "").split(",").map(coord => parseFloat(coord.trim()));
        return {
          nodeId: node.node_id,
          nodeName: node.node_name,
          city: node.city || "Unknown",
          country: node.country || "Unknown",
          latitude: lat || 0,
          longitude: lng || 0,
          capacity: node.totalCapacity,
        };
      })
      .filter(node => node.latitude !== 0 && node.longitude !== 0);
  }, [processedNodes]);

  // 构建连接数据（基于通道）
  const connectionData: NodeConnectionData[] = useMemo(() => {
    return channels.slice(0, 10000).map(channel => ({
      fromNodeId: channel.node1,
      toNodeId: channel.node2,
    }));
  }, [channels]);
  console.log(mapData, connectionData,'===')

  // 列定义
  const columns: ColumnDef<NodeData>[] = [
    {
      key: 'nodeId',
      label: 'Node ID',
      width: 'w-36',
      sortable: false,
      render: (value, row) => {
        const shortId = (value as string).slice(0, 8) + '...' + (value as string).slice(-4);
        return (
          <span
            className="text-primary cursor-pointer hover:underline font-mono text-xs"
            onClick={() => router.push(`/node/${row.nodeId}`)}
            title={value as string}
          >
            {shortId}
          </span>
        );
      },
    },
    {
      key: "nodeName",
      label: "Node name",
      width: "flex-1",
      sortable: false,
    },
    {
      key: "channels",
      label: "Channels",
      width: "w-32",
      sortable: true,
    },
    {
      key: "location",
      label: "Location",
      width: "w-36",
      sortable: true,
    },
    {
      key: "capacity",
      label: "Capacity (CKB)",
      width: "w-40",
      sortable: true,
      className: "text-purple font-bold",
      render: (value) => formatCompactNumber(value as number),
    },
    {
      key: "autoAccept",
      label: "Auto Accept (CKB)",
      width: "w-48",
      sortable: false,
      showInfo: true,
      infoTooltip: "The minimum CKB a peer must fund when opening a channel to this node",
      render: (value) => formatCompactNumber(value as number),
    },
    {
      key: "lastSeen",
      label: "Last seen on",
      width: "w-48",
      sortable: true,
    },
  ];
  const handleRefresh = () => {
    // 清除所有相关查询缓存，触发重新请求
    queryClient.invalidateQueries({ queryKey: ['nodes', currentNetwork] });
    queryClient.invalidateQueries({ queryKey: ['channels', currentNetwork] });
  };

  const handleSort = (key: string, state: SortState) => {
    setSortKey(key);
    setSortState(state);
    // 页码重置由 useEffect 处理
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    // 页码重置由 useEffect 处理
  };

  const handleLocationChange = (value: string) => {
    setLocationValue(value);
    // 页码重置由 useEffect 处理
  };



  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Global Nodes Distribution"
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
      />
      
      {/* Network Map */}
      <GlassCardContainer>
        {isLoading ? (
          <div className="flex items-center justify-center h-[600px]">
            <div className="text-muted-foreground">Loading nodes data...</div>
          </div>
        ) : (
          <NodeNetworkMap
            nodes={mapData}
            connections={connectionData}
            height="600px"
            title="Global Nodes Distribution"
          />
        )}
      </GlassCardContainer>

      <div className="flex justify-between items-center">
        <span className="type-h2">
          Active Nodes({isLoading ? '...' : filteredAndSortedNodes.length})
        </span>
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchValue}
            placeholder="Search nodes by ID or name"
            onChange={(value) => {
              setSearchValue(value);
              // 页码重置由 useEffect 处理
            }}
            onSearch={handleSearch}
          />
        </div>
      </div>

      <CustomSelect
        options={locationOptions}
        value={locationValue}
        onChange={handleLocationChange}
        placeholder="All Location"
        className="w-[145px]"
      />
      <GlassCardContainer>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading nodes list...</div>
          </div>
        ) : (
          <>
            <Table<NodeData>
              columns={columns}
              data={tableData}
              onSort={handleSort}
              defaultSortKey="capacity"
              defaultSortState="descending"
            />

            {filteredAndSortedNodes.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                className="mt-4"
              />
            )}

            {filteredAndSortedNodes.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">No nodes found</div>
                  <div className="text-sm">
                    {searchValue || locationValue
                      ? "Try adjusting your search or filter"
                      : "No nodes available"}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCardContainer>
    </div>
  );
};
