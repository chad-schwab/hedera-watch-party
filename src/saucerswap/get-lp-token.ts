import { createLogger } from "../lib/logger";

import { SaucerSwapLiquidityPool } from "./types";

const saucerSwapPools = new Map<string, SaucerSwapLiquidityPool>();
let saucerSwapFetchPromise: Promise<void> | undefined;

const logger = createLogger("saucerswap/get-lp-token");

const loadSaucerSwapData = (saucerSwapData: SaucerSwapLiquidityPool[]) => {
  saucerSwapData.forEach((d) => saucerSwapPools.set(d.contractId, d));
};

export const getSaucerSwapLp = async (address: string) => {
  if (!saucerSwapFetchPromise) {
    saucerSwapFetchPromise = fetch("https://api.saucerswap.finance/pools")
      .then((p) => p.json())
      .then(loadSaucerSwapData);
  }
  try {
    await saucerSwapFetchPromise;
  } catch (error) {
    logger.error({ error }, "Error loading saucer swap pool live data.");
    saucerSwapFetchPromise = undefined;
    return undefined;
  }
  return saucerSwapPools.get(address);
};
