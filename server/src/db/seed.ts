#!/usr/bin/env node
/**
 * Seeds the canonical `questions` table from the frontend question bank.
 *
 * The server owns the canonical copy of every question (slug, prompt, options,
 * correct index, explanation, focus area). The frontend bank stays the source
 * of truth; this script mirrors it into the database.
 *
 * Run with: npm run db:seed
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { questions } from './schema.js';
import {
  createDatabaseClient,
  describeDatabaseTarget,
  isRemoteDatabaseUrl,
} from '../config/database.js';
import { repoRoot } from '../config/paths.js';

interface FrontendQuestion {
  id: string;
  category: string;
  categoryLabel: string;
  difficulty: string;
  question: string;
  codeSnippet: string | null;
  options: string[];
  correctIndex: number;
  explanation: string;
  focusArea: string;
}

const BANKS = [
  'dsa',
  'systemDesign',
  'oop',
  'sql',
  'web',
  'os',
  'python',
  'cpp',
  'java',
  'javascript',
] as const;

/**
 * Locates the repository root that holds `src/data/questionBank`.
 *
 * In a production image the frontend bank is copied next to the server
 * package, so the layout is `<root>/src/data/questionBank`. The working
 * directory is only used as a fallback for unusual invocations.
 */
function projectRoot(): string {
  const candidates = [repoRoot, resolve(process.cwd(), '..'), process.cwd()];

  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'src/data/questionBank'))) return candidate;
  }

  return repoRoot;
}

/**
 * Refuses to seed a production database unless the operator opts in
 * explicitly, so a stray script run cannot overwrite the canonical questions.
 *
 * The guard triggers on the *target*, not only on `NODE_ENV`: a remote
 * libSQL/Turso database is a production database whatever the environment
 * says, and `server/.env` may well still say `development`.
 */
function assertSeedAllowed(databaseUrl: string): void {
  const nodeEnv = (process.env.NODE_ENV ?? 'development').trim();
  const allowed = (process.env.SEED_ALLOW_PRODUCTION ?? '').trim().toLowerCase();
  const remote = isRemoteDatabaseUrl(databaseUrl);

  if ((remote || nodeEnv === 'production') && allowed !== 'true') {
    console.error(
      `[seed] refusing to seed a production database (${describeDatabaseTarget(databaseUrl)}). ` +
        'Set SEED_ALLOW_PRODUCTION=true to override this guard.',
    );
    process.exit(1);
  }
}

/**
 * Loads one question bank file. The bank files are plain TypeScript data
 * modules, so stripping the type annotations leaves valid JavaScript that can
 * be evaluated without pulling the frontend build into the server.
 */
function loadQuestionsFromBank(bankName: string): FrontendQuestion[] {
  const bankPath = resolve(projectRoot(), `src/data/questionBank/${bankName}.ts`);
  const content = readFileSync(bankPath, 'utf-8');

  const jsContent = content
    .replace(/export const \w+_QUESTIONS: Question\[\] = /, 'const QUESTIONS = ')
    .replace(/;\s*$/, '')
    .replace(/interface Question \{[\s\S]*?\}/, '')
    .replace(/import type \{[\s\S]*?\} from '.*?';\n?/g, '')
    .replace(/import \{[\s\S]*?\} from '.*?';\n?/g, '')
    .replace(/: QuestionCategory/g, '')
    .replace(/: Difficulty/g, '')
    .replace(/: string \| null/g, '')
    .replace(/: string\[\]/g, '')
    .replace(/: string/g, '')
    .replace(/: number/g, '');

  const sandbox: Record<string, unknown> = {};
  try {
    eval(jsContent + '; sandbox.QUESTIONS = QUESTIONS;');
  } catch (error) {
    console.warn(`[seed] Failed to parse ${bankName}.ts:`, error);
    return [];
  }

  return (sandbox.QUESTIONS as FrontendQuestion[]) ?? [];
}

function loadAllQuestions(): FrontendQuestion[] {
  const all: FrontendQuestion[] = [];
  for (const bank of BANKS) {
    const bankQuestions = loadQuestionsFromBank(bank);
    console.log(`[seed] Loaded ${bankQuestions.length} questions from ${bank}`);
    all.push(...bankQuestions);
  }
  return all;
}

async function seed(): Promise<void> {
  console.log(`[seed] target database: ${databaseTarget}`);
  console.log('[seed] Loading question bank...');
  const questionBank = loadAllQuestions();
  console.log(`[seed] Loaded ${questionBank.length} questions from frontend bank`);
  const existing = await db.select().from(questions);
  const existingBySlug = new Map(existing.map((row) => [row.slug, row]));

  const toInsert = questionBank.filter((question) => !existingBySlug.has(question.id));
  const toBackfill = questionBank.filter((question) => {
    const row = existingBySlug.get(question.id);
    return row !== undefined && row.focusArea !== question.focusArea;
  });

  console.log(
    `[seed] ${toInsert.length} new questions, ${toBackfill.length} focus-area updates`,
  );

  if (toInsert.length > 0) {
    const batchSize = 100;
    for (let index = 0; index < toInsert.length; index += batchSize) {
      const batch = toInsert.slice(index, index + batchSize);
      await db
        .insert(questions)
        .values(
          batch.map((question) => ({
            slug: question.id,
            category: question.category,
            difficulty: question.difficulty,
            prompt: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            explanation: question.explanation,
            focusArea: question.focusArea,
          })),
        );
      console.log(`[seed] Inserted ${Math.min(index + batchSize, toInsert.length)}/${toInsert.length}`);
    }
  }

  for (const question of toBackfill) {
    await db
      .update(questions)
      .set({ focusArea: question.focusArea })
      .where(eq(questions.slug, question.id));
  }

  console.log('[seed] Seeding complete!');
}

/**
 * The database this script writes to.
 *
 * The seed is an operator tool, not the server: it reads `DATABASE_URL` and
 * `DATABASE_AUTH_TOKEN` straight from the environment, so it can be run
 * against a remote database without also supplying an unrelated server
 * secret such as `JWT_SECRET`.
 */
const databaseUrl = process.env.DATABASE_URL ?? './data/devcode.sqlite';
const authToken = process.env.DATABASE_AUTH_TOKEN;
const databaseTarget = describeDatabaseTarget(databaseUrl);

const client = createDatabaseClient(databaseUrl, authToken);
const db = drizzle(client, { schema: { questions } });

assertSeedAllowed(databaseUrl);
try {
  await seed();
} finally {
  client.close();
}