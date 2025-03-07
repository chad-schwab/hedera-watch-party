import { DiscordBaseBotOptions } from "./types";

const lworksAvatarUrl =
  "https://cdn.discordapp.com/attachments/1014675105604980897/1014890107616104489/628e81659d36be617258642c_Logo_Mark_-_Light.png";
export const DefaultBotOptions: DiscordBaseBotOptions = {
  embedColor: "414198",
  notificationAvatarUrl: lworksAvatarUrl,
  notificationUsername: "LWorks Watch Party",
  notificationTitle: "A new transaction hit the ledger!",
  footerText: "lworks.io",
  footerIconUrl: lworksAvatarUrl,
};

export const TokenMintRuleType = 1;
export const TokenTransferRuleType = 3;
