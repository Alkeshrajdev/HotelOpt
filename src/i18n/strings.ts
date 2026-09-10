/**
 * Externalised strings — §29.3.
 *
 * Every user-visible string lives here, keyed, in every supported language. Two rules
 * make that more than a filing convention:
 *
 *   • The catalogue is TYPED on the English key set, so a key added to English and not to
 *     Arabic fails the typecheck. A missing translation is a build failure rather than a
 *     silent fallback to English, because a silent fallback is how half an Arabic page
 *     ships in English and nobody notices until a client does.
 *
 *   • Nothing here is a sentence assembled from fragments. Concatenating "Missing " +
 *     count + " months" cannot be translated into a language that orders or inflects
 *     differently, so a string that varies takes a parameter and the whole sentence is
 *     translated as a unit.
 *
 * Strings that state a rule — the two-figure waste labels, the open-collection response
 * wording — are deliberately here too, so translating the product cannot quietly reword a
 * disclosure the guide specifies.
 */
import type { Locale } from './locales'

const en = {
  'nav.overview': 'Overview',
  'nav.performance': 'Performance',
  'nav.data': 'Data',
  'nav.reports': 'Reports',
  'nav.approval': 'Approval',
  'nav.supplies': 'Meters and supplies',
  'nav.connections': 'Connections',
  'nav.attention': 'Attention',
  'nav.calendar': 'Calendar',
  'nav.classifications': 'Classifications',
  'nav.cost': 'Cost',
  'nav.measures': 'Measures',
  'nav.certification': 'Certifications',
  'nav.assurance': 'Assurance',
  'nav.documents': 'Documents',
  'nav.surveys': 'Surveys',
  'nav.carbon': 'Carbon',
  'nav.compensation': 'Compensation',
  'nav.instruments': 'Instruments',
  'nav.people': 'People',
  'nav.portfolio': 'Portfolio',
  'nav.operator-hotels': 'Clients',
  'nav.operator-factors': 'Factors',
  'nav.operator-model': 'Model',
  'nav.operator-pools': 'Pools',
  'nav.operator-users': 'Users',
  'nav.operator-access': 'Access',
  'nav.operator-schemes': 'Schemes',
  'nav.operator-security': 'Security',
  'shell.language': 'Language',
  'shell.signOut': 'Sign out',

  'quality.measured': 'Measured',
  'quality.estimated': 'Estimated',
  'quality.proxy': 'Proxy',

  // One key per denominator, each a whole sentence. Appendix C.2 does not put every
  // resource on the same denominator — waste is per guest night, energy and water per
  // occupied room night — so a single sentence naming room nights would be wrong on the
  // waste card. Parameterising the denominator into one sentence would be worse: Arabic
  // inflects the noun with the negation, and the fragment could not be translated.
  'state.intensityNotApplicable.occupiedRoomNight':
    'Intensity not applicable — no occupied room nights in this period',
  'state.intensityNotApplicable.guestNight':
    'Intensity not applicable — no guest nights in this period',
  'state.notYetAvailable': 'Not yet available',
  'state.destinationNotEstablished': 'Destination not established',

  'waste.materialRecoveryRate': 'Material recovery rate',
  'waste.landfillDiversionRate': 'Landfill diversion rate',
  'waste.wasteToEnergy': 'Waste to energy',

  'survey.responseRate': 'Response rate',
  'survey.openCollection': 'response count — open collection, no defined population',

  'report.partialPeriod': 'Partial period',
  'report.completePeriod': 'Complete period',
} as const

export type StringKey = keyof typeof en

/**
 * Arabic. Typed as the English key set, so this object cannot be missing a key and cannot
 * carry one English does not have.
 */
const ar: Record<StringKey, string> = {
  'nav.overview': 'نظرة عامة',
  'nav.performance': 'الأداء',
  'nav.data': 'البيانات',
  'nav.reports': 'التقارير',
  'nav.approval': 'الاعتماد',
  'nav.supplies': 'العدادات والإمدادات',
  'nav.connections': 'الاتصالات',
  'nav.attention': 'يتطلب انتباهك',
  'nav.calendar': 'التقويم',
  'nav.classifications': 'التصنيفات',
  'nav.cost': 'التكلفة',
  'nav.measures': 'الإجراءات',
  'nav.certification': 'الشهادات',
  'nav.assurance': 'التحقق',
  'nav.documents': 'المستندات',
  'nav.surveys': 'الاستبيانات',
  'nav.carbon': 'الكربون',
  'nav.compensation': 'التعويض',
  'nav.instruments': 'الأدوات',
  'nav.people': 'الأشخاص',
  'nav.portfolio': 'المحفظة',
  'nav.operator-hotels': 'العملاء',
  'nav.operator-factors': 'المعاملات',
  'nav.operator-model': 'النموذج',
  'nav.operator-pools': 'المجمعات',
  'nav.operator-users': 'المستخدمون',
  'nav.operator-access': 'سجل الوصول',
  'nav.operator-schemes': 'برامج الاعتماد',
  'nav.operator-security': 'الأمن',
  'shell.language': 'اللغة',
  'shell.signOut': 'تسجيل الخروج',

  'quality.measured': 'مُقاس',
  'quality.estimated': 'مُقدَّر',
  'quality.proxy': 'بديل',

  'state.intensityNotApplicable.occupiedRoomNight':
    'الكثافة غير قابلة للتطبيق — لا توجد ليالٍ غرف مشغولة في هذه الفترة',
  'state.intensityNotApplicable.guestNight':
    'الكثافة غير قابلة للتطبيق — لا توجد ليالٍ ضيوف في هذه الفترة',
  'state.notYetAvailable': 'غير متاح بعد',
  'state.destinationNotEstablished': 'الوجهة غير محددة',

  'waste.materialRecoveryRate': 'معدل استرداد المواد',
  'waste.landfillDiversionRate': 'معدل تحويل النفايات عن المكب',
  'waste.wasteToEnergy': 'تحويل النفايات إلى طاقة',

  'survey.responseRate': 'معدل الاستجابة',
  'survey.openCollection': 'عدد الاستجابات — جمع مفتوح، بدون مجتمع محدد',

  'report.partialPeriod': 'فترة جزئية',
  'report.completePeriod': 'فترة كاملة',
}

const CATALOGUE: Record<Locale, Record<StringKey, string>> = { en, ar }

/** A rail label in the reader's language; a key the catalogue does not carry keeps its English label. */
export function navLabel(key: string, fallback: string, locale: Locale): string {
  const k = `nav.${key}`
  return k in en ? CATALOGUE[locale][k as StringKey] : fallback
}

export function t(key: StringKey, locale: Locale): string {
  return CATALOGUE[locale][key]
}

/** For the test that asserts every locale carries every key. */
export function catalogueKeys(locale: Locale): readonly string[] {
  return Object.keys(CATALOGUE[locale]).sort()
}

export function allStringKeys(): readonly StringKey[] {
  return Object.keys(en) as StringKey[]
}
