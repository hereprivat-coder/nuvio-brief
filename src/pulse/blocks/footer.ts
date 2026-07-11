import { dayIndexFromIsoDate } from '../../utils/date.js';
import type { PulseConfig } from '../config.js';

/** Same "roughly every 3rd day" idea as the newbie brief's footer, +1 offset
 * so the two products' footers don't land on the same calendar day by
 * construction — purely a UX nicety, not a spec requirement. */
export function shouldShowFooter(isoDate: string, config: PulseConfig): boolean {
  return (dayIndexFromIsoDate(isoDate) + 1) % config.footerIntervalDays === 0;
}

export function getFooterText(swapLink: string): string {
  return `👉 Своп между сетями без лишних шагов — ${swapLink}`;
}
