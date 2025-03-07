import fetch from "node-fetch";

import { createLogger } from "./lib/logger";
import { getLambdaContext } from "./lib/lambda-global";
import { NftLoadedMetadata, NftRepresentation } from "./types";

const logger = createLogger("ipfs-client");

const defaultNftSupportedGateway = "https://ipfs.io/ipfs/";

let cachedGateway: { requestId: string; gateway: string } | undefined;
function getCachedGateway(ipfsGatewayOverride?: string) {
  const requestId = getLambdaContext().awsRequestId;
  if (!cachedGateway || cachedGateway.requestId !== requestId) {
    cachedGateway = {
      requestId,
      gateway: ipfsGatewayOverride || defaultNftSupportedGateway,
    };
  }
  return cachedGateway.gateway;
}

export function remapIpfs(url: string, ipfsGatewayOverrides?: string) {
  return url.replace("ipfs://", getCachedGateway(ipfsGatewayOverrides));
}

export async function loadIpfsMetadata<T extends NftRepresentation>(
  nfts: T[],
  ipfsGatewayOverrides?: string,
  timeRemainingTimeout = 2000
): Promise<NftLoadedMetadata<T>[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, getLambdaContext().getRemainingTimeInMillis() - timeRemainingTimeout);

  try {
    const loadedNfts = await Promise.all(
      nfts.map(async (nft) => {
        const noMetadata: NftLoadedMetadata<T> = {
          nft,
          ipfsMetadata: {},
        };
        const metadataUrl = remapIpfs(
          Buffer.from(nft.metadata, "base64").toString("ascii"),
          ipfsGatewayOverrides
        );
        if (!metadataUrl) {
          logger.info(
            `Failed to find base64 encoded metadata in nft. ${nft.tokenId} #${nft.serialNumber}. ${nft.metadata}`
          );
          return noMetadata;
        }
        logger.debug(`Loading metadata: ${metadataUrl}`);
        const response = await fetch(metadataUrl, {
          headers: { Accept: "application/json" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signal: controller.signal as any,
        });
        if (response.ok) {
          return {
            ...noMetadata,
            ipfsMetadata: (await response.json()) as unknown as { image?: string },
          };
        }
        logger.warn(
          { gateway: cachedGateway?.gateway },
          `Received ${response.status} from ipfs ${metadataUrl}: ${await response.text()}`
        );
        return noMetadata;
      })
    );
    logger.debug(
      {
        nftMetadata: loadedNfts.map((n) => ({
          tokenId: n.nft.tokenId,
          serialNumber: n.nft.serialNumber,
          ipfsMetadata: n.ipfsMetadata,
        })),
      },
      "Loaded nft metadata from ipfs"
    );
    return loadedNfts;
  } catch (e) {
    logger.warn(
      {
        error: e,
        gateway: cachedGateway?.gateway,
        timeRemaining: getLambdaContext().getRemainingTimeInMillis(),
      },
      "Failed to load ipfs metadata in time"
    );
    return nfts.map((nft) => ({ nft, ipfsMetadata: {} }));
  } finally {
    clearTimeout(timeout);
  }
}
