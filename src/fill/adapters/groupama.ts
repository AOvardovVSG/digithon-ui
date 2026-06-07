import type { Adapter } from '../adapter-kit';
import { T, YN } from '../adapter-kit';

/**
 * Adapter for "Групама Застраховане" — "Предложение-въпросник: Сигурност за Бизнеса".
 * Field names are auto-generated (`Text Field N`) and several share an instruction string,
 * so mappings here were confirmed by position against the overlay (scripts/overlay-fields.mjs):
 * the insured block, activity, place of insurance and policy period.
 */
export const groupamaAdapter: Adapter = (p) => {
  const ins = p.insured ?? {};
  return [
    // — Insured party —
    T('Text Field0', ins.name), // Кандидат за застраховане
    T('Text Field1', ins.idNumber), // ЕГН/БУЛСТАТ
    T('Text Field3', ins.regAddress), // Адрес на управл./регистрация
    T('Text Field2', ins.email), // e-mail
    T('* задължително поле за попълване', p.activity), // Предмет на дейност
    T('Text Field5', p.propertyAddress), // Място на застраховката

    // — Policy period —
    T('Text Field6', p.startDate), // от
    T('Text Field7', p.endDate), // до

    // — Risk да/не questions (only the ones matching our schema) —
    ...YN(p.insuredElsewhere, 'да_34', 'не_78'), // Q1: друга застраховка?
    ...YN(p.lossesLast3Years, 'Check Box6123', 'Check Box73213'), // Q4: щета (36 мес.)?
    ...YN(p.landslideZone, 'Check Box1645', 'Check Box1734'), // Q8: свлачищен район?
    ...YN(p.storesFlammable, 'Check Box223334', 'Check Box236565'), // Q11: силно запалими?
  ];
};
