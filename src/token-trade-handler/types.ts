import { DiscordBaseBotOptions } from "../discord/types";

export type DefaultTradeOptions = DiscordBaseBotOptions & {
  hbarThreshold: string;
  tokenPayments: string;
  nftPayments: string;
};

export type TradeOptions = DefaultTradeOptions & {
  webhookUrls: string;
  ipfsGateways?: string;
  includeMemo?: string;
};
