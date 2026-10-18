import type { StudyTopic } from '../../types/topic';

export const MUST_KNOW_TOPICS: StudyTopic[] = [
  {
    id: 'must-process-vs-thread',
    category: 'must_know',
    categoryLabel: 'Must-Know Interview Questions',
    title: 'Process vs Thread Memory Allocation & Context Switching',
    frequency: 'High Frequency',
    tags: ['high_freq', 'company_fav', 'core'],
    difficulty: 'Medium',
    takeaway:
      'A process possesses an isolated virtual address space with its own page tables and file descriptors; threads belong to a process and share its heap and globals, but maintain their own call stacks and registers.',
    deepDive: [
      '<strong>Process Isolation:</strong> Managed via Process Control Block (PCB). Crashing a process does not harm other processes due to hardware MMU memory virtualization.',
      '<strong>Thread Execution:</strong> Managed via Thread Control Block (TCB). Threads share Heap, Code, and Static Data, but possess a private Call Stack and Program Counter (PC).',
      '<strong>Context Switch Cost:</strong> Process switching is heavy because it invalidates the CPU Translation Lookaside Buffer (TLB) and flushes hardware caches. Thread switching within the same process preserves page tables and TLB entries.',
    ],
    codeLang: 'Architecture Comparison',
    codeSnippet: `+-------------------------------------------------------+
| PROCESS ADDRESS SPACE (Isolated via Virtual Page Table)|
|  +-------------------------------------------------+  |
|  | Code Segment (Text) & Global / Static Data      |  |
|  +-------------------------------------------------+  |
|  | Heap Memory (Shared across all threads)         |  |
|  |   - Dynamic malloc / new allocations            |  |
|  +-------------------------------------------------+  |
|  | Thread 1 Stack      | Thread 2 Stack            |  |
|  | (Local vars, frames)| (Local vars, frames)      |  |
|  +---------------------+---------------------------+  |
+-------------------------------------------------------+`,
    pitfalls: [
      'Believing threads share call stacks: each thread has a strictly isolated call stack to maintain its own function execution path.',
      'Claiming multi-threading is always faster than multi-processing: multi-threading introduces race conditions, lock contention, and false sharing.',
      'Forgetting that context switching between processes requires expensive TLB flushes.',
    ],
  },
  {
    id: 'must-http-vs-https',
    category: 'must_know',
    categoryLabel: 'Must-Know Interview Questions',
    title: 'HTTP vs HTTPS & The TLS 1.3 Cryptographic Handshake',
    frequency: 'High Frequency',
    tags: ['high_freq', 'core'],
    difficulty: 'Medium',
    takeaway:
      'HTTPS encrypts cleartext HTTP using Transport Layer Security (TLS), combining asymmetric cryptography (ECDH / RSA) for key exchange with fast symmetric encryption (AES-GCM / ChaCha20) for session data.',
    deepDive: [
      '<strong>TLS 1.3 Optimization:</strong> Completes handshake in 1-RTT (Round Trip Time) compared to 2-RTT in TLS 1.2, or 0-RTT for resumed connections.',
      '<strong>ClientHello:</strong> Client sends supported cipher suites, TLS version, and its ephemeral Diffie-Hellman public key share.',
      '<strong>ServerHello & Certificate:</strong> Server verifies supported suite, sends its public key share, server certificate (signed by CA), and generates symmetric session keys.',
      '<strong>Three Security Guarantees:</strong> Confidentiality (eavesdropping prevention), Integrity (tamper detection via MACs), and Authenticity (CA certificate validation).',
    ],
    codeLang: 'TLS Handshake Flow',
    codeSnippet: `Client                                               Server
  |                                                     |
  | -------- 1. ClientHello (Key Share, Ciphers) -----> |
  |                                                     |  [Server generates master secret]
  | <------- 2. ServerHello (Key Share) --------------- |
  | <------- 3. EncryptedExtensions & Certificate ----- |
  | <------- 4. CertificateVerify & Finished ---------- |
  |                                                     |
  |  [Client verifies CA & generates session secret]    |
  | -------- 5. Finished -----------------------------> |
  |                                                     |
  |<======= SECURE FULL-DUPLEX SYMMETRIC HTTP/2 OR 3 ===>|`,
    pitfalls: [
      'Saying HTTPS uses asymmetric encryption for all data transmission: asymmetric encryption is only used to negotiate the shared symmetric session key (which is 100-1000x faster).',
      'Confusing Authentication with Authorization in TLS client validation.',
      'Neglecting SNI (Server Name Indication) in modern virtual hosting over TLS.',
    ],
  },
  {
    id: 'must-deadlock-bankers',
    category: 'must_know',
    categoryLabel: 'Must-Know Interview Questions',
    title: "Deadlock: Coffman Conditions & Banker's Prevention",
    frequency: 'High Frequency',
    tags: ['company_fav'],
    difficulty: 'Hard',
    takeaway:
      'A deadlock occurs when processes are unable to proceed because each holds a resource while waiting for another held resource. It requires all 4 Coffman conditions; breaking any single condition prevents deadlock.',
    deepDive: [
      '<strong>4 Coffman Conditions:</strong> (1) Mutual Exclusion, (2) Hold & Wait, (3) No Preemption, (4) Circular Wait.',
      "<strong>Banker's Algorithm:</strong> A deadlock avoidance algorithm testing for safe states by simulating the allocation of predetermined maximum possible resources before granting requests.",
      '<strong>Practical Industry Strategy:</strong> Lock ordering hierarchy (always acquire Lock A before Lock B), timeout mechanisms (e.g. `pthread_mutex_trylock` or Java `tryLock`), and lock-free concurrency (CAS).',
    ],
    codeLang: 'C++ Deadlock Prevention',
    codeSnippet: `// BAD: Classic Deadlock via Inverted Lock Acquisition
void transfer_unsafe(Account& from, Account& to, double amt) {
    lock_guard<mutex> lockA(from.mtx); // Thread 1 locks A, waits for B
    lock_guard<mutex> lockB(to.mtx);   // Thread 2 locks B, waits for A
    from.balance -= amt; to.balance += amt;
}

// GOOD: Deadlock Prevention using std::scoped_lock (Deadlock-Free Lock Ordering)
void transfer_safe(Account& from, Account& to, double amt) {
    // Acquires both locks atomically without deadlock
    std::scoped_lock lock(from.mtx, to.mtx);
    from.balance -= amt;
    to.balance += amt;
}`,
    pitfalls: [
      'Thinking deadlock only occurs in multi-threaded programs (distributed systems, database table locks, and RPC circular dependencies also deadlock).',
      'Confusing Deadlock (processes blocked indefinitely) with Livelock (processes continuously change state in response to each other without making progress).',
      'Using arbitrary sleep or retry delays without exponential backoff.',
    ],
  },
  {
    id: 'must-b-trees-vs-hash',
    category: 'must_know',
    categoryLabel: 'Must-Know Interview Questions',
    title: 'Database Indexing: B-Trees vs Hash Indexes',
    frequency: 'High Frequency',
    tags: ['core'],
    difficulty: 'Medium',
    takeaway:
      'B-Trees keep keys sorted, making them the standard engine index for point queries (O(log N)), range scans (`BETWEEN`), and sorting (`ORDER BY`), while Hash indexes provide O(1) equality lookup but fail on range queries.',
    deepDive: [
      '<strong>B+ Tree Architecture:</strong> Internal nodes hold only routing keys; all data records or pointers sit in leaf nodes linked horizontally in a doubly linked list.',
      '<strong>I/O Optimization:</strong> High fan-out (hundreds of keys per node) matches disk block and page size (typically 4KB-16KB), keeping tree height shallow (3-4 levels for billions of rows).',
      '<strong>Hash Index Constraints:</strong> Memory-only or bucket-based. Fast O(1) for <code>WHERE id = 42</code>, but unusable for <code>WHERE age &gt; 25</code> or prefix pattern matching.',
    ],
    codeLang: 'SQL & B-Tree Structure',
    codeSnippet: `-- Creates a composite B-Tree index supporting Leftmost Prefix Rule
CREATE INDEX idx_users_dept_salary ON employees (department_id, salary);

-- Efficient Index Seek (uses both columns in B-Tree):
SELECT * FROM employees WHERE department_id = 5 AND salary > 80000;

-- Efficient Index Seek (uses leftmost prefix):
SELECT * FROM employees WHERE department_id = 5;

-- INEFFECTIVE: Full Table Scan required (Leftmost prefix omitted):
SELECT * FROM employees WHERE salary > 80000;`,
    pitfalls: [
      'Assuming composite indexes work on any column combination: they strictly obey the Leftmost Prefix Rule.',
      'Over-indexing tables: each additional index slows down `INSERT`, `UPDATE`, and `DELETE` operations due to tree page splits and rebalancing.',
      'Using hash indexes for auto-increment IDs when range queries are common.',
    ],
  },
];
