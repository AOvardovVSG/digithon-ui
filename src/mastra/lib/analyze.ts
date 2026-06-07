import { mastra } from '../index';
import type { ClientProfile } from '../schemas/input';
import { ComparisonResultSchema, type ComparisonResult, type Lang } from '../schemas/output';
import { filesToContentParts, type UploadedFile } from './document-parsing';
import { renderComparisonPdf, type RenderedPdf } from './report-pdf';

/**
 * Build a short Bulgarian description of the client profile to feed the agent.
 * (Bulgarian on purpose — it is prompt content for the Bulgarian agent.)
 */
function clientProfileText(profile: ClientProfile | null): string {
  if (!profile) {
    return 'Клиентът не е предоставил допълнителен профил. Направи обективно сравнение по добра практика.';
  }
  const lines: string[] = ['Профил на клиента (изисквания и потребности):'];
  if (profile.insuranceTypeHint) lines.push(`- Вид застраховка: ${profile.insuranceTypeHint}`);
  if (profile.budgetMaxAnnual != null) {
    lines.push(`- Максимален годишен бюджет: ${profile.budgetMaxAnnual} ${profile.currency ?? 'BGN'}`);
  }
  if (profile.priorities?.length) lines.push(`- Приоритети: ${profile.priorities.join(', ')}`);
  if (profile.riskAppetite) lines.push(`- Толерантност към риск: ${profile.riskAppetite}`);
  if (profile.subjectDetails) lines.push(`- Обект на застраховане: ${profile.subjectDetails}`);
  if (profile.currentInsurer) lines.push(`- Настоящ застраховател: ${profile.currentInsurer}`);
  if (profile.notes) lines.push(`- Бележки: ${profile.notes}`);
  return lines.join('\n');
}

export interface AnalyzeResult {
  result: ComparisonResult;
  pdf: RenderedPdf;
}

export interface AnalyzeOptions {
  /** Language to render the PDF report in. Defaults to Bulgarian. */
  reportLang?: Lang;
}

/**
 * Run the full pipeline: parse files -> single structured agent call -> render PDF.
 * The live OpenAI call requires OPENAI_API_KEY in the environment.
 */
export async function analyzeOffers(
  files: UploadedFile[],
  clientProfile: ClientProfile | null,
  options: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  const agent = mastra.getAgentById('insurance-comparison-agent');
  const fileParts = await filesToContentParts(files);

  const instruction =
    `${clientProfileText(clientProfile)}\n\n` +
    `По-долу са приложени ${files.length} оферти от различни застрахователи. ` +
    `Анализирай ги, попълни структурирания резултат (двуезично: bg и en) и определи коя е ` +
    `най-добрата и най-изгодна оферта за клиента.`;

  const response = await agent.generate(
    [
      {
        role: 'user',
        content: [{ type: 'text', text: instruction }, ...fileParts],
      },
    ],
    {
      structuredOutput: { schema: ComparisonResultSchema },
      // Reasoning effort for the main model (gpt-5.x). No `temperature` — reasoning
      // models reject it.
      providerOptions: { openai: { reasoningEffort: 'medium' } },
    },
  );

  // Validate at runtime: structured output can come back incomplete/empty if the
  // model truncates (the bilingual schema is large), and the typed `.object` does
  // not guarantee a complete, valid object.
  const parsed = ComparisonResultSchema.safeParse(response.object);
  if (!parsed.success) {
    throw new Error(`Model returned invalid or incomplete structured output: ${parsed.error.message}`);
  }
  const result = parsed.data;
  const pdf = await renderComparisonPdf(result, clientProfile, options.reportLang ?? 'bg');
  return { result, pdf };
}
