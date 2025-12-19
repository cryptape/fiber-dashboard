"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DetailCard,
  KpiCard,
  SectionHeader,
  PageHeader,
} from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useNetwork } from "@/features/networks/context/NetworkContext";
import { formatCompactNumber, hexToDecimal } from "@/lib/utils";
import {
  formatTimestamp,
  parseLockArgsV2,
  parseWitnessV2,
} from "../utils";

export default function ChannelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const channelOutpoint = params.channelOutpoint
    ? decodeURIComponent(params.channelOutpoint as string)
    : "";
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

      {/* Channel Transactions */}
      <div className="mt-3">
        <SectionHeader
          title={`Channel Transactions (${channelState.txs.length})`}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {channelState.txs.length > 0 ? (
          channelState.txs.map((tx, index) => {
            // 解析 commitment_args 和 witness_args
            let parsedArgs = null;
            let parsedWitness = null;
            const extraFields: Array<{ key: string; label: string; value: string; copyable?: boolean; isSubField?: boolean; isTitleOnly?: boolean; tooltip?: string }> = [];
            
            try {
              if (tx.commitment_args) {
                parsedArgs = parseLockArgsV2(tx.commitment_args);
                console.log(`Transaction #${index + 1} - Parsed commitment_args:`, parsedArgs);
                
                // 构建 commitment_args extraFields
                extraFields.push(
                  {
                    key: 'pubkey_hash',
                    label: 'Pubkey Hash',
                    value: parsedArgs.pubkey_hash,
                    copyable: true,
                    tooltip: 'Hash result of blake160(x only aggregated public key)'
                  },
                  {
                    key: 'delay_epoch',
                    label: 'Delay Epoch',
                    value: `Number: ${parsedArgs.delay_epoch.number}, Index: ${parsedArgs.delay_epoch.index}, Length: ${parsedArgs.delay_epoch.length}`,
                    copyable: false,
                    tooltip: 'u64 in little endian, must be a relative EpochNumberWithFraction'
                  },
                  {
                    key: 'version',
                    label: 'Version',
                    value: parsedArgs.version,
                    copyable: false,
                    tooltip: 'u64 in big-endian'
                  },
                  {
                    key: 'settlement_hash',
                    label: 'Settlement Hash',
                    value: parsedArgs.settlement_hash,
                    copyable: true,
                    tooltip: 'Hash result of blake160(pending_htlc_count || N * pending_htlc || settlement amounts and pubkeys)'
                  },
                  {
                    key: 'settlement_flag',
                    label: 'Settlement Flag',
                    value: parsedArgs.settlement_flag === 0 ? '0 (First Settlement)' : parsedArgs.settlement_flag.toString(),
                    copyable: false,
                    tooltip: '0x00 means this cell is created for first funding cell unlock, 0x01 means this cell is created for subsequent commitment cell unlock'
                  }
                );
              }
              
              const txWithWitness = tx as { witness_args?: string };
              if (txWithWitness.witness_args) {
                parsedWitness = parseWitnessV2(txWithWitness.witness_args);
                console.log(`Transaction #${index + 1} - Parsed witness_args:`, parsedWitness);
                
                // 构建 witness_args extraFields
                extraFields.push(
                  {
                    key: 'empty_witness_args',
                    label: 'Empty Witness Args',
                    value: String(parsedWitness.empty_witness_args),
                    copyable: true,
                    tooltip: 'Fixed to 0x10000000100000001000000010000000, for compatibility with the xudt'
                  },
                  {
                    key: 'unlock_count',
                    label: 'Unlock Count',
                    value: String(parsedWitness.unlock_count),
                    copyable: false,
                    tooltip: '0x00 for revocation unlock, 0x01 ~ 0xFF for settlement unlocks count'
                  }
                );
                
                if (parsedWitness.unlock_count === 0) {
                  // Revocation unlock
                  const revocation = parsedWitness.revocation as { version: bigint; pubkey: string; signature: string };
                  extraFields.push(
                    {
                      key: 'revocation_version',
                      label: 'Revocation Version',
                      value: revocation.version.toString(),
                      copyable: false
                    },
                    {
                      key: 'revocation_pubkey',
                      label: 'Revocation Pubkey',
                      value: revocation.pubkey,
                      copyable: true
                    },
                    {
                      key: 'revocation_signature',
                      label: 'Revocation Signature',
                      value: revocation.signature,
                      copyable: true
                    }
                  );
                } else {
                  // Settlement unlock
                  const settlement = parsedWitness.settlement as {
                    pending_htlc_count: number;
                    htlcs: Array<{
                      htlc_type: number;
                      payment_amount: bigint;
                      payment_hash: string;
                      remote_htlc_pubkey_hash: string;
                      local_htlc_pubkey_hash: string;
                      htlc_expiry: string;
                      htlc_expiry_timestamp: bigint;
                    }>;
                    settlement_remote_pubkey_hash: string;
                    settlement_remote_amount: bigint;
                    settlement_local_pubkey_hash: string;
                    settlement_local_amount: bigint;
                    unlocks: Array<{
                      unlock_type: number;
                      with_preimage: number;
                      signature: string;
                      preimage: string;
                    }>;
                  };
                  extraFields.push(
                    {
                      key: 'pending_htlc_count',
                      label: 'Pending Htlc Count',
                      value: settlement.pending_htlc_count.toString(),
                      copyable: false
                    },
                    {
                      key: 'settlement_remote_pubkey_hash',
                      label: 'Settlement Remote Pubkey Hash',
                      value: settlement.settlement_remote_pubkey_hash,
                      copyable: true
                    },
                    {
                      key: 'settlement_remote_amount',
                      label: 'Settlement Remote Amount',
                      value: settlement.settlement_remote_amount.toString(),
                      copyable: false
                    },
                    {
                      key: 'settlement_local_pubkey_hash',
                      label: 'Settlement Local Pubkey Hash',
                      value: settlement.settlement_local_pubkey_hash,
                      copyable: true
                    },
                    {
                      key: 'settlement_local_amount',
                      label: 'Settlement Local Amount',
                      value: settlement.settlement_local_amount.toString(),
                      copyable: false
                    }
                  );
                  
                  // 展开显示 HTLCs
                  if (settlement.htlcs && settlement.htlcs.length > 0) {
                    settlement.htlcs.forEach((htlc, htlcIndex) => {
                      // 先添加 HTLC 标题行
                      extraFields.push({
                        key: `htlc_${htlcIndex}_title`,
                        label: `HTLC #${htlcIndex + 1}`,
                        value: '',
                        copyable: false,
                        isTitleOnly: true
                      });
                      
                      // 添加 HTLC 子字段
                      extraFields.push(
                        {
                          key: `htlc_${htlcIndex}_type`,
                          label: 'Type',
                          value: htlc.htlc_type.toString(),
                          copyable: false,
                          isSubField: true,
                          tooltip: 'High 7 bits for payment hash type (0000000 for blake2b, 0000001 for sha256), low 1 bit for offered or received type (0 for offered HTLC, 1 for received HTLC)'
                        },
                        {
                          key: `htlc_${htlcIndex}_payment_amount`,
                          label: 'Payment Amount',
                          value: htlc.payment_amount.toString(),
                          copyable: false,
                          isSubField: true,
                          tooltip: 'u128 in little endian'
                        },
                        {
                          key: `htlc_${htlcIndex}_payment_hash`,
                          label: 'Payment Hash',
                          value: htlc.payment_hash,
                          copyable: true,
                          isSubField: true
                        },
                        {
                          key: `htlc_${htlcIndex}_remote_pubkey_hash`,
                          label: 'Remote Pubkey Hash',
                          value: htlc.remote_htlc_pubkey_hash,
                          copyable: true,
                          isSubField: true,
                          tooltip: 'Hash result of blake160(remote_htlc_pubkey)'
                        },
                        {
                          key: `htlc_${htlcIndex}_local_pubkey_hash`,
                          label: 'Local Pubkey Hash',
                          value: htlc.local_htlc_pubkey_hash,
                          copyable: true,
                          isSubField: true,
                          tooltip: 'Hash result of blake160(local_htlc_pubkey)'
                        },
                        {
                          key: `htlc_${htlcIndex}_expiry`,
                          label: 'Expiry',
                          value: htlc.htlc_expiry,
                          copyable: false,
                          isSubField: true,
                          tooltip: 'u64 in little endian, must be an absolute timestamp since'
                        }
                      );
                    });
                  }
                  
                  // 展开显示 Unlocks
                  if (settlement.unlocks && settlement.unlocks.length > 0) {
                    settlement.unlocks.forEach((unlock, unlockIndex) => {
                      // 先添加 Unlock 标题行
                      extraFields.push({
                        key: `unlock_${unlockIndex}_title`,
                        label: `Unlock #${unlockIndex + 1}`,
                        value: '',
                        copyable: false,
                        isTitleOnly: true
                      });
                      
                      // 添加 Unlock 子字段
                      extraFields.push(
                        {
                          key: `unlock_${unlockIndex}_type`,
                          label: 'Type',
                          value: unlock.unlock_type.toString(),
                          copyable: false,
                          isSubField: true,
                          tooltip: '0x00 ~ 0xFD for pending htlc group index, 0xFE for settlement remote, 0xFF for settlement local'
                        },
                        {
                          key: `unlock_${unlockIndex}_with_preimage`,
                          label: 'With Preimage',
                          value: unlock.with_preimage.toString(),
                          copyable: false,
                          isSubField: true,
                          tooltip: '0x00 without preimage, 0x01 with preimage'
                        },
                        {
                          key: `unlock_${unlockIndex}_signature`,
                          label: 'Signature',
                          value: unlock.signature,
                          copyable: true,
                          isSubField: true,
                          tooltip: 'The signature of the corresponding pubkey'
                        }
                      );
                      
                      if (unlock.with_preimage === 1 && unlock.preimage !== 'N/A') {
                        extraFields.push({
                          key: `unlock_${unlockIndex}_preimage`,
                          label: 'Preimage',
                          value: unlock.preimage,
                          copyable: true,
                          isSubField: true,
                          tooltip: 'An optional field to provide the preimage of the payment_hash'
                        });
                      }
                    });
                  }
                }
              }
            } catch (error) {
              console.error(`Transaction #${index + 1} - Parse error:`, error);
            }

            return (
              <DetailCard
                key={tx.tx_hash}
                name={`Transaction #${index + 1}`}
                showStatus={false}
                hash={tx.tx_hash}
                topRightLabel={`BLOCK #${tx.block_number}`}
                commitmentArgs={tx.commitment_args ?? "-"}
                witnessArgs={(tx as { witness_args?: string }).witness_args || "-"}
                extraFields={extraFields.length > 0 ? extraFields : undefined}
              />
            );
          })
        ) : (
          <div className="col-span-2 card-zed p-8 text-center">
            <p className="text-secondary">No transactions found</p>
          </div>
        )}
      </div>

      {/* Nodes */}
      <div className="mt-3">
        <SectionHeader title="Nodes" />
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
    </div>
  );
}
