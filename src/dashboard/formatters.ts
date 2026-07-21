export function money(value: string | number | null): string {
  if (value === null || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';

  return `${number < 0 ? '−' : ''}$${Math.abs(number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function percent(value: string | number | null, signed = true): string {
  if (value === null || !Number.isFinite(Number(value))) return '—';
  const number = Number(value);

  return `${signed && number > 0 ? '+' : ''}${number.toFixed(2)}%`;
}
