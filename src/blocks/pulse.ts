/** Block 1 — market pulse. Pure lookup table, no AI. `changePercent` is BTC 24h % change. */
export function getPulseLine(changePercent: number | null): string {
  if (changePercent === null) {
    return 'Рынок сегодня без резких движений.';
  }
  if (changePercent >= 5) {
    return 'Рынок бодро растёт, зелёное утро. Но за ростом не гонимся.';
  }
  if (changePercent >= 1.5) {
    return 'Спокойно, лёгкий плюс. Обычное рабочее утро.';
  }
  if (changePercent > -1.5) {
    return 'Тихо, рынок почти не двигается. Спешить некуда.';
  }
  if (changePercent > -5) {
    return 'Слегка красновато, небольшой минус — это норма.';
  }
  return 'Красный день, рынок заметно просел. Резкие качели для крипты — обычное дело, без паники.';
}
