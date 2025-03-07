import {
  SentinelContentTransactionFungibleTransfer,
  SentinelContentTransactionNftTransfer,
  SentinelContentTransactionTransfer,
} from "../lib/lworks-streams/types";

import { isTrade } from "./is-trade";

describe("isTrade", () => {
  let tradeOptions: Parameters<typeof isTrade>[0];
  let transaction: {
    transfers: SentinelContentTransactionTransfer[];
    tokenTransfers: SentinelContentTransactionFungibleTransfer[];
    nftTransfers: SentinelContentTransactionNftTransfer[];
  };
  let allReceiverWallets: Set<string>;

  const receiverWallet = "wallet 1";
  const hbarThreshold = 20;
  beforeEach(() => {
    tradeOptions = {
      hbarThreshold: `${hbarThreshold}`,
      tokenPayments: "false",
      nftPayments: "false",
    };
    transaction = {
      transfers: [],
      tokenTransfers: [],
      nftTransfers: [],
    };
    allReceiverWallets = new Set([receiverWallet]);
  });
  it("should return true when no hbarThreshold is zero", () => {
    tradeOptions.hbarThreshold = "0";
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(true);
  });
  it("should return false when no hbar transactions from wallet", () => {
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(false);
  });
  it("should return false when no debit transactions from wallet over threshold", () => {
    transaction.transfers.push({
      account: receiverWallet,
      amount: -hbarThreshold + 0.01,
      isApproval: false,
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(false);
  });

  it("should return true when debit transactions from wallet equals threshold", () => {
    transaction.transfers.push({
      account: receiverWallet,
      amount: -hbarThreshold * 100000000,
      isApproval: false,
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(true);
  });

  it("should return true when debit transactions from wallet less than threshold", () => {
    transaction.transfers.push({
      account: receiverWallet,
      amount: (-hbarThreshold - 0.01) * 100000000,
      isApproval: false,
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(true);
  });

  it("should return false when no debit transactions from wallet", () => {
    transaction.transfers.push({
      account: "wallet 2",
      amount: -hbarThreshold - 0.01,
      isApproval: false,
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(false);
  });

  it("should return false when tradeOptions.tokenTransfers = true but no token debit", () => {
    tradeOptions.tokenPayments = "true";
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(false);
  });

  it("should return true when tradeOptions.tokenTransfers = true with token debit", () => {
    tradeOptions.tokenPayments = "true";
    transaction.tokenTransfers.push({
      amount: -0.01,
      account: receiverWallet,
      isApproval: false,
      tokenId: "who cares",
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(true);
  });

  it("should return false when tradeOptions.tokenTransfers = false with token debit", () => {
    tradeOptions.tokenPayments = "false";
    transaction.tokenTransfers.push({
      amount: -0.01,
      account: receiverWallet,
      isApproval: false,
      tokenId: "who cares",
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(false);
  });

  it("should return false when tradeOptions.tokenTransfers = true with token debit from receiver wallet", () => {
    tradeOptions.tokenPayments = "true";
    transaction.tokenTransfers.push({
      amount: -0.01,
      account: "wallet 2",
      isApproval: false,
      tokenId: "who cares",
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(false);
  });

  it("should return false when tradeOptions.nftTransfers = true but no nft debit", () => {
    tradeOptions.nftPayments = "true";
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(false);
  });

  it("should return true when tradeOptions.nftTransfers = true with nft debit", () => {
    tradeOptions.nftPayments = "true";
    transaction.nftTransfers.push({
      senderAccountId: receiverWallet,
      receiverAccountId: "wallet 2",
      serialNumber: 2,
      isApproval: false,
      tokenId: "who cares",
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(true);
  });

  it("should return false when tradeOptions.nftTransfers = false with nft debit", () => {
    tradeOptions.nftPayments = "false";
    transaction.nftTransfers.push({
      senderAccountId: receiverWallet,
      receiverAccountId: "wallet 2",
      serialNumber: 2,
      isApproval: false,
      tokenId: "who cares",
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(false);
  });

  it("should return false when tradeOptions.nftTransfers = true with nft debit from receiver wallet", () => {
    tradeOptions.nftPayments = "true";
    transaction.nftTransfers.push({
      senderAccountId: "wallet 3",
      receiverAccountId: receiverWallet,
      serialNumber: 2,
      isApproval: false,
      tokenId: "who cares",
    });
    expect(isTrade(tradeOptions, transaction, allReceiverWallets)).toBe(false);
  });
});
