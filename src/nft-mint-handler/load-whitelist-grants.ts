import { createLogger } from "../lib/logger";
import { Network } from "../lib/types";
import { getNftHolders } from "../mirror-client";

import { DiscordMintOptions } from "./types";

const logger = createLogger("load-whitelist-grants");

const lazyWhitelistGrants: Record<string, Record<string, number>> = {};
export async function loadWhitelistGrants(
  mintOptions: DiscordMintOptions,
  network: Network
): Promise<Record<string, number> | undefined> {
  if (network === "testnet") {
    return { "0.0.1193921": 4 };
  }

  const { whitelistTokens } = mintOptions;

  try {
    if (whitelistTokens) {
      if (!lazyWhitelistGrants[whitelistTokens]) {
        const allTokens = whitelistTokens
          .split(",")
          .map((w) => w.trim().split(":"))
          .map((s) => ({ tokenId: s[0].trim(), multiplier: parseInt(s[1].trim(), 10) }));

        const allHolders = await Promise.all(
          allTokens.map(async ({ tokenId, multiplier }) => {
            return {
              multiplier,
              holders: await getNftHolders(network, tokenId),
            };
          })
        );

        const whitelistGrants: Record<string, number> = {};
        allHolders.forEach(({ multiplier, holders }) => {
          holders.forEach((h) => {
            const currentWl = whitelistGrants[h.ownerId] || 0;
            whitelistGrants[h.ownerId] = currentWl + multiplier;
          });
        });
        lazyWhitelistGrants[whitelistTokens] = whitelistGrants;
      }
      return lazyWhitelistGrants[whitelistTokens];
    }
  } catch (error) {
    logger.error({ error, whitelistTokens }, "Failed getting holders");
  }
  return undefined;
}
