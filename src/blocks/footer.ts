import { dayIndexFromIsoDate } from '../utils/date.js';

/** Show the footer roughly every 3rd day (spec §9: "раз в 2-3 дня, не в каждый выпуск").
 * A tunable knob — adjust the modulus to change frequency. */
const FOOTER_INTERVAL_DAYS = 3;

export function shouldShowFooter(isoDate: string): boolean {
  return dayIndexFromIsoDate(isoDate) % FOOTER_INTERVAL_DAYS === 0;
}

export function getFooterText(refLink: string): string {
  return `Ещё нет аккаунта? Первый безопасный шаг — ${refLink}`;
}
