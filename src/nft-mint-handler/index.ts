import { createLogger } from "../lib/logger";
import {
  SentinelContentTokenMint,
  SentinelContentTokenTransfer,
  SentinelMetadata,
  SentinelRequest,
} from "../lib/lworks-streams/types";
import { TokenMintRuleType, TokenTransferRuleType } from "../discord/constants";
import { loadIpfsMetadata } from "../ipfs-client";
import { getNfts, getToken } from "../mirror-client";
import { EmptyResponse } from "../responses";

import { getCachedToken } from "./get-cached-token";
import { getWhitelistRemainingField } from "./get-whitelist-remaining-field";
import { getEstimatedCountInTreasury } from "./get-whitelist-remaining-field/get-estimated-count-in-treasury";
import {
  AdditionMintDetails,
  DiscordMintOptions,
  MintEventOutput,
  MintPayload,
  MintSendStrategy,
} from "./types";

const logger = createLogger("discord-nft-mint");

async function sendTokenMintWebhook(
  mintOptions: DiscordMintOptions,
  content: SentinelContentTokenMint,
  metadata: SentinelMetadata,
  sendStrategy: MintSendStrategy
): Promise<MintEventOutput> {
  logger.debug("Handling token mint transaction");
  const { nfts = [] } = content;
  const [tokenResponse, loadedNfts, whitelistRemainingField] = await Promise.all([
    getToken(metadata.network, metadata.rule.predicateValue),
    loadIpfsMetadata(
      nfts.map((n) => ({ ...n, ownerId: n.receiverAccountId })),
      mintOptions.ipfsGateways
    ),
    getWhitelistRemainingField(mintOptions, metadata, content.nfts),
  ]);

  const additionalDetails: AdditionMintDetails = {};
  if (whitelistRemainingField) {
    additionalDetails.walletWhitelist = whitelistRemainingField;
  }
  if (tokenResponse) {
    additionalDetails.remainingNfts = {
      remaining: tokenResponse.max_supply - tokenResponse.total_supply,
      total: tokenResponse.max_supply,
      estimated: false,
    };
  }

  return sendStrategy({
    transaction: content.transaction,
    options: mintOptions,
    metadata,
    loadedNfts,
    additionalDetails,
    tokenResponse,
  });
}

async function sendTokenTransferMintWebhook(
  mintOptions: DiscordMintOptions,
  content: SentinelContentTokenTransfer,
  metadata: SentinelMetadata,
  sendStrategy: MintSendStrategy
): Promise<MintEventOutput> {
  logger.debug("Handling token transfer transaction");
  const tokenResponse = await getCachedToken(metadata.network, metadata.rule.predicateValue);

  const { nfts = [] } = content;

  const treasuryAccountId =
    mintOptions.treasuryOverride?.trim() || tokenResponse.treasury_account_id;
  const mintedNfts = nfts.filter((n) => n.senderAccountId === treasuryAccountId);
  if (!mintedNfts.length) {
    logger.debug(
      nfts,
      `No nfts sent from treasury account: ${treasuryAccountId} in transactions: `
    );
    return EmptyResponse;
  }

  const mirrorNfts = await getNfts(metadata.network, mintedNfts);

  const [loadedNfts, estimatedInTreasury, whitelistRemainingField] = await Promise.all([
    loadIpfsMetadata(mirrorNfts, mintOptions.ipfsGateways),
    getEstimatedCountInTreasury(
      metadata.network,
      metadata.rule.predicateValue,
      treasuryAccountId,
      mintedNfts.map((n) => n.serialNumber)
    ),
    getWhitelistRemainingField(mintOptions, metadata, content.nfts),
  ]);
  const additionalDetails: AdditionMintDetails = {};
  if (whitelistRemainingField) {
    additionalDetails.walletWhitelist = whitelistRemainingField;
  }
  if (estimatedInTreasury !== null) {
    logger.debug(`Loaded estimated count in treasury: ${estimatedInTreasury}`);
    additionalDetails.remainingNfts = {
      remaining: estimatedInTreasury,
      total: tokenResponse.max_supply,
      estimated: true,
    };
  }

  return sendStrategy({
    transaction: content.transaction,
    options: mintOptions,
    metadata,
    loadedNfts,
    additionalDetails,
    tokenResponse,
  });
}

function validateOptions(mintOptions: DiscordMintOptions) {
  if (!mintOptions.webhookUrls) {
    logger.warn("webhookUrls must be specified in rule");
    throw new Error("400 Base Request: webhookUrls must be specified in request");
  }
}

export async function handleMintEvent(
  event: SentinelRequest<MintPayload, DiscordMintOptions>,
  sendStrategy: MintSendStrategy
): Promise<MintEventOutput> {
  const { content, metadata, options } = event;

  logger.info(
    `Handling transaction: ${content.transaction.transactionId} with status ${content.transaction.status} for rule ${metadata.rule.id}`
  );
  logger.debug({
    content,
    metadata,
    ...options,
  });

  validateOptions(options);

  if (content.transaction.status !== "SUCCESS") {
    return EmptyResponse;
  }
  if (metadata.rule.type === TokenMintRuleType) {
    return sendTokenMintWebhook(
      options,
      content as SentinelContentTokenMint,
      metadata,
      sendStrategy
    );
  }
  if (metadata.rule.type === TokenTransferRuleType) {
    return sendTokenTransferMintWebhook(
      options,
      content as SentinelContentTokenTransfer,
      metadata,
      sendStrategy
    );
  }

  logger.warn(`Unknown transaction type: ${metadata.rule.type}`);
  throw new Error(`400 Bad Request: unknown transaction type ${metadata.rule.type}`);
}
