const BASE_ALLOWED_ORIGINS = [
  process.env.PLAYER_APP_URL || 'http://localhost:5173',
  process.env.WEBSITE_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost:3000',
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

export function getAllowedOrigins(): string[] {
  const customOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allOrigins = [...BASE_ALLOWED_ORIGINS, ...customOrigins]
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(new Set(allOrigins));
}

export function isOriginAllowed(origin?: string): boolean {
  // Tight default: reject no-origin clients unless explicitly allowed.
  // Set ALLOW_NO_ORIGIN_WS=true only if you intentionally support server/native clients without Origin.
  if (!origin) return String(process.env.ALLOW_NO_ORIGIN_WS || '').toLowerCase() === 'true';
  const normalized = normalizeOrigin(origin);
  return getAllowedOrigins().includes(normalized);
}
