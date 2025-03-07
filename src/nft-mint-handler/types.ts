import {
  SentinelContentTokenMint,
  SentinelContentTokenTransfer,
  SentinelContentTransaction,
  SentinelMetadata,
} from "../lib/lworks-streams/types";
import { LambdaProxyResult } from "../lib/proxy-wrapper/types";
import { DiscordBaseBotOptions } from "../discord/types";
import { MirrorToken } from "../mirror-client";
import { StandardResponse } from "../responses";
import { NftLoadedMetadata } from "../types";

export type MintPayload = SentinelContentTokenTransfer | SentinelContentTokenMint;

export type CommonMintOptions = {
  webhookUrls: string;
  ipfsGateways?: string;
  whitelistTokens?: string;
  treasuryOverride?: string;
};

export type DiscordMintOptions = DiscordBaseBotOptions & CommonMintOptions;

type MintEventOutputMessage = {
  message: string;
};

export type MintEventOutput = LambdaProxyResult<MintEventOutputMessage>;

export type WalletWhitelistDetails = {
  remaining: number;
  total: number;
};

export type TreasuryRemainingNfts = {
  remaining: number;
  total: number;
  estimated: boolean;
};

export type AdditionMintDetails = Partial<{
  remainingNfts: TreasuryRemainingNfts;
  walletWhitelist: WalletWhitelistDetails;
}>;

export type MintSendStrategy = (params: {
  transaction: SentinelContentTransaction;
  options: CommonMintOptions;
  metadata: SentinelMetadata;
  loadedNfts: NftLoadedMetadata[];
  additionalDetails: AdditionMintDetails;
  tokenResponse: MirrorToken | undefined;
}) => Promise<StandardResponse>;
