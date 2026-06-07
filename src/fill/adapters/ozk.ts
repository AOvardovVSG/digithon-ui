import type { Adapter } from '../adapter-kit';
import { T, YN } from '../adapter-kit';

/**
 * Adapter for "ЗАД ОЗК – Застраховане" — "Заявление-въпросник: Индустриален пожар".
 * Page 1 holds the core insured/property data and two risk questions; pages 2–3 are the
 * detailed property-inventory + per-clause tables (the "exhaustive" part we intentionally
 * leave for the broker), so this adapter focuses on the reliably-mappable core fields.
 */
export const ozkAdapter: Adapter = (p) => {
  const ins = p.insured ?? {};
  return [
    // — Insured party —
    T('Застрахован имена', ins.name),
    T('Булстат', ins.idNumber),
    T('Адрес за застрахованият', ins.regAddress ?? ins.corrAddress),
    T('Тел/факс застрахован', ins.phone),
    T('Предмет на дейност', p.activity),
    T('имуществата', p.propertyAddress),

    // — Risk questions (1: insured elsewhere?  2: losses in last 3 years?) —
    ...YN(p.insuredElsewhere, 'да', 'не'),
    ...YN(p.lossesLast3Years, 'да_1', 'не_1'),
    T('Моля, дайте подробности по въпросите с отговор “да”', p.lossesDetails ?? p.insuredElsewhereDetails),
  ];
};
