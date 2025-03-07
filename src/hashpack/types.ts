export type HashpackUser = {
  profilePicture: {
    tokenId: string | null;
    serial: number | null;
    thumbUrl: string | null;
  };
  theme: {
    tokenId: string;
    metadata: string;
    themeId: string;
  };
  username: {
    name: string;
    tokenId: string;
    serial: number;
  };
  _id: string;
  accountId: string;
  network: string;
  __v: number;
};
