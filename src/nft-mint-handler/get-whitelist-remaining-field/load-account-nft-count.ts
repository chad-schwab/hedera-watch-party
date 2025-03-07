import { createLogger } from "../../lib/logger";
import { Network } from "../../lib/types";
import { getAccountNfts } from "../../mirror-client";

const logger = createLogger("load-account-nft-counts");

export async function loadAccountNftCount(
  network: Network,
  accountId: string,
  tokenId: string,
  includeSerialNumbers: number[]
): Promise<number | undefined> {
  try {
    const accountNfts = await getAccountNfts(network, accountId, tokenId);
    // make sure new nfts are accounted for
    const unknownSerials = new Set(includeSerialNumbers);
    accountNfts.forEach((n) => unknownSerials.delete(n.serialNumber));
    return accountNfts.length + unknownSerials.size;
  } catch (error) {
    logger.error({ error, accountId, tokenId }, "Failed getting account NFT count");
  }
  return undefined;
}
