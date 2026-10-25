/**
 * Formats a numerical monetary value into a localized currency string.
 * Supports INR with zero fractional digits by default, and foreign currencies with standard precision.
 *
 * @param amount - The numerical monetary value.
 * @param currency - The 3-letter ISO currency code (e.g. 'INR', 'USD').
 * @returns Formatted currency string.
 */
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

/**
 * Converts a standard Date object into a YYYY-MM-DD calendar date string.
 *
 * @param date - The JavaScript Date object.
 * @returns ISO date string in YYYY-MM-DD format.
 */
export function localDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calculates the number of remaining calendar days until a specified target date.
 * Returns 0 if the target date has already passed.
 *
 * @param dateValue - Target date in YYYY-MM-DD format.
 * @returns Non-negative number of days remaining.
 */
export function daysUntil(dateValue: string): number {
  const [year, month, day] = dateValue.split('-').map(Number)
  const target = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.ceil((target - today) / 86_400_000))
}

/**
 * Formats a YYYY-MM-DD date string into a human-readable localized representation.
 *
 * @param dateValue - Date in YYYY-MM-DD format.
 * @param options - Optional Intl.DateTimeFormatOptions configuration.
 * @returns Localized, human-readable date string.
 */
export function formatDate(
  dateValue: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(year, month - 1, day))
}

/**
 * Extracts a concise 1-2 character monogram or initials from an event or person name.
 *
 * @param name - Full display name string.
 * @returns 1-2 uppercase character monogram.
 */
export function initials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
