'use client';

import { useState } from 'react';
import { Table, ColumnDef, SortState } from './Table';
import { Pagination } from './Pagination';

// 示例数据类型
interface NodeData extends Record<string, unknown> {
  nodeId: string;
  nodeName: string;
  channels: number;
  location: string;
  capacity: string;
  autoAccept: string;
  lastSeen: string;
}

// 示例数据
const sampleData: NodeData[] = [
  {
    nodeId: '0x026ba...b1ce',
    nodeName: 'fiber-test-OSA-node-1-2',
    channels: 93,
    location: 'Osaka, JP',
    capacity: '5.8 M',
    autoAccept: '438.0',
    lastSeen: 'Oct 30, 2025',
  },
  {
    nodeId: '0x026ba...b1ce',
    nodeName: 'fiber-test-OSA-node-1-2',
    channels: 91,
    location: 'Osaka, JP',
    capacity: '5.8 M',
    autoAccept: '438.0',
    lastSeen: 'Oct 30, 2025',
  },
  {
    nodeId: '0x026ba...b1ce',
    nodeName: 'fiber-test-OSA-node-1-2',
    channels: 87,
    location: 'Osaka, JP',
    capacity: '5.8 M',
    autoAccept: '438.0',
    lastSeen: 'Oct 30, 2025',
  },
];

// 列定义
const columns: ColumnDef<NodeData>[] = [
  {
    key: 'nodeId',
    label: 'Node ID',
    width: 'w-36',
    sortable: false,
  },
  {
    key: 'nodeName',
    label: 'Node name',
    width: 'flex-1',
    sortable: false,
  },
  {
    key: 'channels',
    label: 'Channels',
    width: 'w-32',
    sortable: true,
  },
  {
    key: 'location',
    label: 'Location',
    width: 'w-36',
    sortable: true,
  },
  {
    key: 'capacity',
    label: 'Capacity (CKB)',
    width: 'w-40',
    sortable: true,
    className: 'text-purple font-bold', // 使用紫色和粗体
  },
  {
    key: 'autoAccept',
    label: 'Auto Accept (CKB)',
    width: 'w-48',
    sortable: false,
    showInfo: true, // 显示 info 图标
  },
  {
    key: 'lastSeen',
    label: 'Last seen on',
    width: 'w-48',
    sortable: true,
  },
];

export const TableExample = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const totalPages = 10;

  const handleSort = (key: string, state: SortState) => {
    console.log('Sort:', key, state);
    // 在这里处理排序逻辑
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    console.log('Page changed to:', page);
    // 模拟加载
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="space-y-4">
      <Table<NodeData>
        columns={columns}
        data={sampleData}
        onSort={handleSort}
        defaultSortKey="channels"
        defaultSortState="descending"
        loading={isLoading}
        loadingText="Loading example data..."
      />
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
