import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { insuranceComparisonAgent } from './agents/insurance-comparison-agent';

/**
 * The single Mastra instance. Import it only from server-side code
 * (route handlers / server actions) — never from 'use client' files.
 */
export const mastra = new Mastra({
  agents: { insuranceComparisonAgent },
  logger: new PinoLogger({ name: 'digithon-ui', level: 'info' }),
});
