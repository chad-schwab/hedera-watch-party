import { parseBatchRequest, parseRequest } from "./lib/lworks-streams/parse-request";
import { SentinelContentTokenMint, SentinelContentTokenTransfer } from "./lib/lworks-streams/types";
import { proxyWrapper } from "./lib/proxy-wrapper";
import { handleLpSwap, LpSwapOptions } from "./lp-swap-handler";
import { handleMintEvent } from "./nft-mint-handler";
import { sendMintToDiscord } from "./nft-mint-handler/mint-send-strategy-discord";
import { DiscordMintOptions } from "./nft-mint-handler/types";
import { handleTradeEvent } from "./token-trade-handler";
import { TradeOptions } from "./token-trade-handler/types";

export const discordMintHandler = proxyWrapper(
  parseRequest<SentinelContentTokenMint, DiscordMintOptions>,
  (event) => handleMintEvent(event, sendMintToDiscord)
);

export const discordTradeHandler = proxyWrapper(
  parseRequest<SentinelContentTokenTransfer, TradeOptions>,
  handleTradeEvent
);

export const lpSwapHandler = proxyWrapper(
  parseBatchRequest<SentinelContentTokenTransfer, LpSwapOptions>,
  handleLpSwap
);
