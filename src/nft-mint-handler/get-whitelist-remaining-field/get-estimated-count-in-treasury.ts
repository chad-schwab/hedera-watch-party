import { createLogger } from "../../lib/logger";
import { Network } from "../../lib/types";
import { getLambdaContext } from "../../lib/lambda-global";
import { MirrorNft, getRequest } from "../../mirror-client";

const logger = createLogger("get-estimated-count-in-treasury");

const estimatedCountCache: Record<string, { count: number; expire: number }> = {};
export async function getEstimatedCountInTreasury(
  network: Network,
  tokenId: string,
  treasuryAccountId: string,
  transferredSerialNumbers: number[]
): Promise<number | null> {
  const cacheKey = `${network}:${tokenId}:${treasuryAccountId}`;

  try {
    if (
      estimatedCountCache[cacheKey] &&
      estimatedCountCache[cacheKey].count > 200 &&
      estimatedCountCache[cacheKey].expire > Date.now()
    ) {
      estimatedCountCache[cacheKey].count -= transferredSerialNumbers.length;
      logger.debug({ cached: estimatedCountCache[cacheKey] }, "Using cache for estimated count.");
    } else {
      const omitSerialNumbers = new Set(transferredSerialNumbers);
      let next = `/api/v1/accounts/${treasuryAccountId}/nfts?token.id=${tokenId}&limit=100`;
      let count = 0;
      do {
        const timeRemaining = getLambdaContext().getRemainingTimeInMillis();

        if (timeRemaining < 2000) {
          logger.warn(
            `Estimated count calculation ran out of time. Time remaining: ${timeRemaining}`
          );
          return null;
        }

        const { nfts, links } = await getRequest<AccountNftsResponse>(network, next);

        logger.debug(`Got account nfts: ${nfts.length}. Next: ${links.next}`);
        next = links.next;
        count += nfts.filter((n) => !omitSerialNumbers.has(n.serial_number)).length;
      } while (next);
      estimatedCountCache[cacheKey] = { count, expire: Date.now() + 25000 + Math.random() * 10000 }; // expire 25-35 seconds from now
    }
    return estimatedCountCache[cacheKey].count;
  } catch (e) {
    logger.error(e, "Failed getting estimated count remaining");
    return null;
  }
}
type AccountNftsResponse = {
  nfts: MirrorNft[];
  links: {
    next: string;
  };
};
