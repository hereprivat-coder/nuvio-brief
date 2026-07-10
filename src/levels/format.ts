import type { BreakoutEvent, Level } from './types.js';

export function pluralizeRu(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(Math.round(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

const DAY_FORMS = ['день', 'дня', 'дней'] as const;
const TOUCH_FORMS = ['подход', 'подхода', 'подходов'] as const;

export function formatPrice(price: number): string {
  return Math.round(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDays(days: number): string {
  const rounded = Math.max(1, Math.round(days));
  return `${rounded} ${pluralizeRu(rounded, DAY_FORMS)}`;
}

interface TestingCopy {
  lead: (price: string) => string;
  status: string;
  holdConsequence: string;
  breakConsequence: string;
}

/** Hold/break consequences are opposite for a ceiling vs a floor — this table is the
 * single source of truth for that, so the sentence-building logic below can't drift
 * out of sync with role the way the old single hardcoded template did (bug: it always
 * said "пробьёт — дорога выше", which is backwards for a support level). */
const TESTING_COPY: Record<Level['role'], TestingCopy> = {
  resistance: {
    lead: (price) => `BTC уперся в ${price}`,
    status: 'пробоя нет',
    holdConsequence: 'откат вниз',
    breakConsequence: 'дорога выше',
  },
  support: {
    lead: (price) => `BTC тестирует поддержку ${price}`,
    status: 'пока держит',
    holdConsequence: 'отскок вверх',
    breakConsequence: 'открывается дорога ниже',
  },
};

export function formatTestingLine(level: Level): string {
  const copy = TESTING_COPY[level.role];
  const touchesWord = pluralizeRu(level.touches, TOUCH_FORMS);
  return (
    `${copy.lead(formatPrice(level.price))} — ${level.touches} ${touchesWord} за ${formatDays(level.ageDays)}, ` +
    `${copy.status}. Уровень решает: удержит — ${copy.holdConsequence}, пробьёт — ${copy.breakConsequence}.`
  );
}

export function formatCombinedTestingLine(weak: Level, dominant: Level, currentPrice: number): string {
  const direction = dominant.price < currentPrice ? 'ниже' : 'выше';
  return `BTC сейчас у ${formatPrice(weak.price)}, крупный узел ${direction} — ${formatPrice(dominant.price)}.`;
}

export function formatBreakoutLine(breakout: BreakoutEvent): string {
  const age = formatDays(breakout.ageAtBreakDays);
  if (breakout.direction === 'up') {
    return (
      `BTC пробил ${formatPrice(breakout.level.price)}, где стоял ${age}. ` +
      `Теперь это бывшее сопротивление — следим, станет ли поддержкой на откате.`
    );
  }
  return (
    `BTC пробил ${formatPrice(breakout.level.price)}, где стоял ${age}. ` +
    `Теперь это бывшая поддержка — следим, станет ли сопротивлением на отскоке.`
  );
}

export function formatFallbackLine(nearest: Level | null, direction: 'above' | 'below' | null): string {
  if (!nearest || !direction) {
    return 'BTC в свободном пространстве — рядом нет проверенных уровней.';
  }
  const directionWord = direction === 'below' ? 'снизу' : 'сверху';
  return (
    `BTC в свободном пространстве — рядом нет проверенных уровней, ` +
    `ближайший ориентир ${formatPrice(nearest.price)} ${directionWord}.`
  );
}
