/**
 * Supported locales and text direction — §29.3.
 *
 * "English and Arabic supported by the architecture, including right-to-left layout, with
 * externalised strings and locale-aware number, date and currency formatting from the
 * first commit... retrofitting RTL is not acceptable."
 *
 * Two decisions this module makes, both easy to get wrong later and expensive to change:
 *
 *   • Direction is derived from the locale, never carried as a separate flag. A `dir`
 *     someone can set independently of the language is a `dir` that will one day disagree
 *     with it, and the disagreement shows up as a mirrored page in the wrong language.
 *
 *   • Arabic pins the Latin numbering system (`-u-nu-latn`). Intl would otherwise render
 *     Arabic-Indic digits, and a sustainability figure that reads ٤١٫٣ in the Arabic UI
 *     and 41.3 in the PDF is the same defect §18 names between a dashboard and a report.
 *     This is a rendering choice about digits, not about language, and it is stated here
 *     rather than left to whichever Node build the renderer runs on.
 */

export type Locale = 'en' | 'ar'
export type Direction = 'ltr' | 'rtl'

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'ar']
export const DEFAULT_LOCALE: Locale = 'en'

interface LocaleDefinition {
  readonly direction: Direction
  /** The BCP 47 tag handed to Intl, including the numbering-system extension. */
  readonly intlTag: string
  readonly englishName: string
  readonly nativeName: string
}

const LOCALES: Record<Locale, LocaleDefinition> = {
  en: {
    direction: 'ltr',
    intlTag: 'en-GB',
    englishName: 'English',
    nativeName: 'English',
  },
  ar: {
    direction: 'rtl',
    intlTag: 'ar-AE-u-nu-latn',
    englishName: 'Arabic',
    nativeName: 'العربية',
  },
}

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function directionOf(locale: Locale): Direction {
  return LOCALES[locale].direction
}

export function intlTagOf(locale: Locale): string {
  return LOCALES[locale].intlTag
}

export function localeName(locale: Locale): { english: string; native: string } {
  return { english: LOCALES[locale].englishName, native: LOCALES[locale].nativeName }
}

/**
 * Resolve a locale from an Accept-Language header or a stored preference.
 *
 * Falls back to English rather than throwing, because an unsupported language is a
 * request the platform can still answer — unlike a missing translation, which is a build
 * failure (see strings.ts).
 */
export function resolveLocale(requested: string | null | undefined): Locale {
  if (!requested) return DEFAULT_LOCALE
  for (const part of requested.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase() ?? ''
    const primary = tag.split('-')[0] ?? ''
    if (isSupportedLocale(primary)) return primary
  }
  return DEFAULT_LOCALE
}

/** The cookie that caches the profile's language on this browser (V-01). The profile is the record. */
export const LOCALE_COOKIE = 'ho_locale'

/**
 * The reader's language: their stated setting first, the browser's preference otherwise.
 * A setting is a choice the person made in the product; a header is a guess about them.
 */
export function resolveLocaleFrom(
  setting: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (setting && isSupportedLocale(setting)) return setting
  return resolveLocale(acceptLanguage)
}

/** The attributes a page root carries. Both come from the locale; neither is a choice. */
export function htmlAttributes(locale: Locale): { lang: Locale; dir: Direction } {
  return { lang: locale, dir: directionOf(locale) }
}
