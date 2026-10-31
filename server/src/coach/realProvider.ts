import { CoachProviderError, CoachProviderUnavailableError } from './errors.js';
import { CoachResponseSchema } from './contracts.js';
import type { CoachContext } from './types.js';
import type { CoachProvider } from './provider.js';
import { env } from '../config/env.js';
import { buildCoachMessages, type CoachChatMessage } from './prompt.js';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
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

export class RealCoachProvider implements CoachProvider {
  readonly name = 'openai';

  async generate(ctx: CoachContext): Promise<unknown> {
    if (!env.COACH_API_KEY) {
      throw new CoachProviderUnavailableError('Coach provider API key is not configured');
    }

    const completion = await this.complete(buildCoachMessages(ctx));
    const content = completion?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new CoachProviderError('Coach provider returned an empty completion');
    }

    const parsed = CoachResponseSchema.safeParse(extractJson(content));

    if (!parsed.success) {
      throw new CoachProviderError('Coach provider returned an invalid coach response');
    }

    return parsed.data;
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
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new CoachProviderError(`Coach provider request failed with status ${response.status}`);
    }

    return (await response.json()) as ChatCompletionResponse;
  }
}