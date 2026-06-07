import type { Lang, LocalizedText } from '@/mastra/schemas/output';

export type { Lang };

/** Pick the active language from a bilingual content field, with sensible fallbacks. */
export function pick(value: LocalizedText | null | undefined, lang: Lang): string {
  if (!value) return '';
  return value[lang] || value.bg || value.en || '';
}

/** Tiny classnames helper (filters out falsy values). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * UI chrome strings. The agent's *content* is already bilingual ({ bg, en }); this
 * dictionary covers everything else (labels, buttons, hints). Both languages must
 * expose identical keys — enforced by the `satisfies` check below.
 */
export const UI = {
  bg: {
    appTitle: 'Сравнение на застрахователни оферти',
    appSubtitle:
      'Качете 2 или повече оферти и получете експертен сравнителен анализ и PDF доклад.',

    // Dropzone
    uploadTitle: 'Качете офертите',
    uploadHint: 'Плъзнете файлове тук или кликнете, за да изберете',
    uploadFormats: 'PDF, Word (.docx) или Excel (.xlsx) · мин. 2 файла · макс. 45 MB общо',
    browse: 'Изберете файлове',
    remove: 'Премахни',
    needTwo: 'Нужни са поне 2 файла за сравнение.',
    tooLarge: 'Общият размер на файловете надвишава 45 MB.',
    unsupported: 'Неподдържан формат',
    totalSize: 'Общо',

    // Profile
    profileTitle: 'Профил на клиента',
    optional: 'по избор',
    profileHint:
      'Незадължително. Помага за по-точна препоръка спрямо нуждите на клиента.',
    insuranceType: 'Вид застраховка',
    insuranceTypePlaceholder: 'напр. Автокаско',
    budget: 'Максимален годишен бюджет',
    budgetPlaceholder: 'напр. 1500',
    currency: 'Валута',
    priorities: 'Приоритети',
    prioritiesHint: 'Изберете или добавете свои',
    customPriorityPlaceholder: 'Друг приоритет…',
    add: 'Добави',
    riskAppetite: 'Толерантност към риск',
    riskLow: 'Ниска',
    riskMedium: 'Средна',
    riskHigh: 'Висока',
    subjectDetails: 'Обект на застраховане',
    subjectPlaceholder: 'напр. лек автомобил, 2021 г., стойност 40 000 лв.',
    currentInsurer: 'Настоящ застраховател',
    currentInsurerPlaceholder: 'напр. ДЗИ',
    notes: 'Бележки',
    notesPlaceholder: 'Допълнителна информация…',

    // Actions / status
    analyze: 'Анализирай офертите',
    analyzing: 'Анализиране…',
    analyzingTitle: 'Анализираме офертите',
    analyzingHint:
      'Това може да отнеме няколко минути. Моля, не затваряйте страницата.',
    newAnalysis: 'Нов анализ',
    errorTitle: 'Възникна грешка',
    genericError: 'Грешка при анализа. Опитайте отново.',
    retry: 'Опитай отново',

    // Results
    resultsTitle: 'Резултати',
    detectedType: 'Вид застраховка',
    summary: 'Кратко резюме',
    recommendation: 'Препоръка',
    clientNeeds: 'Вашите изисквания и потребности',
    mostAdvantageous: 'Най-изгодна',
    cheapest: 'Най-евтина',
    bestCoverage: 'Най-пълно покритие',
    offersTitle: 'Подробен преглед на офертите',
    premium: 'Годишна премия',
    score: 'Оценка',
    overallScore: 'Обща оценка',
    file: 'Файл',
    sumInsured: 'Застрахователна сума / лимит',
    deductible: 'Самоучастие',
    assistance: 'Асистанс',
    claims: 'Ликвидация на щети',
    payment: 'Плащане',
    coverages: 'Покрития',
    exclusions: 'Изключения',
    strengths: 'Силни страни',
    weaknesses: 'Слаби страни',
    redFlags: 'Внимание',
    coverageMatrixTitle: 'Сравнителна таблица на покритията',
    riskColumn: 'Риск / покритие',
    covYes: 'Покрито',
    covNo: 'Не е покрито',
    covPartial: 'Частично',
    covUnknown: 'Няма данни',
    insuredSubjectTitle: 'Обект на застраховане',
    address: 'Адрес',
    similarities: 'Прилики между офертите',
    differences: 'Разлики между офертите',
    whatToWatch: 'На какво да обърнете внимание',
    glossary: 'Речник на термините',
    disclaimers: 'Важни уточнения',
    showScores: 'Оценки по критерии',
    hideScores: 'Скрий оценките',
    downloadPdf: 'Изтегли PDF доклад',
    previewPdf: 'Преглед на PDF',
    hidePreview: 'Скрий преглед',
    na: 'няма данни',

    // Dimension labels (DimensionScores)
    dimCoverage: 'Покритие',
    dimPrice: 'Цена / стойност',
    dimExclusions: 'Изключения',
    dimDeductible: 'Самоучастие',
    dimClaimsHandling: 'Ликвидация',
    dimAssistance: 'Асистанс',
    dimReliability: 'Надеждност',
    dimFlexibility: 'Гъвкавост',
  },
  en: {
    appTitle: 'Insurance Offer Comparison',
    appSubtitle:
      'Upload 2 or more offers and get an expert comparative analysis and a PDF report.',

    uploadTitle: 'Upload the offers',
    uploadHint: 'Drag files here or click to browse',
    uploadFormats: 'PDF, Word (.docx) or Excel (.xlsx) · min. 2 files · max. 45 MB total',
    browse: 'Browse files',
    remove: 'Remove',
    needTwo: 'At least 2 files are required to compare.',
    tooLarge: 'Total file size exceeds 45 MB.',
    unsupported: 'Unsupported format',
    totalSize: 'Total',

    profileTitle: 'Client profile',
    optional: 'optional',
    profileHint:
      "Optional. Helps tailor the recommendation to the client's needs.",
    insuranceType: 'Insurance type',
    insuranceTypePlaceholder: 'e.g. Motor Casco',
    budget: 'Max annual budget',
    budgetPlaceholder: 'e.g. 1500',
    currency: 'Currency',
    priorities: 'Priorities',
    prioritiesHint: 'Select or add your own',
    customPriorityPlaceholder: 'Other priority…',
    add: 'Add',
    riskAppetite: 'Risk tolerance',
    riskLow: 'Low',
    riskMedium: 'Medium',
    riskHigh: 'High',
    subjectDetails: 'Insured subject',
    subjectPlaceholder: 'e.g. car, 2021, value BGN 40,000',
    currentInsurer: 'Current insurer',
    currentInsurerPlaceholder: 'e.g. DZI',
    notes: 'Notes',
    notesPlaceholder: 'Additional information…',

    analyze: 'Analyze offers',
    analyzing: 'Analyzing…',
    analyzingTitle: 'Analyzing the offers',
    analyzingHint: 'This can take a few minutes. Please keep this page open.',
    newAnalysis: 'New analysis',
    errorTitle: 'Something went wrong',
    genericError: 'Analysis failed. Please try again.',
    retry: 'Try again',

    resultsTitle: 'Results',
    detectedType: 'Insurance type',
    summary: 'Summary',
    recommendation: 'Recommendation',
    clientNeeds: 'Your demands & needs',
    mostAdvantageous: 'Most advantageous',
    cheapest: 'Cheapest',
    bestCoverage: 'Best coverage',
    offersTitle: 'Detailed offer review',
    premium: 'Annual premium',
    score: 'Score',
    overallScore: 'Overall score',
    file: 'File',
    sumInsured: 'Sum insured / limit',
    deductible: 'Deductible',
    assistance: 'Assistance',
    claims: 'Claims handling',
    payment: 'Payment',
    coverages: 'Coverages',
    exclusions: 'Exclusions',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    redFlags: 'Watch out',
    coverageMatrixTitle: 'Coverage comparison',
    riskColumn: 'Risk / coverage',
    covYes: 'Covered',
    covNo: 'Not covered',
    covPartial: 'Partial',
    covUnknown: 'Unknown',
    insuredSubjectTitle: 'Insured subject',
    address: 'Address',
    similarities: 'Similarities between offers',
    differences: 'Differences between offers',
    whatToWatch: 'What to watch out for',
    glossary: 'Glossary',
    disclaimers: 'Important notes',
    showScores: 'Dimension scores',
    hideScores: 'Hide scores',
    downloadPdf: 'Download PDF report',
    previewPdf: 'Preview PDF',
    hidePreview: 'Hide preview',
    na: 'no data',

    dimCoverage: 'Coverage',
    dimPrice: 'Value for money',
    dimExclusions: 'Exclusions',
    dimDeductible: 'Deductible',
    dimClaimsHandling: 'Claims',
    dimAssistance: 'Assistance',
    dimReliability: 'Reliability',
    dimFlexibility: 'Flexibility',
  },
} satisfies Record<Lang, Record<string, string>>;

export type UIStrings = (typeof UI)['bg'];

/** Common Bulgarian insurance types, used as `<datalist>` suggestions. */
export const INSURANCE_TYPE_SUGGESTIONS: Record<Lang, string[]> = {
  bg: [
    'Автокаско',
    'Гражданска отговорност',
    'Имуществена застраховка',
    'Здравна застраховка',
    'Животозастраховане',
    'Пътническа застраховка',
    'Застраховка на отговорности',
  ],
  en: [
    'Motor Casco',
    'Motor Third-Party Liability',
    'Property insurance',
    'Health insurance',
    'Life insurance',
    'Travel insurance',
    'Liability insurance',
  ],
};

/** Preset priority chips (toggleable). The chosen label is sent to the agent as-is. */
export const PRIORITY_PRESETS: Record<Lang, string[]> = {
  bg: [
    'ниска цена',
    'пълно покритие',
    'бързо изплащане на щети',
    'ниско самоучастие',
    'добър асистанс',
    'надежден застраховател',
    'гъвкаво плащане',
  ],
  en: [
    'low price',
    'full coverage',
    'fast claims',
    'low deductible',
    'good assistance',
    'reliable insurer',
    'flexible payment',
  ],
};
