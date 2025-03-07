import { createLogger } from "../lib/logger";
import {
  BatchedSentinelRequest,
  SentinelContentTokenTransfer,
  SentinelMetadata,
  SentinelPayload,
} from "../lib/lworks-streams/types";
import { LambdaProxyResult } from "../lib/proxy-wrapper/types";
import { applyDecimals } from "../apply-decimals";
import { tokenLink, transactionLink } from "../explore-links";
import { hederaTsToMilliseconds } from "../hedera-ts-to-ms";
import { getSaucerSwapLp } from "../saucerswap/get-lp-token";
import { SaucerSwapLiquidityPool } from "../saucerswap/types";
import { DefaultBotOptions, TokenTransferRuleType } from "../discord/constants";
import { sendDiscordWebhook } from "../discord/discord-client";
import { embedLink } from "../discord/discord-links";
import { groupInlineFields } from "../discord/group-inline-fields";
import {
  DiscordBaseBotOptions,
  DiscordEmbed,
  DiscordEmbedImage,
  DiscordField,
} from "../discord/types";

const logger = createLogger("discord-nft-trade");
export const defaultTradeOptions = {
  ...DefaultBotOptions,
  notificationTitle: "Token Trade Report",
};

function hasSwapLp<T>(
  item: T & {
    saucerSwapLp: SaucerSwapLiquidityPool | undefined;
  }
): item is T & { saucerSwapLp: SaucerSwapLiquidityPool } {
  return Boolean(item.saucerSwapLp);
}

// eslint-disable-next-line sonarjs/cognitive-complexity
async function sendLpSwapWebhook(
  tradeOptions: LpSwapOptions,
  embedDefaults: DiscordEmbed,
  items: SentinelContentTokenTransfer[],
  metadata: SentinelMetadata
): Promise<boolean> {
  logger.debug("Handling lp swap");

  // TODO: Load all transactions in smart contract call

  const tokenTransfers = items.flatMap((i) => i.tokens ?? []);
  const lpSwaps = (
    await Promise.all(
      tokenTransfers.map(async (t) => ({ ...t, saucerSwapLp: await getSaucerSwapLp(t.account) }))
    )
  ).filter(hasSwapLp);

  const gainLossByLP = new Map<
    string,
    { lp: SaucerSwapLiquidityPool; tokenAAmount: number; tokenBAmount: number }
  >();
  lpSwaps.forEach((lpSwap) => {
    let tokenAAmount = gainLossByLP.get(lpSwap.account)?.tokenAAmount ?? 0;
    let tokenBAmount = gainLossByLP.get(lpSwap.account)?.tokenBAmount ?? 0;
    if (lpSwap.saucerSwapLp.tokenA.id === lpSwap.tokenId) {
      tokenAAmount += lpSwap.amount;
    }
    if (lpSwap.saucerSwapLp.tokenA.id === lpSwap.tokenId) {
      tokenBAmount += lpSwap.amount;
    }
    gainLossByLP.set(lpSwap.account, { lp: lpSwap.saucerSwapLp, tokenAAmount, tokenBAmount });
  });

  const fields: DiscordField[] = [...gainLossByLP.values()].flatMap(
    ({ lp, tokenAAmount, tokenBAmount }) => {
      if (tokenAAmount === 0 && tokenBAmount === 0) {
        return [];
      }
      const isNegative = tokenAAmount < 0;
      const applyDecimalFactor = isNegative ? -1 : 1;
      return groupInlineFields([
        {
          name: "LP",
          value: embedLink(
            lp.lpToken.symbol,
            `https://analytics.saucerswap.finance/pool/${lp.contractId}`
          ),
          inline: true,
        },
        {
          name: isNegative ? "Losses" : "Gains",
          value: [
            `${applyDecimals(tokenAAmount, lp.tokenA.decimals, applyDecimalFactor)} ${embedLink(
              lp.tokenA.symbol,
              tokenLink(metadata.network, lp.tokenA.id)
            )}`,
            `${applyDecimals(tokenBAmount, lp.tokenB.decimals, applyDecimalFactor)} ${embedLink(
              lp.tokenB.symbol,
              tokenLink(metadata.network, lp.tokenB.id)
            )}`,
          ].join("\n"),
          inline: true,
        },
      ]);
    }
  );

  if (fields.length === 0) {
    return false;
  }

  const icons = new Set<string>();
  lpSwaps.forEach((lp) => {
    if (lp.saucerSwapLp.tokenA.icon) {
      icons.add(`https://www.saucerswap.finance${lp.saucerSwapLp.tokenA.icon}`);
    }
    if (lp.saucerSwapLp.tokenB.icon) {
      icons.add(`https://www.saucerswap.finance${lp.saucerSwapLp.tokenB.icon}`);
    }
  });
  const imageEmbeds: DiscordEmbedImage[] = [...icons.values()].map((i) => ({
    url: i,
  }));
  const { notificationTitle: title } = tradeOptions;
  const embeds: DiscordEmbed[] = [
    {
      ...embedDefaults,
      title: tradeOptions.notificationTitle,
      fields,
      image: imageEmbeds[0],
    },
    ...imageEmbeds.slice(1, 4).map((image) => ({
      ...embedDefaults,
      title,
      image,
    })),
  ];

  await sendDiscordWebhook(
    {
      username: tradeOptions.notificationUsername,
      avatar_url: tradeOptions.notificationAvatarUrl,
      embeds,
    },
    tradeOptions.webhookUrls
  );

  return true;
}

