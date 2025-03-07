import { Network } from "../lib/types";
import { nftLink, tokenLink, walletLink } from "../explore-links";

export function embedLink(text: string | number, link: string) {
  return `[${text}](${link})`;
}

export function embedTokenLink(
  network: Network,
  tokenId: string,
  tokenName?: string,
  tokenSymbol?: string
): string {
  if (tokenSymbol && !tokenSymbol.includes("://")) {
    return embedLink(tokenSymbol, tokenLink(network, tokenId));
  }
  if (tokenName) {
    return embedLink(tokenName, tokenLink(network, tokenId));
  }
  return embedLink(tokenId, tokenLink(network, tokenId));
}

export function embedNftLink(network: Network, tokenId: string, serialNum: number): string {
  return embedLink(serialNum, nftLink(network, tokenId, serialNum));
}

export function embedWalletLink(
  network: Network,
  wallet: string,
  username: string | undefined
): string {
  return embedLink(username ?? wallet, walletLink(network, wallet));
}
