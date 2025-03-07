export const boonTokenId = "0.0.1350444";
export const rebelTokenId = "0.0.3837554";
export const testnetRebelTokenId = "0.0.4530143";
export const isBoonToken = (tokenId: string) => {
  return tokenId === boonTokenId;
};

export const isRebelToken = (tokenId: string) => {
  return tokenId === rebelTokenId || tokenId === testnetRebelTokenId;
};
