import type { Adapter } from '../adapter-kit';
import { Choice, T } from '../adapter-kit';

/**
 * Adapter for "ЗК УНИКА" — "Предложение-въпросник: Имущество в малки и средни предприятия".
 * Field names are fully auto-generated (`Text1`, `Button7`); all mappings were confirmed by
 * position against the overlay (scripts/overlay-fields.mjs). Maps the Застраховащ/Застрахован
 * parties, the "В качеството му на" qualification and the policy period.
 */
export const uniqaAdapter: Adapter = (p) => {
  const ins = p.insured ?? {};
  const ip = p.insuringParty ?? {};
  return [
    // — Застраховащ (insuring party) —
    T('Text1', ip.name),
    T('Text2', ip.idNumber),
    T('Text3', ip.regAddress),

    // — Застрахован (insured) —
    T('Text4', ins.name),
    T('Text6', ins.idNumber),
    T('Text5', ins.regAddress),

    // — В качеството му на (owner / tenant / other) —
    Choice(p.usedBy, { owner: 'Button7', tenant: 'Button8', other: 'Button9' }),

    // — Срок на застраховката (начало / край) —
    T('Text10', p.startDate),
    T('Text11', p.endDate),
  ];
};
