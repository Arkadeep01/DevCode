/**
 * Study topic mapping (Layer B / Layer I).
 *
 * The coach must never invent Study topic ids: every id it emits has to exist
 * in the frontend Study hub. The ids below are the stable slugs used by
 * `src/data/topicBank/*`, so the API and the SPA agree on one vocabulary.
 *
 * Resolution is deterministic and pure:
 *   1. the question track decides which topics are eligible,
 *   2. the trusted focus area is matched against each eligible topic's
 *      keywords (the first match wins),
 *   3. otherwise the track's primary topic is used.
 * An unknown track yields `null` — no topic — rather than a guess.
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

/** Keywords that anchor a focus area to a topic. */
const TOPIC_KEYWORDS: Record<StudyTopicId, string[]> = {
  'dsa-binary-search-answer': [
    'binary search',
    'logarithmic divide',
    'divide-and-conquer',
    'monotonic',
    'search space',
  ],
  'dsa-reverse-linkedlist': ['reverse', 'reversal', 'next pointer'],
  'dsa-floyd-cycle': ['cycle', 'floyd', 'tortoise', 'hare', 'linked list', 'linkedlist'],
  'dsa-sliding-window': [
    'sliding window',
    'two pointers',
    'subarray',
    'prefix sum',
    'contiguous array',
  ],
  'must-b-trees-vs-hash': [
    'b-tree',
    'b+ tree',
    'hash index',
    'hash map',
    'hashmap',
    'two sum',
    'key-value',
    'composite index',
    'covering index',
    'leftmost prefix',
  ],
  'must-process-vs-thread': [
    'process',
    'thread',
    'virtual memory',
    'paging',
    'epoll',
    'concurrency',
    'lock-striping',
    'cache coherency',
    'false sharing',
    'address space',
  ],
  'must-http-vs-https': [
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
    'tcp',
    'udp',
    'handshake',
    'time_wait',
  ],
  'must-deadlock-bankers': ['deadlock', 'coffman', 'banker'],
  'db-where-vs-having': [
    'where',
    'having',
    'join',
    'group by',
    'query execution order',
    'truncate',
    'primary key',
    'relational',
    'n+1',
    'eager loading',
  ],
  'db-acid-isolation-levels': [
    'isolation level',
    'transaction',
    'mvcc',
    'phantom',
    'acid',
    'crash recovery',
    'write-ahead',
    'wal',
  ],
  'db-rest-vs-graphql-grpc': [
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
    'api ',
  ],
  'lang-shallow-vs-deep-copy': [
    'shallow',
    'deep copy',
    'copy',
    'immutab',
    'identity',
    'mutable default',
    'metaclass',
    'mro',
    'garbage collection',
    'scope',
    'closure',
    'prototype chain',
  ],
  'lang-overload-vs-override': [
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
  'lang-pointers-vs-references': [
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
  ],
  'lang-java-gc-generations': [
    'garbage',
    'generational',
    'jvm',
    'zgc',
    'classloader',
    'loom',
    'virtual thread',
    'volatile',
    'stringbuilder',
    'hashcode',
    'exception',
    'concurrent',
    'string ',
  ],
};

/**
 * Eligible topics per question track, most specific first. The first entry is
 * the track's primary topic and the fallback when no keyword matches.
 */
const CATEGORY_CANDIDATES: Record<string, StudyTopicId[]> = {
  dsa: [
    'dsa-binary-search-answer',
    'dsa-reverse-linkedlist',
    'dsa-floyd-cycle',
    'dsa-sliding-window',
    'must-b-trees-vs-hash',
    'must-process-vs-thread',
  ],
  system_design: [
    'db-rest-vs-graphql-grpc',
    'must-b-trees-vs-hash',
    'must-process-vs-thread',
  ],
  oop: [
    'lang-overload-vs-override',
    'lang-shallow-vs-deep-copy',
    'lang-pointers-vs-references',
    'lang-java-gc-generations',
  ],
  sql: [
    'db-acid-isolation-levels',
    'db-where-vs-having',
    'must-b-trees-vs-hash',
  ],
  web: ['must-http-vs-https', 'must-process-vs-thread'],
  os: ['must-process-vs-thread', 'must-deadlock-bankers', 'must-http-vs-https'],
  python: [
    'lang-shallow-vs-deep-copy',
    'lang-java-gc-generations',
    'lang-overload-vs-override',
  ],
  cpp: ['lang-pointers-vs-references', 'lang-overload-vs-override'],
  java: ['lang-java-gc-generations', 'lang-overload-vs-override'],
  javascript: [
    'lang-shallow-vs-deep-copy',
    'lang-overload-vs-override',
    'lang-pointers-vs-references',
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

  const candidates = CATEGORY_CANDIDATES[category];
  if (!candidates || candidates.length === 0) return null;

  const haystack = (focusArea ?? '').toLowerCase();

  if (haystack) {
    for (const candidate of candidates) {
      const keywords = TOPIC_KEYWORDS[candidate];
      if (keywords.some((keyword) => haystack.includes(keyword))) {
        return candidate;
      }
    }
  }

  return candidates[0] ?? null;
}
