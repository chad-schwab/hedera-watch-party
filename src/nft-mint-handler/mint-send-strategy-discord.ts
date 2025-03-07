import { createLogger } from "../lib/logger";
import { DefaultBotOptions } from "../discord/constants";
import { sendDiscordWebhook } from "../discord/discord-client";
import { embedNftLink, embedTokenLink, embedWalletLink } from "../discord/discord-links";
import { toImageEmbed } from "../discord/to-image-embed";
import { DiscordBaseBotOptions, DiscordEmbed, DiscordField } from "../discord/types";
import { transactionLink } from "../explore-links";
import { lookupUsername } from "../hashpack/fetch-username";
import { hederaTsToMilliseconds } from "../hedera-ts-to-ms";
import { getRankField } from "../nfttier/get-nft-rank";
import { mapResponse } from "../responses";

import { MintSendStrategy } from "./types";

const logger = createLogger("send-mint-to-discord");
const defaultMintOptions: DiscordBaseBotOptions = {
  ...DefaultBotOptions,
  notificationTitle: "Another Token Minted!",
};
export const sendMintToDiscord: MintSendStrategy = async ({
  transaction,
  options,
  metadata,
  loadedNfts,
  additionalDetails,
  tokenResponse,
}) => {
  const mintOptions = { ...defaultMintOptions, ...options };
  const embedDefaults: DiscordEmbed = {
    url: transactionLink(metadata.network, transaction),
    color: parseInt(mintOptions.embedColor, 10),
    timestamp: new Date(hederaTsToMilliseconds(transaction.consensusTimestamp)).toISOString(),
    footer: {
      text: mintOptions.footerText,
      icon_url: mintOptions.footerIconUrl,
    },
  };
  const webhookUrls = mintOptions.webhookUrls.split(",");
  const walletId = loadedNfts[0].nft.ownerId;
  const username = await lookupUsername(metadata.network, walletId);
  let rankField: DiscordField | null = null;
  if (loadedNfts.length === 1) {
    rankField = getRankField(loadedNfts[0].nft, true);
  }
  const fields = [
    {
      name: "Wallet",
      value: embedWalletLink(metadata.network, walletId, username),
      inline: true,
    },
    {
      name: `Token${loadedNfts.length > 1 ? "s" : ""}`,
      value: `${embedTokenLink(
        metadata.network,
        loadedNfts[0].nft.tokenId,
        tokenResponse?.name,
        tokenResponse?.symbol
      )} # ${loadedNfts
        .map((n) => embedNftLink(metadata.network, loadedNfts[0].nft.tokenId, n.nft.serialNumber))
        .join(", ")}`,
      inline: true,
    },
    ...(rankField ? [rankField] : []),
  ];

  const { walletWhitelist, remainingNfts } = additionalDetails;
  if (walletWhitelist) {
    fields.push({
      name: "WL Balance",
      value: `${walletWhitelist.remaining} / ${walletWhitelist.total}`,
    });
  }
  if (remainingNfts) {
    fields.push({
      name: remainingNfts.estimated ? "Estimated Remaining" : "Remaining Supply",
      value: `${remainingNfts.remaining} / ${remainingNfts.total}`,
    });
  }

  const nftWithImages = loadedNfts.filter((n) => n.ipfsMetadata.image);
  const embeds: DiscordEmbed[] = [
    {
      ...embedDefaults,
      title: mintOptions.notificationTitle,
      fields,
      image: toImageEmbed(nftWithImages[0], mintOptions),
    },
    ...nftWithImages.slice(1, 4).map((loadedNft) => ({
      ...embedDefaults,
      title: mintOptions.notificationTitle,
      image: toImageEmbed(loadedNft, mintOptions),
    })),
  ];
  const response = await sendDiscordWebhook(
    {
      username: mintOptions.notificationUsername,
      avatar_url: mintOptions.notificationAvatarUrl,
      embeds,
    },
    webhookUrls
  );
  if (!response.ok) {
    logger.error(
      {
        embeds,
        response: await response.text(),
      },
      `Failing sending webhook to discord for rule: ${metadata.rule.id}.`
    );
  }
  return mapResponse(response);
};
