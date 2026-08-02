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

export function exactUsdPrice(value: string | null): string {
  if (value === null || !/^-?\d+(?:\.\d+)?$/.test(value)) return '—';

  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [integer = '0', fraction] = unsigned.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${negative ? '−' : ''}$${grouped}${fraction ? `.${fraction}` : ''}`;
}