function validateOptions(tradeOptions: LpSwapOptions) {
  if (!tradeOptions.webhookUrls) {
    logger.warn("webhookUrls must be specified in rule");
    throw new Error("400 Base Request: webhookUrls must be specified in request");
  }
}

function groupTransactionsById(items: SentinelPayload<SentinelContentTokenTransfer>[]) {
  const itemsByTransaction = new Map<string, typeof items>();
  items.forEach((i) => {
    const { transactionId } = i.content.transaction;
    const existingItems = itemsByTransaction.get(transactionId) ?? [];
    existingItems.push(i);
    itemsByTransaction.set(transactionId, existingItems);
  });
  return [...itemsByTransaction.entries()];
}

export async function handleLpSwap(
  event: BatchedSentinelRequest<SentinelContentTokenTransfer, LpSwapOptions>
): Promise<LpSwapOutput> {
  const transactionGroups = groupTransactionsById(event.items);

  let numberWebhooksSent = 0;
  for (const [transactionId, items] of transactionGroups) {
    const { options } = event;
    const {
      metadata,
      content: { transaction },
    } = items[0];
    const consensusTimestamp = hederaTsToMilliseconds(
      transaction.parentConsensusTimestamp ?? transaction.consensusTimestamp
    );

    const startTimestamp = Date.now();

    const tradeOptions: LpSwapOptions = {
      ...defaultTradeOptions,
      ...options,
    };

    let error: Error | undefined;
    try {
      logger.info(
        `Handling transaction: ${transactionId} with status ${transaction.status} for rule ${metadata.rule.id}`
      );
      logger.debug({
        items,
        transactionId,
        tradeOptions: {
          ...tradeOptions,
        },
      });

      validateOptions(tradeOptions);
      const embedDefaults: DiscordEmbed = {
        url: transactionLink(metadata.network, transaction),
        color: parseInt(tradeOptions.embedColor, 10),
        timestamp: new Date(consensusTimestamp).toISOString(),
        footer: {
          text: tradeOptions.footerText,
          icon_url: tradeOptions.footerIconUrl,
        },
      };

      if (metadata.rule.type !== TokenTransferRuleType) {
        logger.warn(`Unknown transaction type: ${metadata.rule.type}`);
        throw new Error(`400 Bad Request: unknown transaction type ${metadata.rule.type}`);
      }

      if (
        await sendLpSwapWebhook(
          tradeOptions,
          embedDefaults,
          items.map((i) => i.content).filter((c) => c.transaction.status === "SUCCESS"),
          metadata
        )
      ) {
        numberWebhooksSent += 1;
      }
    } catch (e) {
      error = e as Error;
      throw e;
    } finally {
      const endTimestamp = Date.now();
      logger.debug(
        {
          ruleId: items[0].metadata.rule.id,
          transactionId,
          lambdaEndTimestamp: endTimestamp,
          lambdaElapsedTime: endTimestamp - startTimestamp,
          error: error && error.message,
        },
        `Finished handling transaction`
      );
    }
  }

  return {
    statusCode: 200,
    data: { message: `Sent ${numberWebhooksSent} webhooks` },
    kind: "data",
  };
}

export type LpSwapOptions = DiscordBaseBotOptions & {
  webhookUrls: string;
};

type TradeEventOutputMessage = {
  message: string;
};

type LpSwapOutput = LambdaProxyResult<TradeEventOutputMessage>;
