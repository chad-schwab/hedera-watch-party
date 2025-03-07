import fetch, { Response } from "node-fetch";
import retry from "async-retry";

import { createLogger } from "../lib/logger";

import { DiscordWebhookPayload } from "./types";

const logger = createLogger("discord-client");

export async function sendDiscordWebhook(
  webhook: DiscordWebhookPayload,
  webhookUrls: string[] | string
): Promise<Response> {
  const webhookUrlArray = Array.isArray(webhookUrls) ? webhookUrls : webhookUrls.split(",");
  const webhookUrl: string =
    webhookUrlArray.length > 1
      ? webhookUrlArray[Math.floor(Math.random() * 100) % webhookUrlArray.length]
      : webhookUrlArray[0];
  return retry(
    async () => {
      const response = await fetch(webhookUrl, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify(webhook),
      });
      if (response.status >= 500) {
        throw new Error(`Received ${response.status} from discord`);
      }
      return response;
    },
    {
      retries: 2,
      maxTimeout: 2000,
      onRetry(_, attempt) {
        logger.warn(`Discord webhook failed on attempt ${attempt}`);
      },
    }
  );
}
