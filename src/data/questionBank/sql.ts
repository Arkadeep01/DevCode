import type { Question } from '../../types/question';

export const SQL_QUESTIONS: Question[] = [
  {
    id: 'sql-b1', category: 'sql', categoryLabel: 'SQL & Databases', difficulty: 'Beginner',
    question: 'What is the key difference between the SQL `WHERE` clause and the `HAVING` clause?',
    codeSnippet: `SELECT department, AVG(salary) 
FROM employees 
WHERE status = 'Active' 
GROUP BY department 
HAVING AVG(salary) > 80000;`,
    options: [
      '`WHERE` filters individual rows before aggregation occurs; `HAVING` filters aggregated group rows after `GROUP BY` execution',
      '`WHERE` can only be used with primary keys; `HAVING` can be used with foreign keys',
      '`HAVING` filters rows before indexes are examined; `WHERE` runs in memory',
      '`WHERE` is strictly for numeric columns; `HAVING` is for string columns',
    ],
    correctIndex: 0,
    explanation: 'The SQL execution order applies `WHERE` to filter individual rows before grouping. After `GROUP BY` computes group aggregates, `HAVING` filters the aggregated results.',
    focusArea: 'Focus Area: SQL Query Execution Order & WHERE vs HAVING',
  },
  {
    id: 'sql-b2', category: 'sql', categoryLabel: 'SQL & Databases', difficulty: 'Beginner',
    question: 'What is the difference between an `INNER JOIN` and a `LEFT OUTER JOIN`?',
    codeSnippet: null,
    options: [
      '`INNER JOIN` keeps only rows matched in both tables; `LEFT OUTER JOIN` keeps all left rows, filling unmatched right columns with NULL',
      '`INNER JOIN` sorts joined rows in ascending order; `LEFT JOIN` sorts them in descending order',
      '`LEFT JOIN` only works when the join column is indexed; `INNER JOIN` works on unindexed columns',
      '`INNER JOIN` requires both tables to be stored inside the same physical database file',
    ],
    correctIndex: 0,
    explanation: 'An INNER JOIN discards rows that lack a matching key in either table. A LEFT JOIN preserves every row from the left table, filling missing values from the right table with NULL.',
    focusArea: 'Focus Area: SQL Relational Joins & NULL Preservation',
  },
  {
    id: 'sql-b3', category: 'sql', categoryLabel: 'SQL & Databases', difficulty: 'Beginner',
    question: 'What does the `PRIMARY KEY` constraint enforce on a table column?',
    codeSnippet: null,
    options: [
      'Both uniqueness (no duplicate values) and NOT NULL constraint across all rows',
      'That values are automatically encrypted at rest and indexed with a separate key vault',
      'That the column must be a 64-bit auto-increment integer managed directly by storage hardware',
      'That only privileged roles may update the column while reads remain publicly visible',
    ],
    correctIndex: 0,
    explanation: 'A PRIMARY KEY uniquely identifies each record in a database table. It inherently enforces both UNIQUE and NOT NULL constraints on the indexed column.',
    focusArea: 'Focus Area: Primary Key Relational Invariants',
  },
  {
    id: 'sql-i1', category: 'sql', categoryLabel: 'SQL & Databases', difficulty: 'Intermediate',
    question: 'Given a composite B-Tree index created as `INDEX idx_emp (department_id, salary, hire_date)`, which query CANNOT efficiently leverage this index?',
    codeSnippet: `-- Index: (department_id, salary, hire_date)
-- Query A: WHERE department_id = 4 AND salary > 80000
-- Query B: WHERE salary > 80000 AND hire_date > '2023-01-01'
-- Query C: WHERE department_id = 10
-- Query D: WHERE department_id = 4 AND salary = 90000 AND hire_date > '2020-01-01'`,
    options: [
      "Query B (WHERE salary > 80000 AND hire_date > '2023-01-01')",
      'Query A (WHERE department_id = 4 AND salary > 80000)',
      'Query C (WHERE department_id = 10)',
      "Query D (WHERE department_id = 4 AND salary = 90000 AND hire_date > '2020-01-01')",
    ],
    correctIndex: 0,
    explanation: 'Composite B-Tree indexes obey the Leftmost Prefix Rule. Query B omits the leading column `department_id`, meaning the query planner cannot seek the index tree and must perform a full table scan.',
    focusArea: 'Focus Area: B-Tree Composite Index Leftmost Prefix Rule',
  },
  {
    id: 'sql-i2', category: 'sql', categoryLabel: 'SQL & Databases', difficulty: 'Intermediate',
    question: 'In SQL, what is the N+1 Query Problem commonly introduced by Object-Relational Mappers (ORMs)?',
    codeSnippet: `// 1 query to fetch N users
const users = await User.findAll(); 
for (const user of users) {
    // N separate queries to fetch posts!
    const posts = await Post.findByUser(user.id);
}`,
    options: [
      "Running 1 query for all parent records, then N queries to fetch each parent's children rather than joining",
      'Inserting N child rows into a table without specifying their primary keys',
      'Running recursive Common Table Expressions without a termination condition',
      'Exceeding the maximum allowed connection pool limit by exactly one connection',
    ],
    correctIndex: 0,
    explanation: 'The N+1 problem occurs when an application executes 1 query for parent records, then iterates over each of the N parents executing a separate query for related child records, causing significant network round-trip overhead.',
    focusArea: 'Focus Area: ORM N+1 Query Problem & Eager Loading',
  },
  {
    id: 'sql-i3', category: 'sql', categoryLabel: 'SQL & Databases', difficulty: 'Intermediate',
    question: 'What is the functional difference between `DELETE FROM users;` and `TRUNCATE TABLE users;`?',
    codeSnippet: null,
    options: [
      '`TRUNCATE` is DDL that deallocates data pages and resets auto-increment counters; `DELETE` is DML that removes and logs rows one by one',
      '`DELETE` drops the entire table schema and its indexes, while `TRUNCATE` preserves the schema',
      '`TRUNCATE` can be filtered with a `WHERE` clause, whereas `DELETE` always clears every row',
      '`DELETE` always executes faster than `TRUNCATE` even on very large production tables',
    ],
    correctIndex: 0,
    explanation: 'TRUNCATE is a DDL command that quickly re-initializes table data by deallocating data pages with minimal transaction logging. DELETE scans and deletes rows one by one, firing triggers and logging each row.',
    focusArea: 'Focus Area: TRUNCATE vs DELETE Transaction Mechanics',
  },
  {
    id: 'sql-a1', category: 'sql', categoryLabel: 'SQL & Databases', difficulty: 'Advanced',
    question: "In SQL transaction isolation levels, what anomaly occurs when Transaction 1 re-reads a range of rows and discovers new 'phantom' rows inserted and committed by Transaction 2?",
    codeSnippet: null,
    options: ['Phantom Read', 'Dirty Read', 'Non-Repeatable Read (Fuzzy Read)', 'Write Skew'],
    correctIndex: 0,
    explanation: 'A Phantom Read occurs when a transaction queries a range of rows satisfying a condition twice, and sees newly committed rows matching the filter on the second read. Preventing this requires SERIALIZABLE isolation (predicate/range locks).',
    focusArea: 'Focus Area: Transaction Isolation Levels & Phantom Reads',
  },
  {
    id: 'sql-a2', category: 'sql', categoryLabel: 'SQL & Databases', difficulty: 'Advanced',
    question: 'How does Multi-Version Concurrency Control (MVCC) in engines like PostgreSQL and MySQL InnoDB allow concurrent readers and writers without blocking?',
    codeSnippet: null,
    options: [
      'Writers create a new version of the row instead of updating in place, so readers get a consistent snapshot without locking',
      'All reads acquire exclusive table locks that block every write for 10ms intervals',
      'Read queries are served from an asynchronous in-memory cache that never touches disk',
      'The database engine serializes all queries onto a single dedicated CPU thread',
    ],
    correctIndex: 0,
    explanation: 'MVCC maintains multiple row versions. When a row is modified, the engine creates a new version while preserving the old version in undo logs/table pages. Readers see a transaction snapshot, ensuring readers never block writers and writers never block readers.',
    focusArea: 'Focus Area: MVCC Snapshot Read Concurrency',
  },
  {
    id: 'sql-a3', category: 'sql', categoryLabel: 'SQL & Databases', difficulty: 'Advanced',
    question: "What is an index 'covering query' (Index-Only Scan) in database query execution?",
    codeSnippet: `CREATE INDEX idx_user_metrics ON users (status, created_at, points);
SELECT points FROM users WHERE status = 'active' AND created_at > '2024-01-01';`,
    options: [
      'A query whose requested columns all exist in the index leaf nodes, so the engine skips table heap pages',
      'An index that automatically encrypts table data using SSL certificates at rest',
      'A query that forces the database engine to perform a full sequential scan',
      'An index that spans two distinct database instances running on separate servers',
    ],
    correctIndex: 0,
    explanation: 'An index-only scan occurs when all columns specified in SELECT, WHERE, and ORDER BY clauses exist inside the B-Tree index itself. The database skips reading table heap pages entirely, significantly reducing disk I/O.',
    focusArea: 'Focus Area: Covering Indexes & Index-Only Scans',
  },
];
