import { describe, expect, it } from 'vitest';
import { isStudyTopicId, resolveStudyTopicId, STUDY_TOPIC_IDS } from '../src/coach/topicMap.js';

describe('resolveStudyTopicId', () => {
  it('resolves a DSA focus area to a DSA topic', () => {
    expect(
      resolveStudyTopicId('dsa', 'Focus Area: Binary Search Logarithmic Divide-and-Conquer'),
    ).toBe('dsa-binary-search-answer');
  });

  it('resolves a linked list focus area to the cycle detection topic', () => {
    expect(resolveStudyTopicId('dsa', 'Focus Area: LRU Cache Hybrid Map-LinkedList Structure')).toBe(
      'dsa-floyd-cycle',
    );
  });

  it('resolves a SQL transaction focus area to the isolation levels topic', () => {
    expect(
      resolveStudyTopicId('sql', 'Focus Area: Transaction Isolation Levels & Phantom Reads'),
    ).toBe('db-acid-isolation-levels');
  });

  it('resolves a SQL join focus area to the where-vs-having topic', () => {
    expect(resolveStudyTopicId('sql', 'Focus Area: SQL Relational Joins & NULL Preservation')).toBe(
      'db-where-vs-having',
    );
  });

  it('resolves an operating system deadlock focus area to the deadlock topic', () => {
    expect(
      resolveStudyTopicId('os', 'Focus Area: Coffman Conditions for System Deadlock'),
    ).toBe('must-deadlock-bankers');
  });

  it('resolves a web focus area to the http topic', () => {
    expect(resolveStudyTopicId('web', 'Focus Area: Cookie Security Flags & XSS Mitigation')).toBe(
      'must-http-vs-https',
    );
  });

  it('resolves a java garbage collection focus area to the GC topic', () => {
    expect(
      resolveStudyTopicId('java', 'Focus Area: JVM Generational Garbage Collection Mechanics'),
    ).toBe('lang-java-gc-generations');
  });

  it('resolves a C++ ownership focus area to the pointers topic', () => {
    expect(
      resolveStudyTopicId('cpp', 'Focus Area: Smart Pointer Ownership Semantics'),
    ).toBe('lang-pointers-vs-references');
  });

  it('falls back to the track default when no keyword matches', () => {
    expect(resolveStudyTopicId('system_design', 'Focus Area: Something Unmapped')).toBe(
      'db-rest-vs-graphql-grpc',
    );
  });

  it('falls back to the track default when the focus area is missing', () => {
    expect(resolveStudyTopicId('python', null)).toBe('lang-shallow-vs-deep-copy');
  });

  it('returns null for an unknown track', () => {
    expect(resolveStudyTopicId('quantum', 'Focus Area: Entanglement')).toBeNull();
  });

  it('returns null when there is no category at all', () => {
    expect(resolveStudyTopicId(null, 'Focus Area: Arrays')).toBeNull();
  });

  it('never resolves to an id that is not a real study topic', () => {
    const categories = ['dsa', 'system_design', 'oop', 'sql', 'web', 'os', 'python', 'cpp', 'java', 'javascript'];
    const focusAreas = [
      'Focus Area: Two Sum Hash Map Linear Scan',
      'Focus Area: HTTP/2 Binary Framing & Stream Multiplexing',
      'Focus Area: VTable Function Pointer Dynamic Dispatch',
      'Focus Area: Coffman Conditions for System Deadlock',
    ];

    for (const category of categories) {
      for (const focusArea of focusAreas) {
        const topicId = resolveStudyTopicId(category, focusArea);
        if (topicId !== null) {
          expect(STUDY_TOPIC_IDS).toContain(topicId);
        }
      }
    }
  });
});

describe('isStudyTopicId', () => {
  it('accepts every known study topic id', () => {
    for (const topicId of STUDY_TOPIC_IDS) {
      expect(isStudyTopicId(topicId)).toBe(true);
    }
  });

  it('rejects an invented topic id', () => {
    expect(isStudyTopicId('dsa-not-a-real-topic')).toBe(false);
    expect(isStudyTopicId('FAKE_TOPIC_ID')).toBe(false);
  });
});
