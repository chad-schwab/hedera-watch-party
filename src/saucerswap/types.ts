type SaucerSwapLpToken = {
  decimals: number;
  id: string;
  name: string;
  symbol: string;
  priceUsd: string;
};

type SaucerSwapPooledToken = {
  decimals: number;
  id: string;
  name: string;
  symbol: string;
  priceUsd: number;
  icon: string | null;
  price: string;
  dueDiligenceComplete: boolean;
  isFeeOnTransferToken: boolean;
  description: string | null;
  website: string | null;
  sentinelReport: null | string;
  twitterHandle: string | null;
  timestampSecondsLastListingChange: number;
};

export type SaucerSwapLiquidityPool = {
  id: number;
  contractId: string;
  lpToken: SaucerSwapLpToken;
  lpTokenReserve: string;
  tokenA: SaucerSwapPooledToken;
  tokenReserveA: string;
  tokenB: SaucerSwapPooledToken;
  tokenReserveB: string;
};
