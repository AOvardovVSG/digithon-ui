import { Agent } from '@mastra/core/agent';
import { INSURANCE_SYSTEM_PROMPT } from '../prompts/insurance-system-prompt';

/**
 * The model is read from env (OPENAI_MODEL). Default gpt-5.5 — the strongest model for
 * reasoning over many documents + structured output. Cheaper alternative: gpt-5.4-mini.
 * We use Mastra's model-router string ("openai/<model>"), which reads OPENAI_API_KEY
 * from the environment.
 */
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.5';

export const insuranceComparisonAgent = new Agent({
  id: 'insurance-comparison-agent',
  name: 'Insurance Offer Comparison Agent',
  description:
    'Сравнява застрахователни оферти (PDF/Excel/Word) от различни застрахователи и препоръчва най-добрата и най-изгодна за клиента.',
  instructions: INSURANCE_SYSTEM_PROMPT,
  model: `openai/${MODEL}`,
});
