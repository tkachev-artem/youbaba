export function formatRub(amount: number): string {
  // 1-в-1: простое форматирование "1234 ₽"
  const n = Math.round(amount);
  return `${n.toLocaleString('ru-RU')} ₽`;
}
