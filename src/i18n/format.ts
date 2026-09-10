/**
 * Locale-aware number, date and currency formatting — §29.3.
 *
 * The rule this module exists to hold: FORMATTING CHANGES HOW A NUMBER LOOKS AND NEVER
 * WHAT IT IS. Every quantity is rounded once, by the engine, at the precision App. C.2
 * assigns its kind; this layer only chooses digit grouping, decimal marks and script. The
 * same value therefore reads identically in the UI, a PDF, an Excel export, a certificate
 * and the API (§24.5, T-37) whatever the locale.
 *
 * That is why formatQuantity takes a QuantityKind rather than a decimal-places argument:
 * a caller cannot ask for two decimals on a figure the registry says has one, so a
 * locale's formatting cannot become a second precision table (App. C.3).
 */
import { displayPrecision, roundForDisplay } from '@/engine/rounding'
import type { QuantityKind } from '@/engine/rounding'
import { intlTagOf } from './locales'
import type { Locale } from './locales'

export function formatQuantity(value: string | number, kind: QuantityKind, locale: Locale): string {
  const precision = displayPrecision(kind)
  // Rounded by the engine first, then formatted. Never rounded by Intl, which would put
  // the rounding decision in the presentation layer.
  const rounded = roundForDisplay(value, kind)
  return new Intl.NumberFormat(intlTagOf(locale), {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(Number(rounded.toFixed(precision)))
}

export function formatCurrency(
  value: string | number,
  /** The TENANT's reporting currency (§16.1), not a currency implied by the locale. */
  currency: string,
  locale: Locale,
): string {
  const precision = displayPrecision('currency.transaction')
  const rounded = roundForDisplay(value, 'currency.transaction')
  return new Intl.NumberFormat(intlTagOf(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(Number(rounded.toFixed(precision)))
}

export function formatPercent(value: string | number, locale: Locale): string {
  return `${formatQuantity(value, 'percentage', locale)}%`
}

/**
 * A reporting month, as a month and a year.
 *
 * Takes 'YYYY-MM' rather than a Date: a reporting period is a calendar month in the
 * hotel's own terms, and putting it through a Date makes it a timestamp with a zone,
 * which is how a January figure ends up labelled December.
 */
export function formatReportingMonth(month: string, locale: Locale): string {
  const [year, m] = month.split('-')
  if (year === undefined || m === undefined) {
    throw new RangeError(`a reporting month is YYYY-MM; received "${month}"`)
  }
  const monthIndex = Number(m) - 1
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new RangeError(`a reporting month is YYYY-MM; received "${month}"`)
  }
  return new Intl.DateTimeFormat(intlTagOf(locale), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(Date.UTC(Number(year), monthIndex, 1))
}

/** A date the user supplied or the platform recorded, rendered in the hotel's zone. */
export function formatDate(iso: string, locale: Locale, timeZone = 'UTC'): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) throw new RangeError(`not an ISO 8601 date: "${iso}"`)
  return new Intl.DateTimeFormat(intlTagOf(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(at)
}

/**
 * A list, joined the way the locale joins lists.
 *
 * Concatenating with ", " and " and " is an English assumption that survives translation
 * unnoticed, because the words around it get translated and the conjunction does not.
 */
export function formatList(items: readonly string[], locale: Locale): string {
  return new Intl.ListFormat(intlTagOf(locale), { style: 'long', type: 'conjunction' }).format(
    items,
  )
}
