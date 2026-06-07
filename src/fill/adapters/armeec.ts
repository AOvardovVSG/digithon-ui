import type { Adapter } from '../adapter-kit';
import { C, Choice, T } from '../adapter-kit';

/**
 * Adapter for "ЗАД Армеец" — "Предложение-въпросник: Индустриален пожар".
 * Field names are auto-generated ("Text Field N" / "Check Box N", note the spaces); all
 * mappings confirmed by position against the overlay (scripts/overlay-fields.mjs). The form
 * separates ЗАСТРАХОВАЩ (insuring party) from ЗАСТРАХОВАН (insured). Per-object inventory /
 * coverage tables are left to the broker.
 */
export const armeecAdapter: Adapter = (p) => {
  const ins = p.insured ?? {};
  const ip = p.insuringParty ?? {};
  return [
    // — ЗАСТРАХОВАЩ (insuring party) —
    T('Text Field 4', ip.name),
    T('Text Field 13', ip.idNumber),
    T('Text Field 5', ip.regAddress),

    // — ЗАСТРАХОВАН (insured) —
    T('Text Field 7', ins.name),
    T('Text Field 16', ins.idNumber),
    T('Text Field 8', ins.regAddress),
    T('Text Field 17', ins.phone ?? ins.email),

    // — Policy period (от 00.00 ч. на … / до 23.59 часа на …) + object address —
    T('Text Field 22', p.startDate),
    T('Text Field 20', p.endDate),
    T('Text Field 197', p.propertyAddress),

    // — 1. Вид на дейността —
    T('Text Field 241', p.activity),

    // — 2. Предназначение на сградата —
    Choice(p.buildingType, {
      administrative: 'Check Box 674',
      storage: 'Check Box 673',
      production: 'Check Box 672',
      commercial: 'Check Box 671',
      other: 'Check Box 670',
    }),

    // — 3. Сградата/ите са (собствена / наета / друга) —
    Choice(p.usedBy, { owner: 'Check Box 664', tenant: 'Check Box 667', other: 'Check Box 668' }),

    // — 5. Въведена в експлоатация? (да / не) —
    C('Check Box 677', p.commissioned === 'yes'),
    C('Check Box 678', p.commissioned === 'no'),

    // — 6. Режим на работа —
    Choice(p.dayOccupancy, { working_hours: 'Check Box 662', around_the_clock: 'Check Box 663' }),
    C('Check Box 679', p.yearOccupancy === 'seasonal'), // armeec has no "year-round" box

    // — 8. Вид конструкция на сградата —
    Choice(p.wallConstruction, {
      reinforced_concrete: 'Check Box 639',
      brick: 'Check Box 638',
      metal: 'Check Box 640',
      wood: 'Check Box 641',
      other: 'Check Box 642',
    }),

    // — 9. Вид конструкция на покрива (no "tiles" option on this form) —
    Choice(p.roofConstruction, {
      reinforced_concrete: 'Check Box 645',
      metal: 'Check Box 654',
      wood: 'Check Box 655',
      other: 'Check Box 656',
    }),
  ];
};
