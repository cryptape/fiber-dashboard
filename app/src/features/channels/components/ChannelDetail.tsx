"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Image from "next/image";
import {
  DetailCard,
  KpiCard,
  SectionHeader,
  PageHeader,
  Timeline,
  TimelineEvent,
  TimelineContentRow,
  Dialog,
  InfoBox,
  TransactionOverview,
  CollapsibleSection,
} from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { formatCompactNumber, hexToDecimal } from "@/lib/utils";
import { formatTimestamp, parseLockArgsV2, parseWitnessV2 } from "../utils";

export default function ChannelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const channelOutpoint = params.channelOutpoint
    ? decodeURIComponent(params.channelOutpoint as string)
    : "";
  const { apiClient, currentNetwork } = useNetwork();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCommitmentDialogOpen, setIsCommitmentDialogOpen] = useState(false);
  const [selectedTxIndex, setSelectedTxIndex] = useState<number | null>(null);

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

  // 错误处理
  if (channelError || stateError) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Channel Details" />
        <div className="card-zed p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Channel Not Found</h2>
          <p className="text-secondary">
            The channel with ID {channelOutpoint} could not be found or is not
            accessible.
          </p>
          <p className="text-sm text-secondary mt-2">
            Error:{" "}
            {channelError?.message || stateError?.message || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  // 加载状态
  if (channelLoading || stateLoading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Channel Details" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // 没有数据
  if (!channelInfo || !channelState) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Channel Details" />
        <div className="card-zed p-8 text-center">
          <p className="text-secondary">No channel data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Channel Details" />
      {/* Channel 基本信息卡片 */}
      <DetailCard
        name="Channel"
        status={channelState.state}
        hash={channelInfo.channel_outpoint}
        showHashLabel={false}
        createdOn={formatTimestamp(channelInfo.created_timestamp)}
        lastCommitted={formatTimestamp(channelInfo.commit_timestamp)}
      />

      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <KpiCard
          label="CAPACITY"
          value={(() => {
            // 将容量从十六进制 Shannon 转换为 CKB
            const capacityInShannon = hexToDecimal(channelInfo.capacity);
            const capacityInCKB = Number(capacityInShannon) / 100_000_000;
            return formatCompactNumber(capacityInCKB);
          })()}
          unit="CKB"
        />
        <KpiCard
          label="TOTAL TRANSACTIONS"
          value={channelState.txs.length.toString()}
        />
      </div>

      {/* Nodes */}
      <div className="mt-3">
        <SectionHeader title="Channel Participants" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Node 1 */}
        {node1Info ? (
          <DetailCard
            name={node1Info.node_name || "Unknown Node"}
            status="Active"
            hash={node1Info.node_id}
            showHashLabel={false}
            location={
              node1Info.city && node1Info.country_or_region
                ? `${node1Info.city}, ${node1Info.country_or_region}`
                : node1Info.country_or_region || "Unknown"
            }
            lastSeen={formatTimestamp(node1Info.announce_timestamp)}
            topExtra={
              <div className="flex items-center justify-between">
                <div className="type-label text-secondary">NODE #1</div>
                <button
                  onClick={() =>
                    router.push(
                      `/node/${encodeURIComponent(node1Info.node_id)}`
                    )
                  }
                  className="type-button2 text-purple cursor-pointer hover:underline"
                >
                  View details
                </button>
              </div>
            }
          />
        ) : (
          <Skeleton className="h-48 w-full" />
        )}

        {/* Node 2 */}
        {node2Info ? (
          <DetailCard
            name={node2Info.node_name || "Unknown Node"}
            status="Active"
            hash={node2Info.node_id}
            showHashLabel={false}
            location={
              node2Info.city && node2Info.country_or_region
                ? `${node2Info.city}, ${node2Info.country_or_region}`
                : node2Info.country_or_region || "Unknown"
            }
            lastSeen={formatTimestamp(node2Info.announce_timestamp)}
            topExtra={
              <div className="flex items-center justify-between">
                <div className="type-label text-secondary">NODE #2</div>
                <button
                  onClick={() =>
                    router.push(
                      `/node/${encodeURIComponent(node2Info.node_id)}`
                    )
                  }
                  className="type-button2 text-purple cursor-pointer hover:underline"
                >
                  View details
                </button>
              </div>
            }
          />
        ) : (
          <Skeleton className="h-48 w-full" />
        )}
      </div>

      <div className="mt-3">
        <SectionHeader title="Channel Lifecycle" />
      </div>
      
      {/* Channel Lifecycle Timeline */}
      {channelState.state === "open" && channelState.txs.length > 0 && (
        <Timeline>
          {/* Channel Opened (Funding) */}
          <TimelineEvent
            status="success"
            isFirst={true}
            title="Channel Opened (Funding)"
            timestamp={formatTimestamp(channelState.txs[0].timestamp)}
            badges={[
              {
                text: `${channelState.txs.length} Confirmation${
                  channelState.txs.length > 1 ? "s" : ""
                }`,
                color: "success",
              },
            ]}
            footerLinks={[
              {
                text: "View details",
                onClick: () => setIsDialogOpen(true),
              },
              {
                text: "View on Explore",
                onClick: () => {
                  const explorerUrl =
                    currentNetwork === "mainnet"
                      ? `https://pudge.explorer.nervos.org/transaction/${channelState.txs[0].tx_hash}`
                      : `https://pudge.explorer.nervos.org/aggron/transaction/${channelState.txs[0].tx_hash}`;
                  window.open(explorerUrl, "_blank", "noopener,noreferrer");
                },
              },
            ]}
          >
            <TimelineContentRow
              label="Block #:"
              value={channelState.txs[0].block_number.toString()}
              showCopy={true}
            />
            <TimelineContentRow
              label="Tx hash:"
              value={channelState.txs[0].tx_hash}
              showCopy={true}
            />
          </TimelineEvent>

          {/* Channel Active */}
          <TimelineEvent
            status="info"
            isLast={true}
            title="Channel Active"
            subtitle="No on-chain commitment or settlement transactions detected."
          />
        </Timeline>
      )}

      {/* Commitment / Settled State Timeline */}
      {(channelState.state === "commitment" || channelState.state === "settled") && channelState.txs.length > 0 && (
        <Timeline>
          {/* Channel Opened (Funding) */}
          <TimelineEvent
            status="success"
            isFirst={true}
            title="Channel Opened (Funding)"
            timestamp={formatTimestamp(channelState.txs[0].timestamp)}
            // badges={[
            //   {
            //     text: `${channelState.txs.length} Confirmation${
            //       channelState.txs.length > 1 ? "s" : ""
            //     }`,
            //     color: "success",
            //   },
            // ]}
            footerLinks={[
              {
                text: "View details",
                onClick: () => setIsDialogOpen(true),
              },
              {
                text: "View on Explore",
                onClick: () => {
                  const explorerUrl =
                    currentNetwork === "mainnet"
                      ? `https://pudge.explorer.nervos.org/transaction/${channelState.txs[0].tx_hash}`
                      : `https://pudge.explorer.nervos.org/aggron/transaction/${channelState.txs[0].tx_hash}`;
                  window.open(explorerUrl, "_blank", "noopener,noreferrer");
                },
              },
            ]}
          >
            <TimelineContentRow
              label="Block #:"
              value={channelState.txs[0].block_number.toString()}
              showCopy={true}
            />
            <TimelineContentRow
              label="Tx hash:"
              value={channelState.txs[0].tx_hash}
              showCopy={true}
            />
          </TimelineEvent>

          {/* Commitment Updates */}
          {(() => {
            // For settled: exclude first and last tx
            // For commitment: exclude first tx only
            const commitmentTxs = channelState.state === "settled" && channelState.txs.length > 2
              ? channelState.txs.slice(1, -1)
              : channelState.state === "commitment" && channelState.txs.length > 1
              ? channelState.txs.slice(1)
              : [];
            
            return commitmentTxs.length > 0 ? (
              <TimelineEvent
                status="warning"
                isLast={channelState.state === "commitment"}
                title={`Commitment updates (${commitmentTxs.length} update${
                  commitmentTxs.length > 1 ? "s" : ""
                })`}
                subtitle="Preparing the channel state for final settlement and safe fund distribution"
                badges={[
                  {
                    text: "Watchtower protection detected",
                    color: "info",
                    icon: (
                      <Image
                        src="/protection.svg"
                        alt="Protection icon"
                        width={16}
                        height={16}
                      />
                    ),
                  },
                ]}
                titleIcon={
                  <Image
                    src="/expand.svg"
                    alt="Expand icon"
                    width={20}
                    height={20}
                  />
                }
                tableColumns={[
                  {
                    key: "tx_hash",
                    label: "Tx hash",
                    render: (value, row) => (
                      <div className="type-body text-primary">
                        {`${(row as { tx_hash: string }).tx_hash.slice(0, 10)}...${(row as { tx_hash: string }).tx_hash.slice(-8)}`}
                      </div>
                    ),
                  },
                  {
                    key: "commitment_args",
                    label: "Commitment args",
                    render: (value, row) => (
                      <div className="type-body text-primary">
                        {(row as { commitment_args: string | null }).commitment_args
                          ? `${(row as { commitment_args: string }).commitment_args.slice(0, 10)}...${(row as { commitment_args: string }).commitment_args.slice(-6)}`
                          : "-"}
                      </div>
                    ),
                  },
                  {
                    key: "block_number",
                    label: "Block",
                    render: (value, row) => (
                      <div className="type-body text-primary">
                        {(row as { block_number: string }).block_number}
                      </div>
                    ),
                  },
                  {
                    key: "witness_args",
                    label: "Unlock count",
                    render: (value, row) => {
                      try {
                        const witnessArgs = (row as { witness_args: string | null })
                          .witness_args;
                        if (witnessArgs) {
                          const parsed = parseWitnessV2(witnessArgs);
                          return (
                            <div className="type-body text-primary">
                              {String(parsed.unlock_count)}
                            </div>
                          );
                        }
                      } catch (e) {
                        console.error("Failed to parse witness_args", e);
                      }
                      return <div className="type-body text-primary">-</div>;
                    },
                  },
                  {
                    key: "pending_htlcs",
                    label: "Pending HTLCs",
                    render: (value, row) => {
                      try {
                        const witnessArgs = (row as { witness_args: string | null })
                          .witness_args;
                        if (witnessArgs) {
                          const parsed = parseWitnessV2(witnessArgs);
                          const unlockCount = Number(parsed.unlock_count);
                          if (unlockCount > 0 && parsed.settlement) {
                            const settlement = parsed.settlement as {
                              pending_htlc_count: number;
                            };
                            return (
                              <div className="type-body text-primary">
                                {String(settlement.pending_htlc_count)}
                              </div>
                            );
                          }
                        }
                      } catch (e) {
                        console.error("Failed to parse witness_args", e);
                      }
                      return <div className="type-body text-primary">-</div>;
                    },
                  },
                  {
                    key: "timestamp",
                    label: "Timestamp",
                    render: (value, row) => (
                      <div className="type-body text-primary">
                        {formatTimestamp(
                          (row as { timestamp: string }).timestamp
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "actions",
                    label: "",
                    render: (value, row) => (
                      <button
                        onClick={() => {
                          const txIndex = channelState.txs.findIndex(
                            (t) => t.tx_hash === (row as { tx_hash: string }).tx_hash
                          );
                          setSelectedTxIndex(txIndex);
                          setIsCommitmentDialogOpen(true);
                        }}
                        className="type-button2 text-purple hover:opacity-80"
                      >
                        View detail
                      </button>
                    ),
                  },
                ]}
                tableData={commitmentTxs}
              />
            ) : null;
          })()}

          {/* Channel Closed (Final Settlement) - Only for settled state */}
          {channelState.state === "settled" && (
            <TimelineEvent
              status="error"
              isLast={true}
              title="Channel Closed (Final Settlement)"
              timestamp={formatTimestamp(channelState.txs[channelState.txs.length - 1].timestamp)}
              badges={[
                {
                  text: "Force close",
                  color: "error",
                },
              ]}
              footerLinks={[
                {
                  text: "View details",
                  onClick: () => {
                    setSelectedTxIndex(channelState.txs.length - 1);
                    setIsCommitmentDialogOpen(true);
                  },
                },
                {
                  text: "View on Explore",
                  onClick: () => {
                    const lastTx = channelState.txs[channelState.txs.length - 1];
                    const explorerUrl =
                      currentNetwork === "mainnet"
                        ? `https://pudge.explorer.nervos.org/transaction/${lastTx.tx_hash}`
                        : `https://pudge.explorer.nervos.org/aggron/transaction/${lastTx.tx_hash}`;
                    window.open(explorerUrl, "_blank", "noopener,noreferrer");
                  },
                },
              ]}
            >
              <TimelineContentRow
                label="Block #:"
                value={channelState.txs[channelState.txs.length - 1].block_number.toString()}
                showCopy={true}
              />
              <TimelineContentRow
                label="Tx hash:"
                value={channelState.txs[channelState.txs.length - 1].tx_hash}
                showCopy={true}
              />
            </TimelineEvent>
          )}
        </Timeline>
      )}

      {/* Transaction Details Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Transaction Details"
        secondaryButtonText="View on Explorer"
        onSecondaryClick={() => {
          const explorerUrl =
            currentNetwork === "mainnet"
              ? `https://pudge.explorer.nervos.org/transaction/${channelState.txs[0].tx_hash}`
              : `https://pudge.explorer.nervos.org/aggron/transaction/${channelState.txs[0].tx_hash}`;
          window.open(explorerUrl, "_blank", "noopener,noreferrer");
        }}
        primaryButtonIcon={
          <Image
            src="/explorer.svg"
            alt="Explorer icon"
            width={16}
            height={16}
          />
        }
      >
        <InfoBox
          title="Summary"
          content="This transaction opens the payment channel and locks the initial on-chain capacity."
        />

        <TransactionOverview
          txHash={`${channelState.txs[0].tx_hash.slice(0, 10)}..${channelState.txs[0].tx_hash.slice(-6)}`}
          fullTxHash={channelState.txs[0].tx_hash}
          // confirmationText={`${channelState.txs.length} Confirmation${
          //   channelState.txs.length > 1 ? "s" : ""
          // }`}
          fields={[
            {
              label: "Transaction type",
              value: "Channel funding",
              badge: {
                text: "Channel funding",
                status: "open",
              },
            },
            {
              label: "Block height",
              value: channelState.txs[0].block_number.toString(),
              copyable: true,
            },
            {
              label: "Timestamp",
              value: formatTimestamp(channelState.txs[0].timestamp),
            },
          ]}
        />
      </Dialog>

      {/* Commitment Transaction Details Dialog */}
      {selectedTxIndex !== null && channelState.txs[selectedTxIndex] && (() => {
        const tx = channelState.txs[selectedTxIndex];
        let parsedArgs = null;
        let parsedWitness = null;
        
        try {
          if (tx.commitment_args) {
            parsedArgs = parseLockArgsV2(tx.commitment_args);
          }
          if (tx.witness_args) {
            parsedWitness = parseWitnessV2(tx.witness_args);
          }
        } catch (e) {
          console.error("Failed to parse transaction data", e);
        }

        return (
          <Dialog
            isOpen={isCommitmentDialogOpen}
            onClose={() => {
              setIsCommitmentDialogOpen(false);
              setSelectedTxIndex(null);
            }}
            title="Transaction Details"
            secondaryButtonText="View on Explorer"
            onSecondaryClick={() => {
              const explorerUrl =
                currentNetwork === "mainnet"
                  ? `https://pudge.explorer.nervos.org/transaction/${tx.tx_hash}`
                  : `https://pudge.explorer.nervos.org/aggron/transaction/${tx.tx_hash}`;
              window.open(explorerUrl, "_blank", "noopener,noreferrer");
            }}
            primaryButtonIcon={
              <Image
                src="/explorer.svg"
                alt="Explorer icon"
                width={16}
                height={16}
              />
            }
          >
            <InfoBox
              title="Summary"
              content={selectedTxIndex === channelState.txs.length - 1 && channelState.state === "settled"
                ? "Final settlement executed. Channel closed and final balances distributed on-chain."
                : "Further commitment updates may occur before final settlement."}
            />

            <TransactionOverview
              txHash={`${tx.tx_hash.slice(0, 10)}..${tx.tx_hash.slice(-6)}`}
              fullTxHash={tx.tx_hash}
              // confirmationText={`${channelState.txs.length} Confirmation${
              //   channelState.txs.length > 1 ? "s" : ""
              // }`}
              fields={[
                {
                  label: "Transaction type",
                  value: selectedTxIndex === channelState.txs.length - 1 && channelState.state === "settled"
                    ? "Final settlement"
                    : "Committing update",
                  badge: {
                    text: selectedTxIndex === channelState.txs.length - 1 && channelState.state === "settled"
                      ? "Final settlement"
                      : "Committing update",
                    status: selectedTxIndex === channelState.txs.length - 1 && channelState.state === "settled"
                      ? "error"
                      : "warning",
                  },
                },
                {
                  label: "Block height",
                  value: tx.block_number.toString(),
                  copyable: true,
                },
                {
                  label: "Commitment args",
                  value: tx.commitment_args || "-",
                  copyable: true,
                },
                {
                  label: "Timestamp",
                  value: formatTimestamp(tx.timestamp),
                },
              ]}
            />

            {(parsedArgs || parsedWitness) && (
              <TransactionOverview
                title="Channel state snapshot (Decoded from Witness data)"
                txHash={tx.witness_args ? `${tx.witness_args.slice(0, 10)}..${tx.witness_args.slice(-6)}` : ""}
                fullTxHash={tx.witness_args || ""}
                fields={[
                  ...(parsedWitness?.empty_witness_args
                    ? [
                        {
                          label: "Empty witness",
                          value: String(parsedWitness.empty_witness_args),
                          copyable: true,
                        },
                      ]
                    : []),
                  ...(parsedArgs
                    ? [
                        {
                          label: "Pubkey hash",
                          value: parsedArgs.pubkey_hash,
                          copyable: true,
                        },
                        {
                          label: "Security delay",
                          value: `Number: ${parsedArgs.delay_epoch.number}, Index: ${parsedArgs.delay_epoch.index}, Length: ${parsedArgs.delay_epoch.length}`,
                        },
                        {
                          label: "Protocol version",
                          value: parsedArgs.version,
                        },
                        {
                          label: "",
                          value: "",
                          isSeparator: true,
                        },
                        {
                          label: "Settlement hash",
                          value: parsedArgs.settlement_hash,
                          copyable: true,
                        },
                        {
                          label: "Settlement flag",
                          value:
                            parsedArgs.settlement_flag === 0
                              ? "0 (First settlement)"
                              : "1 (Subsequent commitment update)",
                        },
                      ]
                    : []),
                  ...(parsedWitness &&
                  Number(parsedWitness.unlock_count) > 0 &&
                  parsedWitness.settlement
                    ? [
                        {
                          label: "Settlement local pubkey hash",
                          value: (parsedWitness.settlement as any)
                            .settlement_local_pubkey_hash,
                          copyable: true,
                        },
                        {
                          label: "Settlement local amount",
                          value: String(
                            (parsedWitness.settlement as any)
                              .settlement_local_amount
                          ),
                        },
                        {
                          label: "Settlement remote pubkey hash",
                          value: (parsedWitness.settlement as any)
                            .settlement_remote_pubkey_hash,
                          copyable: true,
                        },
                        {
                          label: "Settlement remote amount",
                          value: String(
                            (parsedWitness.settlement as any)
                              .settlement_remote_amount
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            )}

            {parsedWitness && Number(parsedWitness.unlock_count) > 0 && parsedWitness.settlement ? (
              <>
              <CollapsibleSection
                title={`Unlocks (${(parsedWitness.settlement as any).unlocks?.length || 0})`}
                badge={{
                  text: "Settlement unlock",
                  status: "Active",
                }}
                tableColumns={[
                  {
                    key: "type",
                    label: "Type",
                    width: "w-48",
                    showInfo: true,
                    infoTooltip: "Unlock type information",
                  },
                  {
                    key: "withPreimage",
                    label: "With Preimage",
                    width: "w-40",
                    showInfo: true,
                    infoTooltip: "Indicates if preimage is provided",
                  },
                  {
                    key: "preimage",
                    label: "Preimage",
                    width: "w-32",
                  },
                  {
                    key: "signature",
                    label: "Signature",
                    width: "flex-1",
                  },
                ]}
                tableData={
                  (parsedWitness.settlement as any).unlocks?.map(
                    (unlock: any) => ({
                      type: `${unlock.unlock_type} (${unlock.unlock_type === 255 ? "Unlocks an HTLC" : "Other"})`,
                      withPreimage: `${unlock.with_preimage} (${unlock.with_preimage === 0 ? "No" : "Yes"})`,
                      preimage:
                        unlock.with_preimage === 1 && unlock.preimage !== "N/A"
                          ? `${unlock.preimage.slice(0, 10)}...${unlock.preimage.slice(-6)}`
                          : "-",
                      signature: `${unlock.signature.slice(0, 10)}...${unlock.signature.slice(-6)}`,
                    })
                  ) || []
                }
                defaultExpanded={false}
              />
              </>
            ) : null}

            {parsedWitness &&
              Number(parsedWitness.unlock_count) > 0 &&
              parsedWitness.settlement &&
              (parsedWitness.settlement as any).htlcs?.length > 0 ? (
                <>
                <CollapsibleSection
                  title={`Pending HTLCs (${(parsedWitness.settlement as any).htlcs.length})`}
                  // titleRight={`Nearest expiry: ${formatTimestamp(
                  //   String(
                  //     (parsedWitness.settlement as any).htlcs[0]
                  //       .htlc_expiry_timestamp
                  //   )
                  // )}`}
                  tableColumns={[
                    {
                      key: "type",
                      label: "Type",
                      width: "w-20",
                      showInfo: true,
                      infoTooltip: "HTLC type information",
                    },
                    {
                      key: "amount",
                      label: "Amount",
                      width: "w-32",
                    },
                    {
                      key: "paymentHash",
                      label: "Payment hash",
                      width: "w-40",
                    },
                    {
                      key: "localPubkeyHash",
                      label: "Local pubkey hash",
                      width: "w-40",
                    },
                    {
                      key: "remotePubkeyHash",
                      label: "Remote pubkey hash",
                      width: "w-40",
                    },
                    {
                      key: "expiresOn",
                      label: "Expires on",
                      width: "flex-1",
                    },
                  ]}
                  tableData={(parsedWitness.settlement as any).htlcs.map(
                    (htlc: any) => ({
                      type: htlc.htlc_type.toString(),
                      amount: String(htlc.payment_amount),
                      paymentHash: `${htlc.payment_hash.slice(0, 10)}...${htlc.payment_hash.slice(-6)}`,
                      localPubkeyHash: `${htlc.local_htlc_pubkey_hash.slice(0, 10)}...${htlc.local_htlc_pubkey_hash.slice(-6)}`,
                      remotePubkeyHash: `${htlc.remote_htlc_pubkey_hash.slice(0, 10)}...${htlc.remote_htlc_pubkey_hash.slice(-6)}`,
                      expiresOn: formatTimestamp(
                        String(htlc.htlc_expiry_timestamp)
                      ),
                    })
                  )}
                  defaultExpanded={false}
                />
                </>
              ) : null}

            {channelState.state === "settled" &&
              selectedTxIndex === channelState.txs.length - 1 &&
              parsedWitness &&
              Number(parsedWitness.unlock_count) > 0 &&
              parsedWitness.settlement &&
              ((parsedWitness.settlement as any).htlcs?.length === 0 ||
                !(parsedWitness.settlement as any).htlcs) ? (
                <>
                <CollapsibleSection
                  title="All HTLCs resolved before settlement"
                  disableCollapse={true}
                />
                </>
              ) : null}
          </Dialog>
        );
      })()}
      
    </div>
  );
}
