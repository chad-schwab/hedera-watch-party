import {
  SentinelContentTransactionFungibleTransfer,
  SentinelContentTransactionNftTransfer,
  SentinelContentTransactionTransfer,
} from "../lib/lworks-streams/types";
import { tinyToHbar } from "../tiny-to-hbar";

import { TradeOptions } from "./types";

export function isTrade(
  tradeOptions: Pick<TradeOptions, "hbarThreshold" | "tokenPayments" | "nftPayments">,
  transaction: {
    transfers: SentinelContentTransactionTransfer[];
    tokenTransfers: SentinelContentTransactionFungibleTransfer[];
    nftTransfers: SentinelContentTransactionNftTransfer[];
  },
  allReceiverWallets: Set<string>
) {
  const hbarThreshold = parseFloat(tradeOptions.hbarThreshold);
  const { tokenTransfers, nftTransfers, transfers } = transaction;

  return !!(
    hbarThreshold === 0 ||
    transfers.find(
      (t) => tinyToHbar(t) <= -Math.abs(hbarThreshold) && allReceiverWallets.has(t.account)
    ) ||
    (tradeOptions.tokenPayments.toLowerCase() === "true" &&
      tokenTransfers.find((t) => t.amount < 0 && allReceiverWallets.has(t.account))) ||
    (tradeOptions.nftPayments.toLowerCase() === "true" &&
      nftTransfers.find((t) => allReceiverWallets.has(t.senderAccountId)))
  );
}
