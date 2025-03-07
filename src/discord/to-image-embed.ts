import { remapIpfs } from "../ipfs-client";
import { NftLoadedMetadata } from "../types";

import { DiscordEmbedImage } from "./types";

export function toImageEmbed(
  nftLoadedMetadata: NftLoadedMetadata,
  options: Partial<{ ipfsGateways: string }> = {}
): DiscordEmbedImage | undefined {
  if (nftLoadedMetadata.ipfsMetadata.image) {
    return {
      url: encodeURI(remapIpfs(nftLoadedMetadata.ipfsMetadata.image, options.ipfsGateways)),
    };
  }
  return undefined;
}
