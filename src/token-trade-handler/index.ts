import { createLogger } from "../lib/logger";
import {
  SentinelContentTokenTransfer,
  SentinelMetadata,
  SentinelRequest,
} from "../lib/lworks-streams/types";
import { DefaultBotOptions, TokenTransferRuleType } from "../discord/constants";
import { sendDiscordWebhook } from "../discord/discord-client";
import { groupInlineFields } from "../discord/group-inline-fields";
import { toImageEmbed } from "../discord/to-image-embed";
import { DiscordEmbed } from "../discord/types";
import { transactionLink } from "../explore-links";
import { checkForChadsTop10 } from "../hangry/check-for-chads-top-10";
import { checkForRebel as checkForOgRebel } from "../hangry/check-for-rebel";
import { isRebelToken } from "../hangry/is-boon-token";
import { hederaTsToMilliseconds } from "../hedera-ts-to-ms";
import { loadIpfsMetadata } from "../ipfs-client";
import { MirrorToken, getNfts, getToken } from "../mirror-client";
import { EmptyResponse, StandardResponse, mapResponse } from "../responses";

import { discoverTransactionFields } from "./discover-transaction-fields";
import { isTrade } from "./is-trade";
import { DefaultTradeOptions, TradeOptions } from "./types";

const logger = createLogger("discord-nft-trade");
export const defaultTradeOptions: DefaultTradeOptions = {
  ...DefaultBotOptions,
  notificationTitle: "Token Trade Report",
  hbarThreshold: "20",
  tokenPayments: "false",
  nftPayments: "false",
};

// eslint-disable-next-line sonarjs/cognitive-complexity
async function sendTokenTransferTradeWebhook(
  tradeOptions: TradeOptions,
  embedDefaults: DiscordEmbed,
  content: SentinelContentTokenTransfer,
  metadata: SentinelMetadata
): Promise<StandardResponse> {
  logger.debug("Handling token transfer transaction");
  const { tokenTransfers, nftTransfers } = content.transaction;
  const { predicateValue: tokenId } = metadata.rule;

  const tokenReceiverWallets = tokenTransfers
    .filter((t) => t.tokenId === tokenId && t.amount > 0)
    .map((t) => t.account);
  const nftReceiverWallets = nftTransfers
    .filter((t) => t.tokenId === tokenId)
    .map((t) => t.receiverAccountId);
  const allReceiverWallets = new Set([...tokenReceiverWallets, ...nftReceiverWallets]);

  if (!isTrade(tradeOptions, content.transaction, allReceiverWallets)) {
    logger.info("The receiver account did not pay anything for this transaction. Skipping.");
    return EmptyResponse;
  }

  const tokenSenderWallets = tokenTransfers
    .filter((t) => t.tokenId === tokenId && t.amount < 0)
    .map((t) => t.account);
  const nftSenderWallets = nftTransfers
    .filter((t) => t.tokenId === tokenId)
    .map((t) => t.senderAccountId);

  const allSenderWallets = new Set(
    [...tokenSenderWallets, ...nftSenderWallets].filter((w) => !allReceiverWallets.has(w))
  );
  const allRelevantWallets = [...allReceiverWallets, ...allSenderWallets];
  const allTokenIds = new Set([...tokenTransfers, ...nftTransfers].map((t) => t.tokenId));
  const allTokenNfts = nftTransfers.filter((t) => t.tokenId === tokenId);
  const [tokens, nfts] = await Promise.all([
    Promise.all([...allTokenIds].map((t) => getToken(metadata.network, t))),
    getNfts(metadata.network, allTokenNfts),
  ]);
  const loadedMetadata = nfts.length ? await loadIpfsMetadata(nfts, tradeOptions.ipfsGateways) : [];

  const tokensById = tokens.reduce(
    (agg, t) => (t ? { ...agg, [t.token_id]: t } : agg),
    {} as Record<string, MirrorToken | undefined>
  );

  const additionalFields = [];
  if (
    tradeOptions.includeMemo === "true" &&
    content.transaction.memo &&
    content.transaction.memo.length
  ) {
    additionalFields.push({
      name: "Memo",
      value: content.transaction.memo,
      inline: false,
    });
  }

  const transactionFields = (
    await Promise.all(
      allRelevantWallets.map((wallet) =>
        discoverTransactionFields(metadata, wallet, content.transaction, tokensById)
      )
    )
  ).flatMap(groupInlineFields);

  const loadedNftWithImages = loadedMetadata.filter((n) => n.ipfsMetadata.image);
  const fields = [...transactionFields, ...additionalFields];
  let title = tradeOptions.notificationTitle;
  if (checkForOgRebel(metadata.rule.predicateValue, nfts)) {
    title = "OG REBEL SIGHTING";
  }
  if (checkForChadsTop10(metadata.rule.predicateValue, nfts)) {
    title += " :100:";
  }
  if (isRebelToken(metadata.rule.predicateValue) && nfts.find((n) => n.serialNumber === 888)) {
    title = "THE ROGUE REBEL HAS BEEN FOUND!";
  }
  const embeds: DiscordEmbed[] = [
    {
      ...embedDefaults,
      title,
      fields,
      image: toImageEmbed(loadedNftWithImages[0], tradeOptions),
    },
    ...loadedNftWithImages.slice(1, 4).map((loadedNft) => ({
      ...embedDefaults,
      title,
      image: toImageEmbed(loadedNft, tradeOptions),
    })),
  ];

  return mapResponse(
    await sendDiscordWebhook(
      {
        username: tradeOptions.notificationUsername,
        avatar_url: tradeOptions.notificationAvatarUrl,
        embeds,
      },
      tradeOptions.webhookUrls
    )
  );
}

function validateOptions(tradeOptions: TradeOptions) {
  if (!tradeOptions.webhookUrls) {
    logger.warn("webhookUrls must be specified in rule");
    throw new Error("400 Base Request: webhookUrls must be specified in request");
  }
}

export async function handleTradeEvent(
  event: SentinelRequest<SentinelContentTokenTransfer, TradeOptions>
): Promise<StandardResponse> {
  const { content, metadata, options } = event;

  const consensusTimestamp = hederaTsToMilliseconds(content.transaction.consensusTimestamp);

  const tradeOptions: TradeOptions = {
    ...defaultTradeOptions,
    ...options,
  };

  logger.info(
    `Handling transaction: ${content.transaction.transactionId} with status ${content.transaction.status} for rule ${metadata.rule.id}`
  );
  logger.debug({
    content,
    metadata,
    tradeOptions: {
      ...tradeOptions,
    },
  });

  validateOptions(tradeOptions);
  const embedDefaults: DiscordEmbed = {
    url: transactionLink(metadata.network, content.transaction),
    color: parseInt(tradeOptions.embedColor, 10),
    timestamp: new Date(consensusTimestamp).toISOString(),
    footer: {
      text: tradeOptions.footerText,
      icon_url: tradeOptions.footerIconUrl,
    },
  };

  if (content.transaction.status !== "SUCCESS") {
    return EmptyResponse;
  }

  if (metadata.rule.type === TokenTransferRuleType) {
    return sendTokenTransferTradeWebhook(
      tradeOptions,
      embedDefaults,
      content as SentinelContentTokenTransfer,
      metadata
    );
  }

  logger.warn(`Unknown transaction type: ${metadata.rule.type}`);
  throw new Error(`400 Bad Request: unknown transaction type ${metadata.rule.type}`);
}
