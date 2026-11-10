#!/usr/bin/env node
/**
 * Seeds the canonical `questions` table from the frontend question bank.
 *
 * The server owns the canonical copy of every question (slug, prompt, options,
 * correct index, explanation, focus area). The frontend bank stays the source
 * of truth; this script mirrors it into SQLite.
 *
 * Run with: npm run db:seed
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { questions } from './schema.js';
import 'dotenv/config';

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

function projectRoot(): string {
  // The script runs from the `server` folder (npm scripts), but stay robust
  // when it is invoked from the repository root.
  const cwd = process.cwd();
  return cwd.endsWith('server') ? resolve(cwd, '..') : cwd;
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

function seed(): void {
  const databaseUrl = process.env.DATABASE_URL ?? './data/devcode.sqlite';
  const file = resolve(process.cwd(), databaseUrl);
  mkdirSync(dirname(file), { recursive: true });

  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema: { questions } });

  console.log('[seed] Loading question bank...');
  const questionBank = loadAllQuestions();
  console.log(`[seed] Loaded ${questionBank.length} questions from frontend bank`);

  const existing = db.select().from(questions).all();
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
      db.insert(questions)
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
        )
        .run();
      console.log(`[seed] Inserted ${Math.min(index + batchSize, toInsert.length)}/${toInsert.length}`);
    }
  }

  for (const question of toBackfill) {
    db.update(questions)
      .set({ focusArea: question.focusArea })
      .where(eq(questions.slug, question.id))
      .run();
  }

  console.log('[seed] Seeding complete!');
  sqlite.close();
}

seed();
