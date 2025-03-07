import { Network } from "../types";
import { BaseRequest, LambdaEvent } from "../proxy-wrapper/types";

export type SentinelRequest<Content, Options = Record<string, string>> = BaseRequest &
  SentinelOptions<Options> &
  SentinelPayload<Content>;

export type BatchedSentinelRequest<Content, Options = Record<string, string>> = BaseRequest &
  SentinelOptions<Options> &
  BatchedSentinelPayload<Content>;

export type VersatileSentinelRequest<Content, Options = Record<string, string>> =
  | SentinelRequest<Content, Options>
  | BatchedSentinelRequest<Content, Options>;

export type SentinelRequestParserOptions = Partial<{
  headerPrefixes: Array<string>;
  parser: typeof JSON.parse;
}>;

export type SentinelRequestParser<
  Content,
  Options = Record<string, string>,
  Output = SentinelRequest<Content, Options>
> = (event: LambdaEvent) => Output;

export type SentinelOptions<Options> = {
  options: Options;
};

export type SentinelPayload<C> = {
  content: C;
  metadata: SentinelMetadata;
};

export type BatchedSentinelPayload<C> = {
  startingEventId?: string;
  items: SentinelPayload<C>[];
};

// export type Network = "mainnet" | "testnet";

export type SentinelMetadata = {
  rule: SentinelMetadataRule;
  network: Network;
  sentinelTimestamp: string;
  timeSinceConsensus: string;
};

export type SentinelMetadataRule = {
  id: string;
  name: string;
  type: number;
  predicateValue: string;
  chain?: string;
};

// BASE
export type SentinelContentBaseFungibleTokenTransfer = {
  account: string;
  tokenId: string;
  amount: number;
};
export type SentinelContentBaseNftTransfer = {
  receiverAccountId: string;
  senderAccountId: string;
  serialNumber: number;
  tokenId: string;
};

// HCS SUBMIT MESSAGE
export type SentinelContentHCSSubmitMessage = {
  topicId: string;
  consensusTimestamp: string;
  message: string;
  payerAccountId: string;
  runningHash: string;
  runningHashVersion: number;
  sequenceNumber: number;
  chunkInfo: SentinelContentHCSSubmitMessageChunkInfo;
};
export type SentinelContentHCSSubmitMessageChunkInfo = {
  number: number;
  total: number;
  initialTransactionId: SentinelContentHCSSubmitMessageInitialTransactionId;
};
export type SentinelContentHCSSubmitMessageInitialTransactionId = {
  accountId: string;
  nonce: number;
  scheduled: boolean;
  transactionValidStart: string;
};

// TOKEN MINT
export type SentinelContentTokenMint = {
  tokens?: SentinelContentTokenMintFungibleToken[];
  nfts?: SentinelContentTokenMintNftToken[];
  transaction: SentinelContentTransaction;
};

export type SentinelContentTokenMintFungibleToken = SentinelContentBaseFungibleTokenTransfer;
export type SentinelContentTokenMintNftToken = SentinelContentBaseNftTransfer & {
  metadata: string;
};

// TRANSACTION
export type SentinelContentTransaction = {
  consensusTimestamp: string;
  chargedTxFee: number;
  maxFee: number;
  memo: string;
  transfers: SentinelContentTransactionTransfer[];
  tokenTransfers: SentinelContentTransactionFungibleTransfer[];
  nftTransfers: SentinelContentTransactionNftTransfer[];
  node?: string;
  nonce: number;
  parentConsensusTimestamp?: string;
  status: string;
  scheduled: boolean;
  transactionHash: string;
  transactionId: string;
  transactionType: string;
  payerAccountId: string;
  validDurationSeconds?: number;
  validStartTimestamp: string;
};
export type SentinelContentTransactionTransfer = {
  account: string;
  amount: number;
  isApproval: boolean;
};

export type SentinelContentTransactionFungibleTransfer =
  SentinelContentBaseFungibleTokenTransfer & {
    isApproval: boolean;
  };
export type SentinelContentTransactionNftTransfer = SentinelContentBaseNftTransfer & {
  isApproval: boolean;
};

// TOKEN BURN

export type SentinelContentTokenBurn = {
  tokens?: SentinelContentTokenBurnFungibleToken[];
  nfts?: SentinelContentTokenBurnNftToken[];
  transaction: SentinelContentTransaction;
};

export type SentinelContentTokenBurnFungibleToken = SentinelContentBaseFungibleTokenTransfer;
export type SentinelContentTokenBurnNftToken = SentinelContentBaseNftTransfer;

// TOKEN TRANSFER
export type SentinelContentTokenTransfer = {
  tokens?: SentinelContentTransactionFungibleTransfer[];
  nfts?: SentinelContentTransactionNftTransfer[];
  transaction: SentinelContentTransaction;
};

// Transaction Model encompasses many different types of transaction. Used for Account activity.
export type SentinelContentTransactionModelTransfers = {
  crypto: SentinelContentTransactionTransfer[];
  tokens: SentinelContentTransactionFungibleTransfer[];
  nfts: SentinelContentTransactionNftTransfer[];
};

export type SentinelContentTransactionModelAllowances = {
  crypto: { owner: string; spender: string; amount: number }[];
  tokens: { owner: string; spender: string; tokenId: string; amount: number }[];
  nfts: {
    owner: string;
    spender: string;
    tokenId: string;
    serialNumbers: number[];
    approvedForAll?: boolean;
    delegatingSpender?: string;
  }[];
  nftDeletes: { owner: string; tokenId: string; serialNumbers: number[] }[];
};

export type SentinelContentTransactionModelContractCall = {
  contractId: string;
  gas: number;
  amount: number;
  functionParameters: string;
  gasUsed: number;
  bloom: string;
  contractCallResult: string;
  errorMessage: string;
  evmAddress?: string;
  senderId?: string;
  logInfo: {
    contractId: string;
    bloom: string;
    data: string;
    topic: string[];
  }[];
};

export type SentinelContentTransactionModelMetadata = {
  consensusTimestamp: string;
  chargedTxFee: number;
  maxFee: number;
  memo: string;
  node: string;
  nonce: number;
  parentConsensusTimestamp?: string;
  scheduled: boolean;
  transactionHash: string;
  transactionId: string;
  transactionType: string;
  payerAccountId: string;
  validDurationSeconds: number;
  validStartTimestamp: string;
};

export type SentinelContentTransactionModelReceipt = {
  status: string;
  exchangeRate?: {
    nextRate: {
      centEquiv: number;
      hbarEquiv: number;
      expirationTime: number;
    };
    currentRate: {
      centEquiv: number;
      hbarEquiv: number;
      expirationTime: number;
    };
  };
  accountId?: string;
  fileId?: string;
  contractId?: string;
  scheduledTransactionId?: string;
  scheduleID?: string;
  tokenId?: string;
  serialNumbers?: number[];
  newTotalSupply?: number;
  topicId?: string;
  topicSequenceNumber?: number;
  topicRunningHash?: string;
  topicRunningHashVersion?: number;
};

export type SentinelContentTransactionModel = {
  metadata: SentinelContentTransactionModelMetadata;
  receipt: SentinelContentTransactionModelReceipt;
  transfers: SentinelContentTransactionModelTransfers;
  allowances?: SentinelContentTransactionModelAllowances;
  contractCall?: SentinelContentTransactionModelContractCall;
};
