import { SentinelContentTransactionTransfer } from "./lib/lworks-streams/types";

export function tinyToHbar(transfer: SentinelContentTransactionTransfer): number {
  return transfer.amount * 1e-8;
}
