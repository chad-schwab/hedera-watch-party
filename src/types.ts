export type NftRepresentation = {
  ownerId: string;
  tokenId: string;
  serialNumber: number;
  metadata: string;
};
export type NftLoadedMetadata<T extends NftRepresentation = NftRepresentation> = Record<
  string,
  unknown
> & {
  nft: T;
  ipfsMetadata: {
    image?: string;
  };
};
