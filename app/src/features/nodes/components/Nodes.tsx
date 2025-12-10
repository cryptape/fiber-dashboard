"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  CustomSelect,
  SelectOption,
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
  const searchParams = useSearchParams();
  
  // 检查是否为 Mock 模式
  const isMockMode = searchParams.get('test') === '1';
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState(''); // 防抖后的搜索值
  const [sortKey, setSortKey] = useState<string>(''); // 排序字段，默认为空表示不排序
  const [sortState, setSortState] = useState<SortState>('none'); // 排序方向，默认为 none
  const [selectedRegion, setSelectedRegion] = useState<string>(''); // 选中的 region

  // 获取所有 region 选项
  const { data: regionsData } = useQuery({
    queryKey: ['regions', currentNetwork],
    queryFn: async () => {
      return apiClient.getAllRegions();
    },
    staleTime: 600000, // 10分钟缓存
  });

  // 计算服务端分页参数（从 1 开始的前端页码转换为从 0 开始的后端页码）
  const backendPage = currentPage - 1;
  
  // 映射前端 sortKey 到服务端 sort_by 参数
  const getSortBy = (key: string): string | undefined => {
    if (!key) return undefined; // 如果没有排序字段，返回 undefined
    
    switch (key) {
      case 'channels':
        return 'channel_count';
      case 'region':
        return 'region';
      case 'lastSeen':
        return 'last_seen';
      default:
        return undefined;
    }
  };
  
  // 映射 sortState 到服务端 order 参数
  const getOrder = (state: SortState): string | undefined => {
    if (state === 'none') return undefined; // 如果没有排序，返回 undefined
    return state === 'ascending' ? 'asc' : 'desc';
  };

  // 使用分页接口获取节点数据（每次只请求当前页）
  const { data: nodesResponse, isLoading: nodesLoading, dataUpdatedAt: nodesUpdatedAt } = useQuery({
    queryKey: ['nodes', currentNetwork, backendPage, sortKey, sortState, debouncedSearchValue, selectedRegion],
    queryFn: async () => {
      const sortBy = getSortBy(sortKey);
      const order = getOrder(sortState);
      
      // 如果有选中的 region，使用 region 筛选接口
      if (selectedRegion) {
        return apiClient.getNodesByRegion(selectedRegion, backendPage, sortBy, order);
      }
      
      // 如果有搜索关键词，使用搜索接口
      if (debouncedSearchValue.trim()) {
        return apiClient.searchNodesByName(debouncedSearchValue.trim(), backendPage, sortBy, order);
      }
      
      // 否则使用普通列表接口
      return apiClient.getActiveNodesByPage(backendPage, sortBy, order);
    },
    refetchInterval: 300000, // 5分钟轮询
  });

  // 为地图视图获取全量节点和通道数据
  const { data: allNodesData, isLoading: allNodesLoading } = useQuery({
    queryKey: ['allNodesForMap', currentNetwork],
    queryFn: async () => {
      const startTime = performance.now();
      console.log('[MapData时间统计] 开始获取全量节点和通道数据');
      
      const [nodes, channels] = await Promise.all([
        apiClient.fetchAllActiveNodes(),
        apiClient.fetchAllActiveChannels(),
      ]);
      
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`[MapData时间统计] 数据获取完成，耗时: ${duration}s`);
      console.log(`[MapData时间统计] 节点数量: ${nodes.length}, 通道数量: ${channels.length}`);
      
      return { nodes, channels };
    },
    staleTime: 300000, // 5分钟缓存
    refetchInterval: 300000, // 5分钟轮询
  });

  const nodes = nodesResponse?.nodes || [];
  const totalCount = nodesResponse?.total_count ?? 0;
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

  // 当排序、搜索或 region 条件改变时，自动重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [sortKey, sortState, debouncedSearchValue, selectedRegion]);

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

  // 获取所有唯一的国家/地区选项
  const locationOptions: SelectOption[] = useMemo(() => {
    if (!regionsData) return [];
    
    return [
      { label: 'All Locations', value: '' },
      ...regionsData.map(region => ({
        label: region,
        value: region,
      })),
    ];
  }, [regionsData]);

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

  // 计算总页数（使用 total_count 和 page_size）
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 转换为地图数据格式 - 使用全量节点数据
  const mapData: NodeMapData[] = useMemo(() => {
    const startTime = performance.now();
    console.log('[MapData时间统计] 开始计算mapData');
    
    if (!allNodesData?.nodes) {
      console.log('[MapData时间统计] 无数据，返回空数组');
      return [];
    }

    const total = allNodesData.nodes.length;
    const nodesWithLoc = allNodesData.nodes.filter(node => node.loc);
    console.log('[MapData] 无loc过滤数量:', total - nodesWithLoc.length, '总数:', total);

    const mapped = nodesWithLoc.map(node => {
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
    });

    const nodesWithCoords = mapped.filter(node => node.latitude !== 0 && node.longitude !== 0);
    console.log('[MapData] 经纬度为0过滤数量:', mapped.length - nodesWithCoords.length, '映射后数:', mapped.length);

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`[MapData时间统计] mapData计算完成，耗时: ${duration}s, 最终节点数: ${nodesWithCoords.length}`);

    return nodesWithCoords;
  }, [allNodesData]);

  // 连接数据 - 使用全量通道数据构建连接关系
  const connectionData: NodeConnectionData[] = useMemo(() => {
    if (!allNodesData?.channels || !allNodesData?.nodes) return [];

    const totalChannels = allNodesData.channels.length;
    // 创建节点ID集合，用于快速查找
    const nodeIdSet = new Set(allNodesData.nodes.map(node => node.node_id));

    const filteredChannels = allNodesData.channels.filter(channel => {
      // 确保两个节点都存在
      return nodeIdSet.has(channel.node1) && nodeIdSet.has(channel.node2);
    });

    console.log('[ConnectionData] 缺失节点过滤数量:', totalChannels - filteredChannels.length, '总通道数:', totalChannels);

    return filteredChannels.map(channel => ({
      fromNodeId: channel.node1,
      toNodeId: channel.node2,
      channelOutpoint: channel.channel_outpoint,
    }));
  }, [allNodesData]);
  console.log(mapData, connectionData,'===')

  // 列定义（只有服务端支持的字段才标记 sortable）
  const columns: ColumnDef<NodeData>[] = [
    {
      key: 'nodeId',
      label: 'Node ID',
      width: 'w-32 lg:flex-1 lg:min-w-32',
      sortable: false,
      render: (value) => {
        // const shortId = (value as string).slice(0, 8) + '...' + (value as string).slice(-4);
        return (
          <span
            className="text-primary font-mono text-xs truncate block"
            title={value as string}
          >
            {/* {shortId} */}
            {value as string}
          </span>
        );
      },
    },
    {
      key: "nodeName",
      label: "Node name",
      width: "w-48 md:w-60",
      sortable: false,
      render: (value) => (
        <div className="truncate text-primary text-sm min-w-0" title={String(value)}>
          {value as string}
        </div>
      ),
    },
    {
      key: "channels",
      label: "Channels",
      width: "w-32",
      sortable: true, // 服务端已支持按 channel_count 排序
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
      key: "lastSeen",
      label: "Last seen on",
      width: "w-48",
      sortable: true, // 对应服务端 sort_by=last_seen_hour
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

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
  };



  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Global Nodes Distribution"
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
      />
      
      {/* Network Map */}
      <GlassCardContainer className="overflow-hidden">
        {allNodesLoading ? (
          <div className="flex items-center justify-center h-[400px] md:h-[600px]">
            <div className="text-muted-foreground">Loading nodes data...</div>
          </div>
        ) : (
          <NodeNetworkMap
            nodes={mapData}
            connections={connectionData}
            height="600px"
            mobileHeight="400px"
            title="Global Nodes Distribution"
            mock={isMockMode}
          />
        )}
      </GlassCardContainer>

      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <span className="type-h2">
          Active Nodes
        </span>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <SearchInput
            value={searchValue}
            placeholder="Search nodes by ID or name"
            onChange={(value) => {
              setSearchValue(value);
            }}
            onSearch={handleSearch}
            className="w-full sm:w-80"
          />
          <CustomSelect
            options={locationOptions}
            value={selectedRegion}
            onChange={handleRegionChange}
            placeholder="All Locations"
            className="w-full sm:w-[180px]"
          />
        </div>
      </div>


      <GlassCardContainer className="overflow-x-auto relative min-h-[528px]">
        <Table<NodeData>
          columns={columns}
          data={tableData}
          onSort={handleSort}
          className="min-h-[528px]"
          loading={isLoading}
          loadingText="Loading nodes list..."
          onRowClick={(row) => router.push(`/node/${row.nodeId}`)}
        />

        {!isLoading && tableData.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="mt-4"
          />
        )}

        {!isLoading && tableData.length === 0 && (
          <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">No nodes found</div>
              <div className="text-sm">No nodes available</div>
            </div>
          </div>
        )}
      </GlassCardContainer>
    </div>
  );
};
