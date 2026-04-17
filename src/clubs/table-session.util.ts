/**
 * Staff "session" markers in `tables.notes` (see clubs.controller pause/resume/end).
 * Player-facing lists should only show tables while a session is started or paused mid-session.
 */
export function tableHasActiveStaffSession(notes: string | null | undefined): boolean {
  const n = (notes || '').trim();
  if (!n) return false;
  if (/Session Started:/i.test(n)) return true;
  if (/Paused At:/i.test(n)) return true;
  return false;
}
