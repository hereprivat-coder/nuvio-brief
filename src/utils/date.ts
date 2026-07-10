const MOSCOW_TZ = 'Europe/Moscow';

/** YYYY-MM-DD in Europe/Moscow, used as the idempotency key. */
export function getMoscowIsoDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MOSCOW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** "10 июля" in Europe/Moscow, used for display. */
export function getMoscowHumanDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: MOSCOW_TZ,
    day: 'numeric',
    month: 'long',
  }).format(now);
}

/** Deterministic day counter from an ISO date, used for rotating advice/footer. */
export function dayIndexFromIsoDate(isoDate: string): number {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
}
