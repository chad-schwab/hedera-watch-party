import { createLogger } from "../lib/logger";

import { HashpackUser } from "./types";

const usernameCache: Map<string, string | null> = new Map();

const logger = createLogger("hashpack/lookup-username");

async function fetchUsername(network: string, accountId: string): Promise<string | null> {
  logger.debug("Fetching hashpack username");
  const response = await fetch("https://api-lb.hashpack.app/user-profile/get", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accountId, network }),
  });
  if (!response.ok) {
    logger.warn(
      `Received ${response.status} ${response.statusText} from hashpack loading username`
    );
    return null;
  }
  const hashpackUser = (await response.json()) as unknown as HashpackUser | null;
  const { username } = hashpackUser ?? {};
  if (!username?.name) {
    logger.debug({ accountId }, "No hashpack username found");
    return null;
  }

  if (username.tokenId === "0.0.1234197") {
    logger.debug("Hiding hashgraph.name .hbar token");
    return null;
  }

  logger.debug({ accountId, username }, "Found hashpack username");
  return username.name;
}

export async function lookupUsername(network: string, accountId: string) {
  const cacheKey = `${network}:${accountId}`;
  if (!usernameCache.has(cacheKey)) {
    const username = await fetchUsername(network, accountId);
    usernameCache.set(cacheKey, username);
  }
  return usernameCache.get(cacheKey) ?? undefined;
}
