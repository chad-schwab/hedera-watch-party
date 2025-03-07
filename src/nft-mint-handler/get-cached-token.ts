import invariant from "tiny-invariant";

import { Network } from "../lib/types";
import { MirrorToken, getToken } from "../mirror-client";

const tokenCache: Map<string, MirrorToken> = new Map();
export async function getCachedToken(network: Network, tokenId: string) {
  const cacheKey = `${network}:${tokenId}`;
  if (!tokenCache.has(cacheKey)) {
    const token = await getToken(network, tokenId);
    if (!token) {
      throw new Error(
        `Failed to load token from mirror for network: ${network}, token: ${tokenId}`
      );
    }
    tokenCache.set(cacheKey, token);
  }
  const token = tokenCache.get(cacheKey);
  invariant(token);
  return token;
}
