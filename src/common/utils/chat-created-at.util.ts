import type { ValueTransformer } from 'typeorm';

/**
 * Postgres `timestamp without time zone` often stores UTC wall time; pg may hand it to the app
 * in a way that parses as *local* in Node. Force UTC by appending Z when there is no offset.
 */
export const utcNaiveTimestampTransformer: ValueTransformer = {
  to: (value: Date) => value,
  from: (value: unknown) => {
    if (value == null || value === '') return value as Date | null;
    if (value instanceof Date) return value;
    const s = String(value).trim();
    if (
      /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s) &&
      !/[zZ]/.test(s) &&
      !/[+-]\d{2}:?\d{2}$/.test(s)
    ) {
      const norm = s.includes('T') ? `${s}Z` : `${s.replace(' ', 'T')}Z`;
      return new Date(norm);
    }
    return new Date(s);
  },
};

/** Parse chat timestamps as UTC instants (never browser/server “local” for naive strings). */
export function chatCreatedAtToUtcMs(value: unknown): number {
  if (value == null || value === '') return Date.now();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? Date.now() : t;
  }
  let s = String(value).trim();
  if (/[+-]\d{2}:?\d{2}$/.test(s) && !/Z$/i.test(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? Date.now() : t;
  }
  if (/Z$/i.test(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? Date.now() : t;
  }
  const re = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(\.\d+)?/;
  const m = s.match(re);
  if (m) {
    const frac = m[7] ? parseFloat(m[7]) : 0;
    const msInSecond = Math.min(999, Math.round(frac * 1000));
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], msInSecond);
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? Date.now() : t;
}

export function chatCreatedAtToIsoUtc(value: unknown): string {
  return new Date(chatCreatedAtToUtcMs(value)).toISOString();
}
