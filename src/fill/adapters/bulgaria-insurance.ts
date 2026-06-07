import type { Adapter } from '../adapter-kit';
import { Choice, Multi, money, T, YN } from '../adapter-kit';

/**
 * Adapter for "ЗК България Иншурънс" — property questionnaire (юридически лица), 2 pages.
 * This form has mostly semantic field names; the few generic "Text Field N" boxes are
 * resolved by their position on the printed form (see scripts/prepare-templates.py output).
 */
export const bulgariaInsuranceAdapter: Adapter = (p) => {
  const ins = p.insured ?? {};
  const ip = p.insuringParty ?? {};

  return [
    // — Insured (Кандидат за застраховане) —
    T('Text Field7', ins.name),
    T('Text Field6', ins.idNumber),
    T('Кандидат за застраховане - адрес за кореспонденция', ins.regAddress ?? ins.corrAddress),
    T('mail', ins.email),

    // — Insuring party / beneficiary (when different) —
    T('Text Field12', ip.name),
    T('ЕГН/ЕИК', ip.idNumber),
    T('Адрес по регистрация', ip.regAddress),

    // — Payment + policy period —
    Choice(p.paymentMethod, {
      once: 'еднократно',
      two: 'на 2 (две) вноски',
      four: 'на 4 (четири) вноски_1',
    }),
    T('Text Field5', p.termMonths ?? (p.startDate || p.endDate ? '12' : null)),
    T('Text Field3', p.startDate),
    T('Text Field4', p.endDate),

    // — Property —
    T('Text Field10', p.propertyAddress),
    T('Text Field0', p.activity),
    T('Text Field9', p.staffCount),
    Choice(p.usedBy, { owner: 'Собственик', tenant: 'Наемател', other: 'Друго_2' }),
    Choice(p.buildingType, {
      administrative: 'Административна',
      production: 'Производствена',
      commercial: 'Търговска',
      storage: 'Склад',
      other: 'Друго_1',
    }),
    ...YN(p.commissioned, 'Check Box2', 'Check Box1'),
    T('Година на построяване', p.yearBuilt),
    T('Брой етажи на сградата', p.floors),
    T('Text Field8', p.areaSqm),
    Choice(p.locatedOn, { ground: 'Check Box0', basement: 'Check Box3', whole: 'Check Box4' }),

    // — Construction —
    Choice(p.wallConstruction, {
      reinforced_concrete: 'Check Box6',
      brick: 'Check Box5',
      metal: 'Check Box7',
      wood: 'Check Box8',
      other: 'Check Box9',
    }),
    Choice(p.roofConstruction, {
      reinforced_concrete: 'Check Box12',
      tiles: 'Check Box11',
      metal: 'Check Box10',
      wood: 'Check Box13',
      other: 'Check Box14',
    }),
    Choice(p.glazing, {
      single: 'стъклени помещения - Обикновени',
      double: 'стъклени помещения - Стъклопакет',
    }),

    // — Protection & occupancy —
    ...Multi(p.security, {
      sot: 'СОТ',
      local_alarm: 'локална аларма',
      armed_guard: 'въоръжена охрана',
      cctv: 'Видеонаблюдение',
      guard_24h: 'Денонощна охрана',
    }),
    ...Multi(p.fireMeasures, {
      sprinkler: 'спринклерна инсталация',
      extinguishers: 'пожарогасители',
      fire_alarm: 'пожароизвестяване',
      extra_water: 'допълнителен водоизточник',
    }),
    Choice(p.dayOccupancy, { working_hours: 'Check Box15', around_the_clock: 'Check Box16' }),
    Choice(p.yearOccupancy, { year_round: 'Check Box17', seasonal: 'Check Box18' }),

    // — Risk questions (ДА left / НЕ right) —
    ...YN(p.nearWater, 'Check Box21', 'Check Box22'),
    ...YN(p.landslideZone, 'Check Box19', 'Check Box20'),
    ...YN(p.hasDefects, 'ДА_4', 'НЕ_7'),
    T('Ако Да, моля дайте подробности_1', p.defectsDetails),
    ...YN(p.storesFlammable, 'ДА_3', 'НЕ_6'),
    ...YN(p.stockBelow10cm, 'ДА_2', 'НЕ_5'),
    ...YN(p.lossesLast3Years, 'ДА_1', 'НЕ_4'),
    T('хАко Да, моля дайте подробности', p.lossesDetails),
    ...YN(p.insuredElsewhere, 'ДА', 'НЕ_3'),
    T('Ако Да, моля дайте подробности', p.insuredElsewhereDetails),
    T('Моля, посочете други факти, които смятате за съществени при оценка на риска', p.otherFacts),

    // — Sum insured (page 2) —
    Choice(p.sumBasis, {
      actual: 'Действителна стойност (пазарна)',
      reinstatement: 'Възстановителна стойност',
      agreed: 'Договорена',
      other: 'Друга_1',
    }),
    Choice(p.currency, { BGN: 'Вид валута: BGN', EUR: 'EUR' }),
    T('Обща стойност', money(p.totalSum), { align: 'right' }),

    // — Coverage sub-limits (page 2) —
    T('Счупване на стъкла', p.glassLimit, { align: 'right' }),
    T('Гражданска отговорност към трети лица', p.liabilityLimit, { align: 'right' }),
  ];
};
