/**
 * Table staff session clock + per-player play seconds (pause/resume).
 * Staff timer uses table.notes (Session Started, Paused Elapsed).
 * Per-player seconds use optional PausedPlayers / PlayerCarry snapshots (tournament-style carry).
 * Baselines apply only to the same physical stint: if seatedAt is after pause / segment start,
 * the player re-sat (e.g. buy-out and rejoin) and must not inherit an old snapshot for their id.
 */

export type ParsedTableSessionClock = {
  sessionStartedAt: Date | null;
  pausedCarrySeconds: number;
  staffPaused: boolean;
  pausedAt: Date | null;
  segmentStart: Date | null;
  /** Per-player frozen seconds at pause, or baseline at last resume */
  playerBaselineSeconds: Record<string, number>;
};

function parsePlayerBaselineMap(notes: string, preferCarryWhenSession: boolean): Record<string, number> {
  const n = notes || '';
  let blob = '';
  if (preferCarryWhenSession) {
    blob = n.match(/PlayerCarry:([^|]+)/i)?.[1]?.trim() || '';
  }
  if (!blob) {
    blob = n.match(/PausedPlayers:([^|]+)/i)?.[1]?.trim() || '';
  }
  const out: Record<string, number> = {};
  if (!blob) return out;
  for (const part of blob.split(',')) {
    const m = part.trim().match(/^([0-9a-f-]{36})=(\d+)$/i);
    if (!m) continue;
    const sec = parseInt(m[2], 10);
    if (Number.isFinite(sec) && sec >= 0) out[m[1].toLowerCase()] = sec;
  }
  return out;
}

export function parseTableSessionNotes(notes: string | null | undefined): ParsedTableSessionClock {
  const n = notes || '';
  const startMatch = n.match(/Session Started:\s*([^|]+)/i);
  const pausedMatch = n.match(/Paused Elapsed:\s*(\d+)/i);
  const pausedCarrySeconds = pausedMatch ? parseInt(pausedMatch[1], 10) : 0;
  const carry = Number.isFinite(pausedCarrySeconds) && pausedCarrySeconds >= 0 ? pausedCarrySeconds : 0;

  if (startMatch?.[1]) {
    const d = new Date(startMatch[1].trim());
    if (!Number.isNaN(d.getTime())) {
      return {
        sessionStartedAt: d,
        pausedCarrySeconds: carry,
        staffPaused: false,
        pausedAt: null,
        segmentStart: null,
        playerBaselineSeconds: parsePlayerBaselineMap(n, true),
      };
    }
  }

  const staffPaused = /Paused Elapsed:\s*\d+/i.test(n) && !/Session Started:/i.test(n);
  if (staffPaused && pausedMatch) {
    const pausedAtMatch = n.match(/Paused At:\s*([^|]+)/i);
    const segMatch = n.match(/Segment Start:\s*([^|]+)/i);
    const pausedAt = pausedAtMatch?.[1] ? new Date(pausedAtMatch[1].trim()) : null;
    const segmentStart = segMatch?.[1] ? new Date(segMatch[1].trim()) : null;
    const validPausedAt = pausedAt && !Number.isNaN(pausedAt.getTime()) ? pausedAt : null;
    const validSeg = segmentStart && !Number.isNaN(segmentStart.getTime()) ? segmentStart : null;
    return {
      sessionStartedAt: null,
      pausedCarrySeconds: carry,
      staffPaused: true,
      pausedAt: validPausedAt,
      segmentStart: validSeg,
      playerBaselineSeconds: parsePlayerBaselineMap(n, false),
    };
  }

  return {
    sessionStartedAt: null,
    pausedCarrySeconds: 0,
    staffPaused: false,
    pausedAt: null,
    segmentStart: null,
    playerBaselineSeconds: {},
  };
}

export function computePlayerPlaySeconds(
  seatedAt: Date,
  clock: ParsedTableSessionClock,
  now: Date,
  playerId?: string | null,
): number {
  const seatMs = seatedAt.getTime();
  const pid = playerId ? String(playerId).toLowerCase() : '';

  if (clock.staffPaused) {
    const pausedAtMs = clock.pausedAt?.getTime();
    if (
      pid &&
      clock.playerBaselineSeconds[pid] !== undefined &&
      pausedAtMs != null &&
      seatMs <= pausedAtMs
    ) {
      return Math.max(0, clock.playerBaselineSeconds[pid]);
    }
    if (clock.pausedAt && clock.segmentStart) {
      const anchorMs = Math.max(seatMs, clock.segmentStart.getTime());
      return Math.max(0, Math.floor((clock.pausedAt.getTime() - anchorMs) / 1000));
    }
    return Math.max(0, clock.pausedCarrySeconds || 0);
  }

  if (clock.sessionStartedAt) {
    const segMs = clock.sessionStartedAt.getTime();
    if (
      pid &&
      clock.playerBaselineSeconds[pid] !== undefined &&
      seatMs <= segMs
    ) {
      return Math.max(
        0,
        clock.playerBaselineSeconds[pid] + Math.floor((now.getTime() - segMs) / 1000),
      );
    }
    const anchorMs = Math.max(seatMs, segMs);
    const running = Math.floor((now.getTime() - anchorMs) / 1000);
    const car = clock.pausedCarrySeconds || 0;
    if (seatMs >= segMs) {
      return Math.max(0, running);
    }
    return Math.max(0, running + car);
  }

  return Math.max(0, Math.floor((now.getTime() - seatMs) / 1000));
}
