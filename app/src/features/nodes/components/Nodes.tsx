"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { RustNodeInfo } from "@/lib/types";
import { formatCompactNumber } from "@/lib/utils";
import {
  SectionHeader,
  Table,
  Pagination,
  ColumnDef,
  SortState,
  GlassCardContainer,
  SearchInput,
} from "@/shared/components/ui";
import NodeNetworkMap, { NodeMapData, NodeConnectionData } from "@/shared/components/chart/NodeNetworkMap";

// 节点数据类型
interface NodeData extends Record<string, unknown> {
  nodeId: string;
  nodeName: string;
  channels: number;
  region: string; // 对应服务端的 country_or_region
  capacity: number;
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
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(''); // 防抖后的搜索值
  const [sortKey, setSortKey] = useState<string>('last_seen'); // 排序字段，使用服务端支持的字段
  const [sortState, setSortState] = useState<SortState>('descending'); // 排序方向

  // 计算服务端分页参数（从 1 开始的前端页码转换为从 0 开始的后端页码）
  const backendPage = currentPage - 1;
  
  // 映射前端 sortKey 到服务端 sort_by 参数
  const getSortBy = (key: string): string | undefined => {
    switch (key) {
      case 'region':
        return 'region';
      case 'last_seen':
        return 'last_seen';
      default:
        return 'last_seen';
    }
  };
  
  // 映射 sortState 到服务端 order 参数
  const getOrder = (state: SortState): string => {
    return state === 'ascending' ? 'asc' : 'desc';
  };

  // 使用分页接口获取节点数据（每次只请求当前页）
  const { data: nodesResponse, isLoading: nodesLoading, dataUpdatedAt: nodesUpdatedAt } = useQuery({
    queryKey: ['nodes', currentNetwork, backendPage, sortKey, sortState, debouncedSearchValue],
    queryFn: async () => {
      const sortBy = getSortBy(sortKey);
      const order = getOrder(sortState);
      
      // 如果有搜索关键词，使用搜索接口
      if (debouncedSearchValue.trim()) {
        return apiClient.searchNodesByName(debouncedSearchValue.trim(), backendPage, sortBy, order);
      }
      
      // 否则使用普通列表接口
      return apiClient.getActiveNodesByPage(backendPage, sortBy, order);
    },
    refetchInterval: 300000, // 5分钟轮询
  });

  const nodes = nodesResponse?.nodes || [];
  const nextPage = nodesResponse?.next_page ?? 0;
  const isLoading = nodesLoading;

  // 计算最后更新时间
  const lastUpdated = useMemo(() => {
    const latestUpdateTime = nodesUpdatedAt;
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
  }, [nodesUpdatedAt]);

  // 搜索防抖：用户输入完 500ms 后才触发搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // 当排序或搜索条件改变时，自动重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [sortKey, sortState, debouncedSearchValue]);

  // 处理节点数据，添加展示字段
  const processedNodes = useMemo((): NodeWithStats[] => {
    return nodes.map(node => {
      const location = node.city && node.country_or_region 
        ? `${node.city}, ${node.country_or_region}` 
        : node.country_or_region || "Unknown";

      const announceDate = new Date(node.announce_timestamp);
      const formattedDate = announceDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return {
        ...node,
        totalChannels: node.channel_count ?? 0,
        totalCapacity: 0,
        formattedLocation: location,
        formattedLastSeen: formattedDate,
      };
    });
  }, [nodes]);

  // 获取所有唯一的国家/地区选项（暂时禁用，因为需要所有数据）
  // const locationOptions: SelectOption[] = [];

  // 直接使用服务端返回的数据（已经按服务端排序）
  const tableData: NodeData[] = useMemo(() => {
    return processedNodes.map(node => ({
      nodeId: node.node_id,
      nodeName: node.node_name,
      channels: node.totalChannels,
      region: node.formattedLocation,
      capacity: node.totalCapacity,
      autoAccept: node.auto_accept_min_ckb_funding_amount / 100000000,
      lastSeen: node.formattedLastSeen,
    }));
  }, [processedNodes]);

  // 计算总页数（根据 next_page 判断是否有下一页）
  const hasNextPage = nextPage > backendPage;
  const totalPages = hasNextPage ? currentPage + 1 : currentPage;

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
          country: node.country_or_region || "Unknown",
          latitude: lat || 0,
          longitude: lng || 0,
          capacity: 0, // capacity 已移除，保留字段但设为 0
        };
      })
      .filter(node => node.latitude !== 0 && node.longitude !== 0);
  }, [processedNodes]);

  // 连接数据（不再使用 channels，返回空数组）
  const connectionData: NodeConnectionData[] = useMemo(() => {
    return [];
  }, []);
  console.log(mapData, connectionData,'===')

  // 列定义（只有服务端支持的字段才标记 sortable）
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
      sortable: false, // 服务端未提供按 channel_count 排序
    },
    {
      key: "region",
      label: "Location",
      width: "w-36",
      sortable: true, // 对应服务端 sort_by=region (country_or_region)
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
      key: "last_seen",
      label: "Last seen on",
      width: "w-48",
      sortable: true, // 对应服务端 sort_by=last_seen
    },
  ];
  const handleRefresh = () => {
    // 清除相关查询缓存，触发重新请求
    queryClient.invalidateQueries({ queryKey: ['nodes', currentNetwork] });
  };

  const handleSort = (key: string, state: SortState) => {
    setSortKey(key);
    setSortState(state);
    setCurrentPage(1); // 排序时重置到第一页
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    // 不需要重置页码，由 useEffect 在 debouncedSearchValue 变化时处理
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
          Active Nodes
        </span>
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchValue}
            placeholder="Search nodes by ID or name"
            onChange={(value) => {
              setSearchValue(value);
            }}
            onSearch={handleSearch}
          />
        </div>
      </div>

      {/* <CustomSelect
        options={locationOptions}
        value={locationValue}
        onChange={handleLocationChange}
        placeholder="All Location"
        className="w-[145px]"
      /> */}
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
              defaultSortKey="last_seen"
              defaultSortState="descending"
            />

            {tableData.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                className="mt-4"
              />
            )}

            {tableData.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">No nodes found</div>
                  <div className="text-sm">No nodes available</div>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCardContainer>
    </div>
  );
};
