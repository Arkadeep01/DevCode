import type { StudyTopic } from '../../types/topic';

export const DB_SYS_TOPICS: StudyTopic[] = [
  {
    id: 'db-where-vs-having',
    category: 'db_sys',
    categoryLabel: 'Database & System Fundamentals',
    title: 'SQL Execution Order & WHERE vs HAVING Clause',
    frequency: 'High Frequency',
    tags: ['high_freq', 'core'],
    difficulty: 'Easy - Medium',
    takeaway:
      '`WHERE` filters raw individual rows before aggregation occurs; `HAVING` filters aggregated group records after the `GROUP BY` clause completes.',
    deepDive: [
      '<strong>Logical Query Processing Order:</strong>',
      '1. <code>FROM</code> &amp; <code>JOIN</code> (construct base cartesian dataset)',
      '2. <code>WHERE</code> (filter pre-aggregated records)',
      '3. <code>GROUP BY</code> (aggregate rows into distinct buckets)',
      '4. <code>HAVING</code> (filter aggregated buckets using functions like COUNT, SUM, AVG)',
      '5. <code>SELECT</code> (project columns & evaluate window functions)',
      '6. <code>DISTINCT</code> &rarr; <code>ORDER BY</code> &rarr; <code>LIMIT / OFFSET</code>.',
    ],
    codeLang: 'SQL',
    codeSnippet: `-- Complete demonstration of WHERE vs HAVING
SELECT 
    department_id, 
    AVG(salary) AS avg_dept_salary,
    COUNT(employee_id) AS total_staff
FROM employees
WHERE status = 'ACTIVE'                -- Step 2: Filters individual rows BEFORE grouping
GROUP BY department_id                -- Step 3: Groups rows by department
HAVING COUNT(employee_id) >= 5        -- Step 4: Filters aggregated groups AFTER grouping
   AND AVG(salary) > 75000
ORDER BY avg_dept_salary DESC          -- Step 6: Sorts final projected results
LIMIT 10;`,
    pitfalls: [
      'Putting aggregate functions inside `WHERE` (e.g. `WHERE AVG(salary) > 50000`), which causes a syntax compilation error.',
      'Filtering non-aggregated column conditions in `HAVING` instead of `WHERE`, which prevents the query engine from using table indexes.',
      'Assuming `SELECT` aliases are accessible in the `WHERE` clause (they are not evaluated until step 5).',
    ],
  },
  {
    id: 'db-acid-isolation-levels',
    category: 'db_sys',
    categoryLabel: 'Database & System Fundamentals',
    title: 'ACID Properties & Transaction Isolation Levels',
    frequency: 'High Frequency',
    tags: ['high_freq', 'company_fav', 'core'],
    difficulty: 'Hard',
    takeaway:
      'ACID guarantees database reliability. Isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) trade off concurrency throughput against consistency anomalies.',
    deepDive: [
      '<strong>ACID Breakdown:</strong>',
      '• <strong>Atomicity:</strong> All modifications in transaction succeed, or all are rolled back (WAL / Undo Log).',
      '• <strong>Consistency:</strong> Preserves invariants, constraints, and relational cascades.',
      '• <strong>Isolation:</strong> Concurrent transactions do not interfere with one another.',
      '• <strong>Durability:</strong> Once committed, changes persist even across system crashes (WAL flushing to disk).',
      '<strong>Anomalies:</strong> Dirty Read (reading uncommitted data), Non-Repeatable Read (row value changes between reads), Phantom Read (new rows appear in range queries).',
      '<strong>Modern Engines:</strong> PostgreSQL and MySQL InnoDB use Multi-Version Concurrency Control (MVCC) to allow non-blocking snapshot reads.',
    ],
    codeLang: 'SQL Isolation Hierarchy',
    codeSnippet: `Isolation Level     | Dirty Read | Non-Repeatable | Phantom Read
--------------------+------------+----------------+-------------
Read Uncommitted    |    YES     |      YES       |     YES     
Read Committed      |     NO     |      YES       |     YES     
Repeatable Read     |     NO     |       NO       |   YES (MySQL MVCC fixes)
Serializable        |     NO     |       NO       |     NO      

-- Setting Isolation Level in SQL
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
  SELECT balance FROM accounts WHERE user_id = 101;
  -- MVCC ensures consistent read snapshot
COMMIT;`,
    pitfalls: [
      'Thinking Repeatable Read prevents Phantom Reads in all SQL engines (PostgreSQL and MySQL use MVCC to prevent most phantoms, but standard SQL-92 only guarantees it under Serializable).',
      'Using Serializable isolation everywhere without accounting for severe lock contention, serialization failures, and transaction aborts.',
      'Believing MongoDB or NoSQL databases provide full multi-table ACID without explicit replica set transactions.',
    ],
  },
  {
    id: 'db-rest-vs-graphql-grpc',
    category: 'db_sys',
    categoryLabel: 'Database & System Fundamentals',
    title: 'API Architectures: REST vs GraphQL vs gRPC',
    frequency: 'High Frequency',
    tags: ['high_freq', 'company_fav'],
    difficulty: 'Medium',
    takeaway:
      'REST is the de facto HTTP/JSON CRUD standard; GraphQL eliminates over/under-fetching for complex frontend clients; gRPC uses HTTP/2 and Protocol Buffers for high-throughput, low-latency microservice RPCs.',
    deepDive: [
      '<strong>REST:</strong> Resource-oriented, standard HTTP verbs (GET, POST, PUT, DELETE), universal caching via HTTP headers (ETag, Cache-Control). Downside: Over-fetching and N+1 endpoint round trips.',
      '<strong>GraphQL:</strong> Single endpoint, client requests exact schema shape. Prevents over-fetching. Downside: Complex caching, N+1 resolver queries on backend (requires DataLoader).',
      '<strong>gRPC:</strong> Binary Protocol Buffers over HTTP/2. Multiplexed streams, bidirectional streaming, strongly-typed contracts, 7-10x faster serialization than JSON. Ideal for inter-service communication.',
    ],
    codeLang: 'Protobuf vs JSON',
    codeSnippet: `// gRPC Protocol Buffer Definition (Schema Contract)
syntax = "proto3";

service UserService {
  rpc GetUserProfile (UserRequest) returns (UserResponse);
}

message UserRequest {
  string user_id = 1;
}

message UserResponse {
  string name = 1;
  string email = 2;
  repeated string roles = 3;
}
// Serialized to binary bytes (10x smaller and faster to parse than JSON text)`,
    pitfalls: [
      'Exposing raw gRPC directly to public web browsers without gRPC-Web proxies.',
      'Ignoring the N+1 query problem inside GraphQL nested resolvers (failing to batch queries with DataLoader).',
      'Using non-idempotent verbs (e.g. POST) when PUT or PATCH is semantically appropriate in REST.',
    ],
  },
];
