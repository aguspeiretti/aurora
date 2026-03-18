/**
 * Formatear moneda según la organización activa
 * Por defecto usa ARS
 */
export function formatMoney(amount, currency = 'ARS', locale = 'es-AR') {
  if (amount === null || amount === undefined) return '—'

  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatMoneyCompact(amount, symbol = '$') {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num >= 1_000_000) return `${symbol}${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${symbol}${(num / 1_000).toFixed(0)}K`
  return `${symbol}${num.toFixed(0)}`
}

export function parseMoney(str) {
  if (!str) return 0
  return parseFloat(String(str).replace(/[^0-9.-]/g, '')) || 0
}
