/**
 * Sum approved credit_request limits for the active credit line.
 * When `creditEnabledAt` is set (facility on), only rows touched at or after that
 * instant count — so lock → unlock starts the line at 0 used / full remaining.
 * When `creditEnabledAt` is null, all approved rows count (legacy / staff views).
 */
export async function sumApprovedCreditLimitSince(
  query: (sql: string, params?: unknown[]) => Promise<unknown>,
  clubId: string,
  playerId: string,
  creditEnabledAt: Date | string | null | undefined,
): Promise<number> {
  const since =
    creditEnabledAt == null || creditEnabledAt === undefined
      ? null
      : creditEnabledAt instanceof Date
        ? creditEnabledAt.toISOString()
        : new Date(String(creditEnabledAt)).toISOString();

  const rows = (await query(
    `SELECT COALESCE(SUM(credit_limit), 0)::numeric as total
     FROM credit_requests
     WHERE club_id = $1 AND player_id = $2 AND status = 'Approved'
       AND ($3::timestamptz IS NULL OR updated_at >= $3::timestamptz)`,
    [clubId, String(playerId).trim(), since],
  )) as Array<{ total: string | number }>;

  return Number(rows?.[0]?.total ?? 0);
}

/**
 * Wallet balance can go negative when the player is drawing on the credit line.
 * While it is negative, approved-request totals reduce how much line remains.
 * Once the wallet is no longer negative (debt cleared), the line is treated as
 * fully available again for seating and balance APIs — not stuck at old sums.
 */
export function creditUsedForAvailability(
  sumApprovedCappedToLimit: number,
  walletBalance: number,
): number {
  if (walletBalance >= 0) return 0;
  return sumApprovedCappedToLimit;
}

/** Same numbers as player portal: used (red) + on line + remaining = total limit. */
export type CreditFacilityBreakdown = {
  /** Wallet-shortfall portion consuming the credit line (shown as red "used" in UI). */
  creditRepaidViaWallet: number;
  /** Credit already drawn onto the table / outstanding in ledger (Credit txns - Debit txns). */
  effectiveCreditOnLine: number;
  /** Total limit spoken for = used + on line. */
  consumedAgainstLimit: number;
  /** Free headroom = limit - consumed. This is what can be drawn on next table join. */
  availableCredit: number;
};

/**
 * Canonical credit breakdown.
 *
 * Rules (match exactly what player app shows):
 *   effectiveCreditOnLine  = max(0, creditLedgerNet)       ← what's actually drawn in ledger
 *   creditRepaidViaWallet  = max(0, -wallet) capped at limit  ← negative wallet consuming line
 *   consumedAgainstLimit   = min(limit, creditRepaidViaWallet + effectiveCreditOnLine)
 *   availableCredit        = limit - consumedAgainstLimit   ← REMAINING — only this draws on join
 *
 * The key invariant:
 *   - On table join   → draw from availableCredit only (remaining)
 *   - After repayment → availableCredit rises; effectiveCreditOnLine stays the same
 *   - Club buy-in repayment frees "remaining" via Debit rows reducing wallet debt;
 *     effectiveCreditOnLine (ledger net) is unchanged until actual buyout Debit.
 */
export function computeCreditFacilityBreakdown(params: {
  creditLimit: number;
  creditUsedFromApprovals: number;
  creditLedgerNet: number;
  availableBalance: number;
  creditEnabled: boolean;
}): CreditFacilityBreakdown {
  const creditLimitNum = Math.max(0, Number(params.creditLimit) || 0);
  if (!params.creditEnabled || creditLimitNum <= 0) {
    return {
      creditRepaidViaWallet: 0,
      effectiveCreditOnLine: 0,
      consumedAgainstLimit: 0,
      availableCredit: 0,
    };
  }

  const L = Number(params.creditLedgerNet) || 0;
  const w = Number(params.availableBalance);

  // Credit on line = what's positively drawn in the ledger (Credit txns net of Debit txns).
  // This NEVER changes just because the wallet is negative — that's "used" not "on line".
  const effectiveCreditOnLine = Math.min(Math.max(0, L), creditLimitNum);

  // Credit used (red) = how much of the limit is being consumed via negative wallet.
  // This only applies when ledger net has been zeroed (buyout settled) but wallet is still negative.
  const walletShortfall = Math.max(0, -w);
  // Only count as "used via wallet" if there's no positive ledger (i.e. after full settlement).
  const creditRepaidViaWallet = L <= 0
    ? Math.min(creditLimitNum, walletShortfall)
    : 0;

  const consumedAgainstLimit = Math.min(
    creditLimitNum,
    effectiveCreditOnLine + creditRepaidViaWallet,
  );
  const availableCredit = Math.max(0, creditLimitNum - consumedAgainstLimit);

  return {
    creditRepaidViaWallet,
    effectiveCreditOnLine,
    consumedAgainstLimit,
    availableCredit,
  };
}
