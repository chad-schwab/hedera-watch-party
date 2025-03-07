import retry from "async-retry";
import fetch from "node-fetch";

import { createLogger } from "./lib/logger";
import { Network } from "./lib/types";
import { NftRepresentation } from "./types";

const logger = createLogger("mirror-client");

function getMirrorBaseUrl(network: Network) {
  return network === "testnet"
    ? "https://testnet.mirrornode.hedera.com"
    : "https://mainnet-public.mirrornode.hedera.com";
}

function mapMirrorNft(mirrorNft: MirrorNft): NftRepresentation {
  return {
    ownerId: mirrorNft.account_id,
    tokenId: mirrorNft.token_id,
    serialNumber: mirrorNft.serial_number,
    metadata: mirrorNft.metadata,
  };
}

export function getRequest<T>(network: Network, path: string): Promise<T> {
  return retry(
    async (bail) => {
      const response = await fetch(
        `${getMirrorBaseUrl(network)}/${path.startsWith("/") ? path.slice(1) : path}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        return response.json() as unknown as T;
      }

      const e = new Error(`Received ${response.status} from mirror. ${await response.text()}`);
      if (response.status <= 500) {
        bail(e);
      }
      throw e;
    },
    {
      retries: 3,
      maxTimeout: 3000,
      onRetry(e, attempt) {
        logger.warn(`${e.message} on attempt ${attempt}`);
      },
    }
  );
}

export function safeGetRequest<T, V>(
  network: Network,
  path: string,
  defaultValue: V
): Promise<T | V> {
  return getRequest<T>(network, path).catch((e) => {
    logger.error(e, "Swallowing error from mirror");
    return defaultValue;
  });
}

export async function getNfts(
  network: Network,
  nftList: { tokenId: string; serialNumber: number }[]
): Promise<NftRepresentation[]> {
  const nfts = await Promise.all(
    nftList.map((n) =>
      getRequest<MirrorNft>(network, `api/v1/tokens/${n.tokenId}/nfts/${n.serialNumber}`)
    )
  )
    .catch((e) => {
      console.error(e, "Failed to load nfts");
      return [];
    })
    .then((n) => n.filter((n1) => n1));

  logger.trace({ nfts }, "Loaded nfts");
  return (nfts as MirrorNft[]).map(mapMirrorNft);
}

export async function getNft(network: Network, nft: { tokenId: string; serialNumber: number }) {
  return (await getNfts(network, [nft]))[0];
}

export async function getToken(
  network: Network,
  tokenId: string
): Promise<MirrorToken | undefined> {
  return safeGetRequest<MirrorToken, undefined>(network, `api/v1/tokens/${tokenId}`, undefined);
}

export async function getNftHolders(
  network: Network,
  tokenId: string
): Promise<NftRepresentation[]> {
  let nfts: NftRepresentation[] = [];
  let next: string | undefined;
  do {
    const response = await getRequest<TokensNftResponse>(
      network,
      next || `api/v1/tokens/${tokenId}/nfts?limit=100`
    );
    nfts = [...nfts, ...response.nfts.map(mapMirrorNft)];
    next = response.links?.next;
  } while (next);
  return nfts;
}

export async function getAccountNfts(
  network: Network,
  accountId: string,
  tokenId: string
): Promise<NftRepresentation[]> {
  let nfts: NftRepresentation[] = [];
  let next: string | undefined;
  do {
    const response = await getRequest<TokensNftResponse>(
      network,
      next || `api/v1/accounts/${accountId}/nfts?token.id=${tokenId}&limit=100`
    );
    nfts = [...nfts, ...response.nfts.map(mapMirrorNft)];
    next = response.links?.next;
  } while (next);
  return nfts;
}

export type MirrorToken = {
  token_id: string;
  name: string;
  symbol: string;
  initial_supply: number;
  max_supply: number;
  total_supply: number;
  supply_type: string;
  treasury_account_id: string;
  type: string;
  decimals: string | number; // bug in API. This should be a number but comes through as a string
};

export type MirrorNft = {
  account_id: string;
  token_id: string;
  serial_number: number;
  metadata: string;
};

export type TokensNftResponse = {
  nfts: MirrorNft[];
  links: {
    next?: string;
  };
};
