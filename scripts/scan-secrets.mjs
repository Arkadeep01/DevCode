#!/usr/bin/env node
/**
 * Fails the build when a credential is committed to the repository.
 *
 * The scan is intentionally small and dependency-free so it can run in CI
 * without an external account, an upload of the source, or a licence key. It
 * looks at the *tracked* files only (the working tree and the build output
 * are irrelevant) and reports the file and line, never the secret itself.
 *
 * Run with: node scripts/scan-secrets.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const ALLOWED_FILE_SUFFIXES = ['.example', '.template', '.sample'];
const ALLOWED_FILES = new Set(['scripts/scan-secrets.mjs']);

/** Values that are documentation, not credentials. */
const ALLOWED_VALUES = new Set([
  '',
  'replace-me-with-a-long-random-string',
  'replace-with-a-long-random-string',
  'change-me',
  'your-key-here',
  '<your key>',
]);

/** High-signal credential shapes. The value is never printed. */
const SECRET_PATTERNS = [
  { name: 'private key', regex: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/ },
  { name: 'AWS access key id', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'OpenAI-style API key', regex: /\bsk-[A-Za-z0-9_-]{32,}\b/ },
  { name: 'GitHub token', regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'Slack token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Google API key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Stripe live key', regex: /\bsk_live_[0-9a-zA-Z]{16,}\b/ },
];

/** Assignments where the *value* is the sensitive part. */
const SECRET_ASSIGNMENTS = [
  { name: 'JWT_SECRET', regex: /^\s*JWT_SECRET\s*=\s*(.*)$/ },
  { name: 'COACH_API_KEY', regex: /^\s*COACH_API_KEY\s*=\s*(.*)$/ },
  { name: 'DATABASE_URL', regex: /^\s*DATABASE_URL\s*=\s*(.*)$/ },
];

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.yml',
  '.yaml',
  '.env',
  '.example',
  '.md',
  '.sql',
  '.sh',
  '.txt',
  '.html',
  '.css',
]);

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

function isScannable(file) {
  if (ALLOWED_FILES.has(file)) return false;
  if (ALLOWED_FILE_SUFFIXES.some((suffix) => file.endsWith(suffix))) return false;
  if (file.includes('/node_modules/') || file.startsWith('node_modules/')) return false;
  if (file.startsWith('dist/') || file.includes('/dist/')) return false;
  return true;
}

function isTextFile(file) {
  const extension = extname(file);
  if (extension === '') return file.includes('.env');
  if (!TEXT_EXTENSIONS.has(extension)) return false;

  try {
    return statSync(file).size < 2_000_000;
  } catch {
    return false;
  }
}

function isPlaceholder(value) {
  const trimmed = value.trim().replace(/^["']|["']$/g, '');
  if (ALLOWED_VALUES.has(trimmed)) return true;
  return /^(replace|change|your|example|placeholder|<)/i.test(trimmed);
}

const findings = [];

for (const file of trackedFiles()) {
  if (!isScannable(file) || !isTextFile(file)) continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const { name, regex } of SECRET_PATTERNS) {
      if (regex.test(line)) {
        findings.push({ file, line: index + 1, name });
      }
    }

    for (const { name, regex } of SECRET_ASSIGNMENTS) {
      const match = regex.exec(line);
      if (match && !isPlaceholder(match[1])) {
        findings.push({ file, line: index + 1, name });
      }
    }
  });
}

if (findings.length > 0) {
  console.error('Secret scan failed. Potential credentials found in tracked files:');
  for (const finding of findings) {
    console.error(`  - ${finding.file}:${finding.line} (${finding.name})`);
  }
  console.error('\nRotate the exposed credential, then remove it from the repository.');
  process.exit(1);
}

console.log('Secret scan passed: no credentials found in tracked files.');
