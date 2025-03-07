import { NftRepresentation } from "../types";

import { isBoonToken } from "./is-boon-token";
import rebelSerialIds from "./rebels.json";

const rebels = new Set(rebelSerialIds);
export const checkForRebel = (predicateValue: string, nfts: NftRepresentation[]) => {
  return (
    isBoonToken(predicateValue) &&
    nfts.find((n) => isBoonToken(n.tokenId) && rebels.has(n.serialNumber))
  );
};
