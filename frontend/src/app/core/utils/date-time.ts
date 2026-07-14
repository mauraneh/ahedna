export function toDateTimeInputValue(date: string): string {
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatEuroPrice(value: number | string | null | undefined, locale: string, freeLabel: string): string {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return freeLabel;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}
