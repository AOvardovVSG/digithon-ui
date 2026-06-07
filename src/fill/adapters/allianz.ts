import type { Adapter } from '../adapter-kit';
import { Choice, T } from '../adapter-kit';

/**
 * Adapter for "Алианц България" — "Въпросник-предложение: Индустриален пожар".
 * The insured/period block has clean semantic field names; the coverage + property tables
 * are driven by ~300 auto-named checkboxes (the exhaustive part), so this maps the reliable
 * text core: the insured party, business activity, beneficiary and the policy period.
 */
export const allianzAdapter: Adapter = (p) => {
  const ins = p.insured ?? {};
  const ip = p.insuringParty ?? {};
  return [
    // — Insured party (т.1) —
    T('Име', ins.name),
    T('Булстат и Дан №', ins.idNumber),
    T('Адрес', ins.regAddress),
    T('тел/ факс', ins.phone),
    T('e-mail', ins.email),
    T('Предмет на дейност', p.activity),
    T('Ползващо лице', ip.name),

    // — Policy period (т.2) —
    T('от', p.startDate),
    T('до', p.endDate),

    // — 6. Конструкция на сградата (page 2) —
    T('Брой на персонала -', p.staffCount),
    T('Година на построяване', p.yearBuilt),
    T('етажност', p.floors),
    T('площ (РЗП)', p.areaSqm),
    Choice(p.wallConstruction, {
      reinforced_concrete: 'Check Box0',
      brick: 'Check Box1',
      metal: 'Check Box2',
      wood: 'Check Box3',
      other: 'Check Box4',
    }),
    Choice(p.roofConstruction, {
      reinforced_concrete: 'Check Box6',
      tiles: 'Check Box7',
      metal: 'Check Box8',
      wood: 'Check Box9',
      other: 'Check Box10',
    }),
  ];
};
