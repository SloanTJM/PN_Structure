export function fmt(n) {
  if (n == null || isNaN(n)) return '\u2014';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtD(n) {
  if (n == null || isNaN(n)) return '\u2014';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(n) {
  if (n == null || isNaN(n)) return '\u2014';
  return `${n.toFixed(2)}%`;
}

export function fmtLarge(n) {
  if (n == null || isNaN(n)) return '\u2014';
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  return fmt(n);
}

export function fmtRate(n) {
  if (n == null) return '\u2014';
  return n.toFixed(5);
}
