/**
 * Study topic mapping (Layer B / Layer I).
 *
 * The coach must never invent Study topic ids: every id it emits has to exist
 * in the frontend Study hub. The ids below are the stable slugs used by
 * `src/data/topicBank/*`, so the API and the SPA agree on one vocabulary.
 *
 * Resolution is deterministic and pure: focus-area keywords refine the
 * category default, and an unknown category yields `null` (no topic) rather
 * than a guess.
 */

export const STUDY_TOPIC_IDS = [
  'dsa-sliding-window',
  'dsa-reverse-linkedlist',
  'dsa-floyd-cycle',
  'dsa-binary-search-answer',
  'must-process-vs-thread',
  'must-http-vs-https',
  'must-deadlock-bankers',
  'must-b-trees-vs-hash',
  'db-where-vs-having',
  'db-acid-isolation-levels',
  'db-rest-vs-graphql-grpc',
  'lang-shallow-vs-deep-copy',
  'lang-overload-vs-override',
  'lang-pointers-vs-references',
  'lang-java-gc-generations',
] as const;

export type StudyTopicId = (typeof STUDY_TOPIC_IDS)[number];

const TOPIC_ID_SET = new Set<string>(STUDY_TOPIC_IDS);

/** True when the id is one of the existing Study topics. */
export function isStudyTopicId(value: string): value is StudyTopicId {
  return TOPIC_ID_SET.has(value);
}

/** Default topic per quiz track, used when no keyword rule matches. */
const CATEGORY_DEFAULT: Record<string, StudyTopicId> = {
  dsa: 'dsa-sliding-window',
  system_design: 'db-rest-vs-graphql-grpc',
  oop: 'lang-overload-vs-override',
  sql: 'db-where-vs-having',
  web: 'must-http-vs-https',
  os: 'must-process-vs-thread',
  python: 'lang-shallow-vs-deep-copy',
  cpp: 'lang-pointers-vs-references',
  java: 'lang-java-gc-generations',
  javascript: 'lang-shallow-vs-deep-copy',
};

interface TopicRule {
  topicId: StudyTopicId;
  /** Lower-case keywords; a match anywhere in the focus area wins. */
  keywords: string[];
}

/**
 * Keyword rules per track. Evaluated in order; the first match wins, so more
 * specific rules are listed first.
 */
const RULES: Record<string, TopicRule[]> = {
  dsa: [
    {
      topicId: 'dsa-binary-search-answer',
      keywords: ['binary search', 'logarithmic divide', 'monotonic', 'search space'],
    },
    { topicId: 'dsa-floyd-cycle', keywords: ['cycle', 'floyd', 'tortoise', 'hare'] },
    { topicId: 'dsa-reverse-linkedlist', keywords: ['reverse', 'next pointer'] },
    {
      topicId: 'dsa-sliding-window',
      keywords: ['sliding window', 'two pointers', 'subarray', 'prefix sum', 'contiguous array'],
    },
  ],
  sql: [
    {
      topicId: 'db-acid-isolation-levels',
      keywords: [
        'isolation level',
        'transaction',
        'mvcc',
        'phantom',
        'acid',
        'crash recovery',
        'write-ahead',
        'wal',
      ],
    },
    {
      topicId: 'db-where-vs-having',
      keywords: [
        'where',
        'having',
        'join',
        'group by',
        'query execution order',
        'truncate',
        'primary key',
        'relational',
        'index',
      ],
    },
  ],
  web: [
    {
      topicId: 'must-http-vs-https',
      keywords: [
        'http',
        'https',
        'tls',
        'cookie',
        'csrf',
        'cors',
        'jwt',
        'websocket',
        'status code',
        'idempotency',
        'header',
      ],
    },
  ],
  os: [
    { topicId: 'must-deadlock-bankers', keywords: ['deadlock', 'coffman', 'banker'] },
    {
      topicId: 'must-process-vs-thread',
      keywords: [
        'process',
        'thread',
        'virtual memory',
        'paging',
        'epoll',
        'concurrency',
        'lock-striping',
        'cache coherency',
        'false sharing',
      ],
    },
    { topicId: 'must-http-vs-https', keywords: ['tcp', 'udp', 'handshake', 'time_wait'] },
  ],
  java: [
    {
      topicId: 'lang-java-gc-generations',
      keywords: [
        'garbage',
        'generational',
        'jvm',
        'zgc',
        'classloader',
        'loom',
        'virtual thread',
        'volatile',
        'string',
        'hashcode',
        'exception',
        'concurrent',
      ],
    },
  ],
  cpp: [
    {
      topicId: 'lang-pointers-vs-references',
      keywords: [
        'pointer',
        'reference',
        'move semantics',
        'rvalue',
        'smart pointer',
        'raii',
        'destructor',
        'make_shared',
        'perfect forwarding',
        'constexpr',
        'consteval',
        'immutability',
      ],
    },
  ],
  python: [
    {
      topicId: 'lang-shallow-vs-deep-copy',
      keywords: [
        'shallow',
        'deep',
        'copy',
        'immutab',
        'identity',
        'mutable default',
        'metaclass',
        'inheritance',
        'mro',
        'garbage collection',
      ],
    },
  ],
  javascript: [
    {
      topicId: 'lang-shallow-vs-deep-copy',
      keywords: [
        'scope',
        'closure',
        'shallow',
        'deep',
        'immutab',
        'prototype chain',
        'binding',
      ],
    },
  ],
  oop: [
    {
      topicId: 'lang-overload-vs-override',
      keywords: [
        'overload',
        'override',
        'polymorph',
        'vtable',
        'dispatch',
        'inheritance',
        'composition',
        'encapsulation',
        'solid',
        'decorator',
        'singleton',
        'architecture',
        'ddd',
        'value object',
      ],
    },
  ],
  system_design: [
    {
      topicId: 'db-rest-vs-graphql-grpc',
      keywords: [
        'rest',
        'graphql',
        'grpc',
        'rate limiting',
        'token bucket',
        'cdn',
        'proxy',
        'consistent hashing',
        'raft',
        'consensus',
        'cap theorem',
        'scaling',
        'lsm-tree',
        'b+ tree',
        'api',
      ],
    },
  ],
};

/**
 * Resolves the Study topic for a question.
 *
 * @param category Question track (dsa, sql, web, ...).
 * @param focusArea Trusted focus area text; may be null.
 * @returns An existing Study topic id, or null when nothing matches.
 */
export function resolveStudyTopicId(
  category: string | null,
  focusArea: string | null,
): StudyTopicId | null {
  if (!category) return null;

  const haystack = (focusArea ?? '').toLowerCase();
  const rules = RULES[category];

  if (rules && haystack) {
    for (const rule of rules) {
      if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
        return rule.topicId;
      }
    }
  }

  return CATEGORY_DEFAULT[category] ?? null;
}
