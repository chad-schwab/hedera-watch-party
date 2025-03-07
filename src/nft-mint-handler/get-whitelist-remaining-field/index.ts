import { SentinelMetadata } from "../../lib/lworks-streams/types";
import { loadWhitelistGrants } from "../load-whitelist-grants";
import { DiscordMintOptions, WalletWhitelistDetails } from "../types";

import { loadAccountNftCount } from "./load-account-nft-count";

export async function getWhitelistRemainingField(
  mintOptions: DiscordMintOptions,
  metadata: SentinelMetadata,
  nftTransfers: { tokenId: string; receiverAccountId: string; serialNumber: number }[] | undefined
): Promise<WalletWhitelistDetails | undefined> {
  const receiverAccountId = nftTransfers?.find(
    (n) => n.tokenId === metadata.rule.predicateValue && n.receiverAccountId
  )?.receiverAccountId;

  if (!receiverAccountId) {
    return undefined;
  }

  const whitelistGrants = await loadWhitelistGrants(mintOptions, metadata.network);

  if (whitelistGrants && whitelistGrants[receiverAccountId]) {
    const whitelistGrantTotal = whitelistGrants[receiverAccountId];
    const accountNftCount = await loadAccountNftCount(
      metadata.network,
      receiverAccountId,
      metadata.rule.predicateValue,
      nftTransfers.map((n) => n.serialNumber)
    );
    if (accountNftCount !== undefined) {
      return {
        remaining: Math.max(whitelistGrantTotal - accountNftCount, 0),
        total: whitelistGrantTotal,
      };
    }
  }
  return undefined;
}
