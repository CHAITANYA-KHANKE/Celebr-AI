export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'INR' ? 0 : 2,
    }).format(Number.isFinite(amount) ? amount : 0)
  } catch {
    return `${currency} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount)}`
  }
}

export function localDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function daysUntil(dateValue: string): number {
  const [year, month, day] = dateValue.split('-').map(Number)
  const target = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.ceil((target - today) / 86_400_000))
}

export function formatDate(
  dateValue: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(year, month - 1, day))
}

export function initials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
