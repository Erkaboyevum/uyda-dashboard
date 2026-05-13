const CURRENCY_LABELS = { '860': "so'm", '840': '$' };

export function formatNumber(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function currencyLabel(currency) {
  return CURRENCY_LABELS[currency] ?? currency;
}

export function formatAmount(n, currency) {
  const num = formatNumber(n);
  const label = currencyLabel(currency);
  return label ? `${num} ${label}` : num;
}

export function formatCompact(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function formatDate(iso) {
  if (!iso?.trim()) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return '—'; }
}

export function formatDateShort(iso) {
  if (!iso?.trim()) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  } catch { return '—'; }
}
