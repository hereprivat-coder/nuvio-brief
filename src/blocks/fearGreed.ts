/** Block 2 — Fear & Greed. Pure lookup table, no AI. Caller must skip the whole
 * block if `value` is unavailable — never show a stale or guessed number. */
export function getFearGreedBandName(value: number): string {
  if (value <= 24) return 'Крайний страх';
  if (value <= 44) return 'Страх';
  if (value <= 55) return 'Нейтрально';
  if (value <= 75) return 'Жадность';
  return 'Крайняя жадность';
}

export function getFearGreedLine(value: number): string {
  if (value <= 24) {
    return 'Все напуганы. Именно в такие моменты новички в панике всё распродают — вот этого делать не стоит. Спокойствие.';
  }
  if (value <= 44) {
    return 'Рынок нервничает. Ничего необычного, паниковать рано.';
  }
  if (value <= 55) {
    return 'Настроение спокойное, без крайностей.';
  }
  if (value <= 75) {
    return 'Все жадничают. Не лучший момент заходить на всю котлету — на эйфории легко переплатить.';
  }
  return 'Все в эйфории. Самое опасное настроение для новичка — тут чаще всего покупают на хаях. Особая осторожность.';
}
