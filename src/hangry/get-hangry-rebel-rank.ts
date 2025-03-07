import hangryRebelRanks from "./hangry-rebel-ranks.json";

export const getHangryRebelRank = (serialNum: number) => {
  return (hangryRebelRanks as Record<string, number>)[String(serialNum)];
};
