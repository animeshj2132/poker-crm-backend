export function normalizeTiltId(input?: string | null): string | null {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized.length > 0 ? normalized : null;
}

export function getClubTiltPrefix(clubName?: string | null): string {
  const source = String(clubName || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim();
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const first = words[0][0] || 'C';
    const second = words[1][0] || 'L';
    return `${first}${second}`;
  }

  const compact = source.replace(/\s+/g, '');
  if (compact.length >= 2) return compact.slice(0, 2);
  if (compact.length === 1) return `${compact}X`;
  return 'CL';
}

export function isValidTiltIdFormat(tiltId?: string | null): boolean {
  if (typeof tiltId !== 'string') return false;
  return /^[A-Z0-9]{6}$/.test(tiltId.trim().toUpperCase());
}

export function generateTiltIdCandidate(clubName?: string | null): string {
  const prefix = getClubTiltPrefix(clubName);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${suffix}`;
}
