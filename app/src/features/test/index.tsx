import {
  Timeline,
  TimelineEvent,
  TimelineContentRow,
  Dialog,
  InfoBox,
  TransactionOverview,
  CollapsibleSection,
} from "@/shared/components/ui";
import type { ColumnDef } from "@/shared/components/ui/Table";
import Image from "next/image";
import { useState } from "react";

interface CommitmentUpdate extends Record<string, unknown> {
  txHash: string;
  commitmentArgs: string;
  block: string;
  unlockCount: number;
  pendingHTLCs: number;
  timestamp: string;
}

export const Test = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock 表格数据
  const commitmentUpdates: CommitmentUpdate[] = [
    {
      txHash: "0x1a2b3c4d5e...8f9g0h1i2j3k",
      commitmentArgs: "0x4f5e6d7...0j8k9l0m",
      block: "18661918",
      unlockCount: 1,
      pendingHTLCs: 12,
      timestamp: "Oct 30, 2025 08:15:59",
    },
    {
      txHash: "0x2b3c4d5e6f...9g0h1i2j3k4l",
      commitmentArgs: "0x2b3c4d5...0k1j0i9h",
      block: "18661919",
      unlockCount: 1,
      pendingHTLCs: 11,
      timestamp: "Oct 30, 2025 08:15:59",
    },
    {
      txHash: "0x3c4d5e6f7g...0h1i2j3k4l5m",
      commitmentArgs: "0x5d6e7f8...0j2k3l4m",
      block: "18661920",
      unlockCount: 1,
      pendingHTLCs: 10,
      timestamp: "Oct 30, 2025 09:00:00",
    },
    {
      txHash: "0x4d5e6f7g8h...1i2j3k4l5m6n",
      commitmentArgs: "0x7e8f9a0...0m1n2o3p",
      block: "18661921",
      unlockCount: 1,
      pendingHTLCs: 9,
      timestamp: "Oct 30, 2025 11:05:27",
    },
  ];

  // 表格列定义
  const columns: ColumnDef<CommitmentUpdate>[] = [
    {
      key: "txHash",
      label: "Tx hash",
      width: "flex-1",
      render: value => (
        <div className="flex items-center gap-1">
          <span className="text-primary text-sm truncate">
            {value as string}
          </span>
          {/* <CopyButton text={value as string} ariaLabel="复制 Tx hash" /> */}
        </div>
      ),
    },
    {
      key: "commitmentArgs",
      label: "Commitment args",
      width: "w-40",
      showInfo: true,
      infoTooltip: "Commitment transaction arguments",
      render: value => (
        <div className="flex items-center gap-1">
          <span className="text-primary text-sm truncate">
            {value as string}
          </span>
          {/* <CopyButton text={value as string} ariaLabel="复制 Commitment args" /> */}
        </div>
      ),
    },
    {
      key: "block",
      label: "Block",
      width: "w-28",
    },
    {
      key: "unlockCount",
      label: "Unlock count",
      width: "w-28",
      showInfo: true,
      infoTooltip: "Number of unlocks in this commitment",
    },
    {
      key: "pendingHTLCs",
      label: "Pending HTLCs",
      width: "w-32",
      showInfo: true,
      infoTooltip: "Number of pending Hash Time Locked Contracts",
    },
    {
      key: "timestamp",
      label: "Timestamp",
      width: "w-44",
      sortable: true,
    },
    {
      key: "action",
      label: "",
      width: "w-28",
      render: () => (
        <button
          className="text-purple text-sm hover:text-primary transition-colors"
          onClick={e => {
            e.stopPropagation();
            console.log("View detail clicked");
          }}
        >
          View detail
        </button>
      ),
    },
  ];

  return (
    <div className="container py-8">
      <h1 className="type-h1 text-primary mb-8">Timeline 组件示例</h1>

      <Timeline>
        {/* 第一个事件：Channel Opened */}
        <TimelineEvent
          status="success"
          isFirst
          title="Channel Opened (Funding)"
          badges={[]}
          timestamp="Sep 29, 2025, 03:06:30"
          footerLinks={[
            {
              text: "View details",
              onClick: () => setIsDialogOpen(true),
            },
            {
              text: "View on Explore",
              onClick: () => console.log("View on Explore clicked"),
            },
          ]}
        >
          <TimelineContentRow label="Block #:" value="18661917" />
          <TimelineContentRow
            label="Tx hash:"
            value="0x0b32379ac032cce5727cf45980357bf824056d5bf03e021c8c8ff3190557ed2e"
          />
        </TimelineEvent>

        {/* 第二个事件：Commitment updates */}
        <TimelineEvent<CommitmentUpdate>
          status="warning"
          title="Commitment updates (12 updates)"
          badges={[
            {
              text: "Watchtower protection detected",
              color: "info",
              icon: (
                <Image
                  src="/protection.svg"
                  alt="Protection"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
              ),
            },
          ]}
          titleIcon={
            <Image
              src="/expand.svg"
              alt="Expand"
              width={16}
              height={16}
              className="w-4 h-4"
            />
          }
          subtitle="Preparing the channel state for final settlement and safe fund distribution"
          tableColumns={columns}
          tableData={commitmentUpdates}
          defaultExpanded={false}
        />

        {/* 第三个事件：Channel Closed */}
        <TimelineEvent
          status="error"
          isLast
          title="Channel Closed (Final Settlement)"
          badges={[{ text: "Force close", color: "error" }]}
          timestamp="Oct 30, 2025, 15:03:43"
          footerLinks={[
            {
              text: "View details",
              onClick: () => console.log("View details clicked"),
            },
            {
              text: "View on Explore",
              onClick: () => console.log("View on Explore clicked"),
            },
          ]}
        >
          <TimelineContentRow label="Block #:" value="18661917" />
          <TimelineContentRow
            label="Tx hash:"
            value="0x0b32379ac032cce5727cf45980357bf824056d5bf03e021c8c8ff3190557ed2e"
          />
        </TimelineEvent>
      </Timeline>

      {/* 弹框组件 */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Transaction Details"
        primaryButtonText="Done"
        secondaryButtonText="View on Explorer"
        onPrimaryClick={() => setIsDialogOpen(false)}
        onSecondaryClick={() => console.log("View on Explorer")}
      >
        {/* 提示信息 */}
        <InfoBox
          title="Summary"
          content="This transaction opens the payment channel and locks the initial on-chain capacity."
        />

        {/* 交易详情 */}
        <TransactionOverview
          txHash="0x7e29f...8d383"
          fullTxHash="0x7e29f8d383"
          confirmationText="111 Confirmations"
          fields={[
            {
              label: 'Transaction type',
              value: '',
              badge: {
                text: 'Channel funding',
                status: 'Active',
              },
            },
            {
              label: 'Block height',
              value: '18661917',
              copyable: true,
            },
            {
              label: 'Tx fee',
              value: '0.00001372 CKB',
              copyable: false,
            },
            {
              label: 'Timestamp',
              value: 'Oct 30, 2025, 03:06:30',
              copyable: false,
            },
          ]}
        />

        {/* Channel state snapshot */}
        <TransactionOverview
          title="Channel state snapshot (Decoded from Witness data)"
          txHash="0x10000...650a6"
          fullTxHash="0x10000650a6"
          fields={[
            {
              label: 'Empty witness',
              value: '0x100000001000000010000000100000000',
              copyable: true,
            },
            {
              label: 'Pubkey hash',
              value: '0x90a55...b09cc',
              copyable: true,
            },
            {
              label: 'Security delay',
              value: '1 epoch (~4 hrs)',
              copyable: false,
            },
            {
              label: 'Protocol version',
              value: '37510',
              copyable: false,
            },
            // 分割线
            {
              label: '',
              value: '',
              isSeparator: true,
            },
            {
              label: 'Settlement hash',
              value: '0x7fdb9...d9aaf',
              copyable: true,
            },
            {
              label: 'Settlement flag',
              value: '1 (Subsequent commitment update)',
              copyable: false,
            },
            {
              label: 'Settlement local pubkey hash',
              value: '0xd3948...47e63',
              copyable: true,
            },
            {
              label: 'Settlement local amount',
              value: '91799329384',
              copyable: false,
            },
            {
              label: 'Settlement remote pubkey hash',
              value: '0xd3948...47e63',
              copyable: true,
            },
            {
              label: 'Settlement remote amount',
              value: '0',
              copyable: false,
            },
          ]}
        />

        {/* Unlocks */}
        <CollapsibleSection
          title="Unlocks (1)"
          badge={{
            text: 'Settlement unlock',
            status: 'Active',
          }}
          tableColumns={[
            {
              key: 'type',
              label: 'Type',
              width: 'w-48',
              showInfo: true,
              infoTooltip: 'Unlock type information',
            },
            {
              key: 'withPreimage',
              label: 'With Preimage',
              width: 'w-40',
              showInfo: true,
              infoTooltip: 'Indicates if preimage is provided',
            },
            {
              key: 'preimage',
              label: 'Preimage',
              width: 'w-32',
              showInfo: true,
              infoTooltip: 'Preimage value',
            },
            {
              key: 'signature',
              label: 'Signature',
              width: 'flex-1',
            },
          ]}
          tableData={[
            {
              type: '255 (Unlocks an HTLC)',
              withPreimage: '0 (No)',
              preimage: '-',
              signature: '0xea6db...be101',
            },
          ]}
          defaultExpanded={false}
        />

        {/* Pending HTLCs */}
        <CollapsibleSection
          title="Pending HTLCs (11)"
          titleRight="Nearest expiry: Oct 30, 12:04:12"
          tableColumns={[
            {
              key: 'type',
              label: 'Type',
              width: 'w-20',
              showInfo: true,
              infoTooltip: 'HTLC type information',
            },
            {
              key: 'amount',
              label: 'Amount',
              width: 'w-32',
            },
            {
              key: 'paymentHash',
              label: 'Payment hash',
              width: 'w-40',
            },
            {
              key: 'localPubkeyHash',
              label: 'Local pubkey hash',
              width: 'w-40',
            },
            {
              key: 'remotePubkeyHash',
              label: 'Remote pubkey hash',
              width: 'w-40',
            },
            {
              key: 'expiresOn',
              label: 'Expires on',
              width: 'flex-1',
            },
          ]}
          tableData={[
            {
              type: '0',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '0',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '0',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '0',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '0',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '0',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '1',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '1',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '1',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '1',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
            {
              type: '1',
              amount: '2005',
              paymentHash: '0x10474...8f98a',
              localPubkeyHash: '0x10474...8f98a',
              remotePubkeyHash: '0x10474...8f98a',
              expiresOn: 'Dec, 9, 2025, 09:46:27',
            },
          ]}
          defaultExpanded={false}
        />
        <CollapsibleSection
  title="All HTLCs resolved before settlement"
  disableCollapse={true}
/>

      </Dialog>
    </div>
  );
};
