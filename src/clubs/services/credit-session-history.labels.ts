import { TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER } from '../entities/financial-transaction.entity';

/**
 * Staff-facing labels so session history is readable (not just raw type + notes).
 */
export function summarizeCreditHistoryRow(
  type: string,
  notes: string | null,
): { eventLabel: string; amountNote: string } {
  const raw = (type || '').trim();
  const t = raw.toUpperCase().replace(/\s+/g, ' ');
  const n = (notes || '').toLowerCase();
  const hasPair = (notes || '').includes(TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER);

  if (t === 'CREDIT') {
    if (n.includes('applied on table join') || n.includes('credit approved while seated')) {
      return {
        eventLabel: 'Credit used on table',
        amountNote: 'This amount was drawn from the credit line onto the table stack.',
      };
    }
    if (n.includes('tournament')) {
      return {
        eventLabel: 'Credit used (tournament)',
        amountNote: 'Credit line applied toward tournament entry or settlement.',
      };
    }
    return {
      eventLabel: 'Credit line draw',
      amountNote: 'Chips / limit recorded on the credit ledger.',
    };
  }

  if (t === 'DEBIT') {
    if (n.includes('credit line repayment')) {
      return {
        eventLabel: 'Credit settlement — club buy-in',
        amountNote:
          'Part of cashier buy-in used to clear negative wallet and free credit remaining (not new chips on table).',
      };
    }
    if (
      n.includes('credit settlement') ||
      n.includes('table exit') ||
      n.includes('buy-out') ||
      n.includes('table close') ||
      n.includes('staff buy-out')
    ) {
      return {
        eventLabel: 'Credit settlement — leaving table',
        amountNote:
          'Table exit: this amount was applied to close the credit line for that session (wallet may show negative if cash-out was short).',
      };
    }
    return {
      eventLabel: 'Debit (credit ledger)',
      amountNote: 'Repayment or adjustment against the credit ledger.',
    };
  }

  if (t === 'CLUB BUY IN') {
    return {
      eventLabel: 'Club buy-in (cash to wallet)',
      amountNote:
        'Player paid this at the counter — wallet goes up. If they owed the line, a separate Debit row shows how much went to credit settlement.',
    };
  }

  if (t === 'TABLE BUY OUT') {
    return {
      eventLabel: 'Table cash-out',
      amountNote: 'Chips returned from table to wallet; credit settlement may follow on another row.',
    };
  }

  if (t === 'TABLE BUY IN' && hasPair) {
    return {
      eventLabel: 'Table buy-in (credit mirror)',
      amountNote: 'Pairs with the Credit row — same rupees; wallet not debited again.',
    };
  }

  return {
    eventLabel: raw || 'Transaction',
    amountNote: 'See notes for details.',
  };
}
