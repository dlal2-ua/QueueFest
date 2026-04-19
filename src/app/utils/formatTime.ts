export function formatWait(minutes: number, hasOrders = false): string {
  if (!minutes || minutes <= 0) return hasOrders ? '< 1m' : '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
