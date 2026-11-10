import { CoachProviderError, CoachProviderUnavailableError } from './errors.js';
import { CoachProviderResponseSchema, CoachResponseSchema } from './contracts.js';
import type { CoachContext } from './types.js';
import type { CoachProvider } from './provider.js';
import { env } from '../config/env.js';
import { buildCoachMessages, type CoachChatMessage } from './prompt.js';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface UsageInfo {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

function extractJson(content: string): unknown {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new CoachProviderError('Coach provider response was not JSON shaped');
  }
  try {
    return JSON.parse(content.slice(start, end + 1)) as unknown;
  } catch {
    throw new CoachProviderError('Coach provider response was not valid JSON');
  }
}

/** Estimated cost per 1K tokens (USD). Conservative defaults; override via env if needed. */
const ESTIMATED_COST_PER_1K_TOKENS = 0.00015;

/** In-memory daily cost tracker. Reset per process; good enough for a single server instance. */
let dailyCostCents = 0;
let dailyCostDay: string | null = null;

function resetDailyCostIfNeeded(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyCostDay !== today) {
    dailyCostDay = today;
    dailyCostCents = 0;
  }
}

function recordUsage(tokens: number): void {
  resetDailyCostIfNeeded();
  const costCents = (tokens / 1000) * ESTIMATED_COST_PER_1K_TOKENS * 100;
  dailyCostCents += costCents;
}

export function getDailyCostCents(): number {
  resetDailyCostIfNeeded();
  return dailyCostCents;
}

export function getDailyCostLimitCents(): number {
  return (env.COACH_DAILY_TOKEN_BUDGET / 1000) * ESTIMATED_COST_PER_1K_TOKENS * 100;
}

export function isDailyCostLimitExceeded(): boolean {
  return getDailyCostCents() >= getDailyCostLimitCents();
}

export class RealCoachProvider implements CoachProvider {
  readonly name = 'openai';

  private readonly maxRetries: number;

  constructor(maxRetries = 2) {
    this.maxRetries = maxRetries;
  }

  async generate(ctx: CoachContext): Promise<unknown> {
    if (!env.COACH_API_KEY) {
      throw new CoachProviderUnavailableError('Coach provider API key is not configured');
    }

    if (isDailyCostLimitExceeded()) {
      throw new CoachProviderUnavailableError(
        'Coach provider daily cost limit has been reached',
      );
    }

    const messages = buildCoachMessages(ctx);
    let lastError: unknown = null;

    // Try once, then retry on transient failures. Schema-invalid output is
    // retried at most once (the second attempt also uses schema validation).
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const completion = await this.complete(messages);
        const content = completion?.choices?.[0]?.message?.content;

        if (typeof content !== 'string' || content.trim().length === 0) {
          throw new CoachProviderError('Coach provider returned an empty completion');
        }

        const draft = CoachProviderResponseSchema.safeParse(extractJson(content));

        if (!draft.success) {
          // Retry schema-invalid output at most once.
          if (attempt < this.maxRetries) {
            continue;
          }
          throw new CoachProviderError('Coach provider returned an invalid coach response');
        }

        // The server owns the `aiGenerated` marker, so the model never has to.
        const parsed = CoachResponseSchema.safeParse({
          ...draft.data,
          practiceQuestions: draft.data.practiceQuestions.map((question) => ({
            ...question,
            aiGenerated: true,
          })),
        });

        if (!parsed.success) {
          if (attempt < this.maxRetries) {
            continue;
          }
          throw new CoachProviderError('Coach provider returned an invalid coach response');
        }

        // Record usage from the completion if the provider reported it.
        const usage = (completion as { usage?: UsageInfo }).usage;
        if (usage?.totalTokens) {
          recordUsage(usage.totalTokens);
        }

        return parsed.data;
      } catch (error) {
        lastError = error;
        if (error instanceof CoachProviderUnavailableError) throw error;
        if (error instanceof CoachProviderError && error.statusCode === 502) {
          // Schema-invalid: only retry if we have attempts left.
          if (attempt < this.maxRetries) continue;
        }
        // Transient failures: retry if attempts remain.
        if (attempt < this.maxRetries) continue;
        throw error;
      }
    }

    throw lastError ?? new CoachProviderError('Coach provider failed after retries');
  }

  private async complete(messages: CoachChatMessage[]): Promise<ChatCompletionResponse> {
    const response = await fetch(`${env.COACH_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.COACH_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.COACH_MODEL,
        max_tokens: env.COACH_MAX_OUTPUT_TOKENS,
        response_format: { type: 'json_object' },
        messages: messages.map((message) => ({ role: message.role, content: message.content })),
      }),
      signal: AbortSignal.timeout(env.COACH_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      // 4xx means the request itself is wrong (bad key, bad payload); 5xx is
      // an upstream failure. Both surface as a clean 502 to the client.
      throw new CoachProviderError(`Coach provider request failed with status ${response.status}`);
    }

    return (await response.json()) as ChatCompletionResponse;
  }
}
