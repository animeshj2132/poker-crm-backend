import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER } from '../entities/financial-transaction.entity';
import { summarizeCreditHistoryRow } from './credit-session-history.labels';

const WB_PAIR = TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER;

@Injectable()
export class CreditSessionHistoryService {
  constructor(private readonly dataSource: DataSource) {}

  async list(
    clubId: string,
    opts: { q?: string; from?: string; to?: string; page?: number; limit?: number },
  ): Promise<{
    items: Array<{
      id: string;
      playerId: string;
      playerName: string;
      playerFullName: string | null;
      email: string | null;
      tiltId: string | null;
      amount: string;
      type: string;
      notes: string | null;
      createdAt: Date;
      /** e.g. "Credit used on table", "Credit settlement — leaving table" */
      eventLabel: string;
      /** What this rupee amount represents in plain language */
      amountNote: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const limit = Math.min(Math.max(Number(opts.limit) || 10, 1), 50);
    const page = Math.max(Number(opts.page) || 1, 1);
    const offset = (page - 1) * limit;

    const typeFilter = `(
      UPPER(TRIM(ft.type)) IN ('CREDIT', 'DEBIT', 'CLUB BUY IN', 'TABLE BUY OUT')
      OR (UPPER(TRIM(ft.type)) = 'TABLE BUY IN' AND POSITION('${WB_PAIR}' IN COALESCE(ft.notes, '')) > 0)
    )`;

    const params: unknown[] = [clubId];
    let idx = 2;
    let where = `ft.club_id = $1 AND UPPER(ft.status) = 'COMPLETED' AND ${typeFilter}`;

    if (opts.from?.trim()) {
      where += ` AND ft.created_at >= $${idx}::timestamptz`;
      params.push(opts.from.trim());
      idx++;
    }
    if (opts.to?.trim()) {
      where += ` AND ft.created_at <= $${idx}::timestamptz`;
      params.push(opts.to.trim());
      idx++;
    }
    if (opts.q?.trim()) {
      const needle = `%${opts.q.trim()}%`;
      where += ` AND (
        p.name ILIKE $${idx}
        OR COALESCE(p.email, '') ILIKE $${idx}
        OR COALESCE(p.player_id, '') ILIKE $${idx}
      )`;
      params.push(needle);
      idx++;
    }

    const join = `
      FROM financial_transactions ft
      INNER JOIN players p ON p.club_id = ft.club_id AND p.id::text = ft.player_id::text
    `;

    const countRows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS c ${join} WHERE ${where}`,
      params,
    );
    const total = Number(countRows?.[0]?.c ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const listParams = [...params, limit, offset];
    const limitIdx = idx;
    const offsetIdx = idx + 1;
    const rows = await this.dataSource.query(
      `SELECT ft.id, ft.player_id AS "playerId", ft.player_name AS "playerName", ft.amount::text AS amount,
              ft.type, ft.notes, ft.created_at AS "createdAt",
              p.name AS "playerFullName", p.email AS email, p.player_id AS "tiltId"
       ${join}
       WHERE ${where}
       ORDER BY ft.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );

    return {
      items: (rows || []).map((r: Record<string, unknown>) => {
        const txType = String(r.type ?? '');
        const txNotes = r.notes != null ? String(r.notes) : null;
        const { eventLabel, amountNote } = summarizeCreditHistoryRow(txType, txNotes);
        return {
          id: String(r.id),
          playerId: String(r.playerId),
          playerName: String(r.playerName ?? ''),
          playerFullName: r.playerFullName != null ? String(r.playerFullName) : null,
          email: r.email != null ? String(r.email) : null,
          tiltId: r.tiltId != null ? String(r.tiltId) : null,
          amount: String(r.amount ?? '0'),
          type: txType,
          notes: txNotes,
          createdAt: r.createdAt as Date,
          eventLabel,
          amountNote,
        };
      }),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
