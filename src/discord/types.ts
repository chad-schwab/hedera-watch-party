export type DiscordWebhookPayload = {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
};

export type DiscordBaseBotOptions = {
  embedColor: string;
  notificationAvatarUrl: string;
  notificationUsername: string;
  notificationTitle: string;
  footerText: string;
  footerIconUrl: string;
};

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string; // ISO8601;
  color?: number;
  footer?: DiscordEmbedFooter;
  image?: DiscordEmbedImage;
  thumbnail?: DiscordEmbedImage;
  // video?:	embed;
  provider?: DiscordEmbedProvider;
  author?: DiscordEmbedAuthor;
  fields?: DiscordField[];
};

export type DiscordEmbedImage = {
  url: string;
};

export type DiscordEmbedFooter = {
  text: string;
  icon_url?: string;
};

export type DiscordEmbedProvider = {
  name?: string;
  url?: string;
};

export type DiscordEmbedAuthor = {
  name: string;
  url?: string;
  icon_url?: string;
};

export type DiscordField = {
  name: string;
  value: string | number | boolean;
  inline?: boolean;
};
