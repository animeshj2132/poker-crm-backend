/**
 * Minimum buy-in vs wallet + credit for waitlist / assign-seat.
 * Negative wallet does not count toward buy-in; only credit remaining can cover the minimum.
 */
export function playerMeetsTableMinBuyIn(
  walletBalance: number,
  availableCredit: number,
  minBuyIn: number,
): boolean {
  const min = Math.max(0, Number(minBuyIn) || 0);
  if (min <= 0) return true;
  const w = Number(walletBalance) || 0;
  const c = Math.max(0, Number(availableCredit) || 0);
  if (w < 0) return c >= min;
  return w + c >= min;
}
