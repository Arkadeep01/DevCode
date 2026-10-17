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
      '`INNER JOIN` returns only rows with matches in both tables; `LEFT OUTER JOIN` returns all rows from the left table, padding unmatched right columns with NULL',
      '`INNER JOIN` sorts rows in ascending order; `LEFT JOIN` sorts rows in descending order',
      '`LEFT JOIN` only works on indexed columns; `INNER JOIN` works on unindexed columns',
      '`INNER JOIN` requires tables to be stored in the same physical database file',
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
      'Executing 1 initial query to retrieve parent records, followed by N separate queries to fetch associated children instead of performing a single JOIN',
      'Inserting N rows into a table without specifying primary keys',
      'Running recursive Common Table Expressions without a termination condition',
      'Exceeding the maximum allowed connection pool limit by 1 connection',
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
      '`TRUNCATE` is a DDL operation that deallocates table pages and resets auto-increment counters with minimal logging; `DELETE` is a DML operation that removes rows individually and logs each deletion',
      '`DELETE` drops the table schema completely, while `TRUNCATE` preserves indexes',
      '`TRUNCATE` can be filtered with a `WHERE` clause, whereas `DELETE` cannot',
      '`DELETE` executes faster than `TRUNCATE` on large tables',
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
      'Writers create a new version of the row with a transaction ID (xmin/xmax or undo log) rather than modifying data in place, allowing readers to read a consistent snapshot without locking',
      'All reads acquire exclusive table locks that block writes for 10ms intervals',
      'Read queries are redirected to an asynchronous memory cache that never touches disk',
      'The database engine serializes all queries onto a single CPU thread',
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
      'A query where all requested columns exist directly inside the index leaf nodes, allowing the engine to satisfy the query without fetching table heap pages',
      'An index that automatically encrypts table data using SSL certificates',
      'A query that forces the database engine to perform a full sequential scan',
      'An index that spans across two distinct database instances on separate servers',
    ],
    correctIndex: 0,
    explanation: 'An index-only scan occurs when all columns specified in SELECT, WHERE, and ORDER BY clauses exist inside the B-Tree index itself. The database skips reading table heap pages entirely, significantly reducing disk I/O.',
    focusArea: 'Focus Area: Covering Indexes & Index-Only Scans',
  },
];
