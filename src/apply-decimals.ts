export function applyDecimals(amount: number, decimals: number, amountFactor = 1) {
  return (amountFactor * amount * 10 ** (-1 * decimals)).toFixed(decimals);
}
