import { embedLink } from "../discord/discord-links";
import { DiscordField } from "../discord/types";
import { getHangryRebelRank } from "../hangry/get-hangry-rebel-rank";
import { isRebelToken } from "../hangry/is-boon-token";

export const getNftRank = ({
  tokenId,
  serialNumber,
}: {
  tokenId: string;
  serialNumber: number;
}): { order: number; href: string } | null => {
  if (isRebelToken(tokenId)) {
    return {
      order: getHangryRebelRank(serialNumber),
      href: `https://nftier.tech/hedera/hangry-rebels/${serialNumber}`,
    };
  }
  return null;
};

export const getRankField = (
  nft: { tokenId: string; serialNumber: number },
  inline = true
): DiscordField | null => {
  const rank = getNftRank(nft);
  if (rank) {
    return {
      name: "Rank",
      value: embedLink(rank.order, rank.href),
      inline,
    };
  }
  return null;
};
