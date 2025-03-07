import {
  SentinelContentTransaction,
  SentinelContentTransactionFungibleTransfer,
  SentinelContentTransactionNftTransfer,
  SentinelContentTransactionTransfer,
  SentinelMetadata,
} from "../lib/lworks-streams/types";
import { applyDecimals } from "../apply-decimals";
import { embedLink, embedNftLink, embedTokenLink, embedWalletLink } from "../discord/discord-links";
import { DiscordField } from "../discord/types";
import { lookupUsername } from "../hashpack/fetch-username";
import { MirrorToken } from "../mirror-client";
import { getSaucerSwapLp } from "../saucerswap/get-lp-token";
import { tinyToHbar } from "../tiny-to-hbar";

function formatFtTransfers(
  metadata: SentinelMetadata,
  tokenTransfers: SentinelContentTransactionFungibleTransfer[],
  tokensById: Record<string, MirrorToken | undefined>,
  amountFactor = 1
) {
  return tokenTransfers.map((ft) => {
    const token = tokensById[ft.tokenId];
    if (!token) {
      return `unknown ${embedTokenLink(metadata.network, ft.tokenId)}`;
    }
    const decimals = parseInt(`${token.decimals}`, 10);
    const amount = applyDecimals(ft.amount, decimals, amountFactor);
    return `${amount} ${embedTokenLink(metadata.network, ft.tokenId, token.name, token.symbol)}`;
  });
}
function formatNftTransfers(
  metadata: SentinelMetadata,
  nftTransfers: SentinelContentTransactionNftTransfer[],
  tokensById: Record<string, MirrorToken | undefined>
) {
  const creditNftByTokenId = nftTransfers.reduce(
    (agg, n) => ({ ...agg, [n.tokenId]: [...(agg[n.tokenId] || []), n] }),
    {} as Record<string, SentinelContentTransactionNftTransfer[] | undefined>
  );
  return Object.entries(creditNftByTokenId).map(
    ([tokenId, nfts]) =>
      `${embedTokenLink(
        metadata.network,
        tokenId,
        tokensById[tokenId]?.name,
        tokensById[tokenId]?.symbol
      )} # ${nfts?.map((n) => embedNftLink(metadata.network, tokenId, n.serialNumber)).join(", ")}`
  );
}
function formatHbarTransfer(transfer?: SentinelContentTransactionTransfer, amountFactor = 1) {
  if (transfer && transfer.account) {
    return [`${(amountFactor * tinyToHbar(transfer)).toPrecision(8)} hbar`];
  }
  return [];
}
export async function discoverTransactionFields(
  metadata: SentinelMetadata,
  wallet: string,
  transaction: SentinelContentTransaction,
  tokensById: Record<string, MirrorToken | undefined>
): Promise<DiscordField[]> {
  const { tokenTransfers, nftTransfers, transfers } = transaction;
  const creditTokens = tokenTransfers.filter((t) => t.account === wallet && t.amount > 0);
  const debitTokens = tokenTransfers.filter((t) => t.account === wallet && t.amount < 0);
  const creditNfts = nftTransfers.filter((t) => t.receiverAccountId === wallet);
  const debitNfts = nftTransfers.filter((t) => t.senderAccountId === wallet);
  const creditTransfer = transfers.find((t) => t.account === wallet && t.amount > 0);
  const debitTransfer = transfers.find((t) => t.account === wallet && t.amount < 0);

  const creditValue = [
    ...formatNftTransfers(metadata, creditNfts, tokensById),
    ...formatFtTransfers(metadata, creditTokens, tokensById),
    ...formatHbarTransfer(creditTransfer),
  ].join("\n");
  const debitValue = [
    ...formatNftTransfers(metadata, debitNfts, tokensById),
    ...formatFtTransfers(metadata, debitTokens, tokensById, -1),
    ...formatHbarTransfer(debitTransfer, -1),
  ].join("\n");
  const lpPool = await getSaucerSwapLp(wallet);
  const fields: DiscordField[] = [];

  if (lpPool) {
    fields.push({
      name: "LP",
      value: embedLink(
        lpPool.lpToken.symbol,
        `https://analytics.saucerswap.finance/pool/${wallet}`
      ),
      inline: true,
    });
  } else {
    const username = await lookupUsername(metadata.network, wallet);
    fields.push({
      name: "Wallet",
      value: embedWalletLink(metadata.network, wallet, username),
      inline: true,
    });
  }
  if (creditValue) {
    fields.push({
      name: "Receives",
      inline: true,
      value: creditValue,
    });
  }

  if (debitValue) {
    fields.push({
      name: "Sends",
      inline: true,
      value: debitValue,
    });
  }

  return fields;
}
