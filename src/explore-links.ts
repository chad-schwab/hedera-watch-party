import { Network } from "./lib/types";
import { SentinelContentTransaction } from "./lib/lworks-streams/types";

export const exploreBaseUrl = "https://hashscan.io";

export function walletLink(network: Network, wallet: string): string {
  return `${exploreBaseUrl}/${network}/account/${wallet}`;
}

export function tokenLink(network: Network, tokenId: string): string {
  return `${exploreBaseUrl}/${network}/token/${tokenId}`;
}

export function nftLink(network: Network, tokenId: string, serialNum: number): string {
  return `${exploreBaseUrl}/${network}/token/${tokenId}/${serialNum}`;
}

export function transactionLink(
  network: Network,
  transaction: Pick<SentinelContentTransaction, "transactionId">
) {
  const [shard, realm, account, consensusSec, consensusNano] =
    transaction.transactionId.split(/[@\-.]/);
  if (!shard || !realm || !account || !consensusSec || !consensusNano) {
    return "#";
  }
  return `${exploreBaseUrl}/${network}/transaction/${shard}.${realm}.${account}@${consensusSec}.${consensusNano}`;
}
