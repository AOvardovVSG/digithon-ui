import type { Adapter } from '../adapter-kit';
import { allianzAdapter } from './allianz';
import { armeecAdapter } from './armeec';
import { bulgariaInsuranceAdapter } from './bulgaria-insurance';
import { bulstradAdapter } from './bulstrad';
import { groupamaAdapter } from './groupama';
import { ozkAdapter } from './ozk';
import { uniqaAdapter } from './uniqa';

/**
 * Provider id -> adapter. A provider is fillable iff it appears here; keep this in sync
 * with ADAPTER_READY in ../registry.ts (which is the client-safe mirror).
 */
export const ADAPTERS: Record<string, Adapter> = {
  allianz: allianzAdapter,
  armeec: armeecAdapter,
  'bulgaria-insurance': bulgariaInsuranceAdapter,
  bulstrad: bulstradAdapter,
  groupama: groupamaAdapter,
  ozk: ozkAdapter,
  uniqa: uniqaAdapter,
};
