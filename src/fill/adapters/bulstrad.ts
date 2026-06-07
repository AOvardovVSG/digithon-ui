import type { Adapter } from '../adapter-kit';
import { C, Choice, T } from '../adapter-kit';

/**
 * Adapter for "ЗАД Булстрад ВИГ" — Комбинирана застрахователна полица „Имущество".
 * The form is clause/inventory-heavy (per-item coverage tables = the exhaustive part we
 * leave to the broker); this maps the reliably-positioned core: the insured block, policy
 * period, beneficiary, sum-insured basis, property address, the glass clause and payment.
 */
export const bulstradAdapter: Adapter = (p) => {
  const ins = p.insured ?? {};
  const ip = p.insuringParty ?? {};
  const cov = p.coverages ?? {};

  return [
    // — Insured (т.1) —
    T('Text Field0', ins.name), // Наименование
    T('Text Field2', ins.idNumber), // ЕИК/ЕГН
    T('Text Field1', ins.regAddress), // Седалище и адрес на управление
    T('Text Field4', ins.phone), // Тел.
    T('Text Field5', ins.email), // е-mail
    T('Основна дейност', p.activity),

    // — Policy period (т.2) + beneficiary (т.3) —
    T('Период на застраховката: от', p.startDate),
    T('до', p.endDate),
    T('Трето ползващо се лице (ако има такова)', ip.name),

    // — Sum-insured basis —
    Choice(p.sumBasis, {
      actual: 'действителна стойност',
      reinstatement: 'възстановителна стойност',
    }),

    // — Property address (посочения по т.1 / друг адрес) —
    C('друг адрес', p.propertyAddress),
    T('друг адрес_1', p.propertyAddress),

    // — Glass cover (Клауза 005) —
    C('Клауза 005 „Стъкло” –', cov.glassBreakage),
    T('общ лимит', p.glassLimit, { align: 'right' }),

    // — Payment (once / instalments) —
    Choice(p.paymentMethod, {
      once: 'еднократно,',
      two: 'разсрочено на_1',
      four: 'разсрочено на_1',
    }),
  ];
};
