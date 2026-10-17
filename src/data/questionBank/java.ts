import type { Question } from '../../types/question';

export const JAVA_QUESTIONS: Question[] = [
  {
    id: 'java-b1', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Beginner',
    question: 'What is the fundamental difference between `String`, `StringBuilder`, and `StringBuffer` in Java?',
    codeSnippet: null,
    options: [
      '`String` is immutable; `StringBuilder` is mutable and not thread-safe (fastest); `StringBuffer` is mutable and synchronized (thread-safe)',
      '`String` is stored on the stack; `StringBuilder` is stored in permanent generation',
      '`StringBuffer` cannot be used in multi-threaded programs',
      '`StringBuilder` creates a new instance on every string concatenation',
    ],
    correctIndex: 0,
    explanation: '`String` instances cannot be modified once created. `StringBuilder` provides a mutable character buffer for high performance in single-threaded environments. `StringBuffer` provides thread-safety via synchronized methods at a small performance cost.',
    focusArea: 'Focus Area: Java String Immutability vs StringBuilder Performance',
  },
  {
    id: 'java-b2', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Beginner',
    question: 'Why should you override `hashCode()` whenever you override `equals()` in a Java class?',
    codeSnippet: null,
    options: [
      'To maintain the general contract that equal objects must have equal hash codes, preventing failures in hash-based collections (HashMap, HashSet)',
      'To allow the JVM to serialize the object to disk',
      'Because the Java compiler throws a syntax error if one is omitted',
      'To enable garbage collection in the Eden space',
    ],
    correctIndex: 0,
    explanation: 'HashMap and HashSet use hashCode() to determine which bucket an object belongs to. If two objects are equal according to equals() but produce different hash codes, hash-based collections cannot retrieve them reliably.',
    focusArea: 'Focus Area: equals() and hashCode() Contract in Java',
  },
  {
    id: 'java-b3', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Beginner',
    question: 'What is the difference between a Checked Exception and an Unchecked Exception in Java?',
    codeSnippet: null,
    options: [
      'Checked exceptions (subclasses of Exception excluding RuntimeException) must be declared in the throws clause or caught; Unchecked exceptions (subclasses of RuntimeException) do not require explicit handling',
      'Unchecked exceptions halt the entire operating system and require a full machine reboot',
      'Checked exceptions are trapped by CPU hardware interrupts rather than JVM bytecode checks',
      'Unchecked exceptions may only be thrown from abstract classes or static initializer blocks',
    ],
    correctIndex: 0,
    explanation: 'Checked exceptions represent recoverable environmental errors and are verified at compile time (must be caught or declared). Unchecked exceptions (RuntimeException, Error) represent programming errors and are not checked at compile time.',
    focusArea: 'Focus Area: Checked vs Unchecked Exception Hierarchy',
  },
  {
    id: 'java-i1', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Intermediate',
    question: 'What is the primary memory design rationale behind Generational Garbage Collection in the Java HotSpot JVM?',
    codeSnippet: null,
    options: [
      "The 'Weak Generational Hypothesis': Most objects die shortly after allocation, so Young Gen can be collected rapidly with Minor GC without scanning the entire heap",
      'Old Generation objects cannot contain references to Young Generation objects',
      'Garbage collection is only possible on heap memory partitioned into prime-number sized blocks',
      'Primitive types are allocated in Permanent Gen while references live in Young Gen',
    ],
    correctIndex: 0,
    explanation: 'Empirical observation (the Weak Generational Hypothesis) shows that the overwhelming majority of allocated objects live very briefly. Separating the heap into Young (Eden, Survivor) and Old generations allows frequent Minor GCs to reclaim dead objects rapidly.',
    focusArea: 'Focus Area: JVM Generational Garbage Collection Mechanics',
  },
  {
    id: 'java-i2', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Intermediate',
    question: "How does Java's `ConcurrentHashMap` achieve high concurrent read and write throughput compared to `Collections.synchronizedMap`?",
    codeSnippet: null,
    options: [
      'It utilizes lock-striping across hash buckets with CAS (Compare-And-Swap) operations and synchronized bucket node locks, allowing concurrent writes without blocking concurrent reads',
      'It clones the entire hash map in memory on every put operation',
      'It disables multi-threading and runs all map operations on a single daemon thread',
      'It writes all keys to disk using memory-mapped files',
    ],
    correctIndex: 0,
    explanation: 'synchronizedMap synchronizes the entire collection on a single monitor lock. ConcurrentHashMap locks only individual bucket nodes or segments and leverages CAS (Compare-And-Swap) and volatile reads, allowing multiple threads to read and write concurrently.',
    focusArea: 'Focus Area: ConcurrentHashMap Lock-Striping & CAS Operations',
  },
  {
    id: 'java-i3', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Intermediate',
    question: 'In the Java Memory Model, what does the `volatile` keyword guarantee, and what does it NOT guarantee?',
    codeSnippet: `private volatile int counter = 0;
public void increment() {
    counter++; // Is this thread-safe?
}`,
    options: [
      'It guarantees memory visibility (changes are flushed to and read directly from main memory) and prevents instruction reordering; it does NOT guarantee atomicity for compound operations like counter++',
      'It guarantees mutual exclusion across all methods in the class',
      'It guarantees the variable is stored exclusively in CPU L1 cache',
      'It guarantees immutable values similar to the final modifier',
    ],
    correctIndex: 0,
    explanation: '`volatile` establishes a happens-before memory visibility barrier so all threads read the latest value written to main memory. However, `counter++` is a composite 3-step operation (read, modify, write) that is not atomic, causing race conditions.',
    focusArea: 'Focus Area: Java volatile Visibility vs Compound Atomicity',
  },
  {
    id: 'java-a1', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Advanced',
    question: 'What are Virtual Threads (Project Loom) introduced in Java 21, and how do they differ from traditional Platform Threads?',
    codeSnippet: `try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 10_000).forEach(i -> {
        executor.submit(() -> fetchExternalApi());
    });
}`,
    options: [
      'Virtual threads are lightweight, user-mode threads managed by the JVM that unmount from carrier OS threads during blocking I/O, allowing millions of concurrent tasks with minimal memory overhead',
      'Virtual threads run in a WebAssembly sandbox inside the browser',
      'Virtual threads bypass the JVM garbage collector entirely',
      'Virtual threads execute only CPU-bound mathematical calculations',
    ],
    correctIndex: 0,
    explanation: 'Traditional Java platform threads wrap 1:1 kernel threads (~1MB stack each). Virtual threads are managed by the JVM runtime (M:N). When a virtual thread executes a blocking operation (I/O, locks), the JVM unmounts it from the carrier OS thread, enabling massive concurrency.',
    focusArea: 'Focus Area: Project Loom Virtual Threads vs Platform Threads',
  },
  {
    id: 'java-a2', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Advanced',
    question: 'How does Java ClassLoader delegation (Parent Delegation Model) work, and why is it essential for JVM security?',
    codeSnippet: null,
    options: [
      'A ClassLoader delegates loading requests to its parent loader before attempting to load the class itself, ensuring core platform classes (like `java.lang.Object`) cannot be hijacked by malicious custom bytecode',
      'Child classloaders compile classes into native machine code before parents see them',
      'Parent classloaders delete classes loaded by child classloaders if memory is low',
      'It requires all JAR files to be digitally signed by Oracle',
    ],
    correctIndex: 0,
    explanation: 'The Parent Delegation Model requires that when a ClassLoader is requested to load a class, it forwards the request to its parent loader first (up to Bootstrap ClassLoader). This guarantees standard JDK classes are loaded from trusted locations.',
    focusArea: 'Focus Area: Java ClassLoader Parent Delegation Hierarchy',
  },
  {
    id: 'java-a3', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Advanced',
    question: 'In high-throughput JVM tuning, how does the Z Garbage Collector (ZGC) achieve sub-millisecond maximum pause times on multi-terabyte heaps?',
    codeSnippet: null,
    options: [
      'ZGC performs all phases (marking, relocation, reference processing) concurrently with application threads using colored pointers and load barriers',
      'ZGC stops all application threads and compresses memory on the GPU',
      'ZGC disables heap garbage collection and reboots the JVM every hour',
      'ZGC only collects young generation objects and ignores old generation',
    ],
    correctIndex: 0,
    explanation: "ZGC is a scalable, low-latency garbage collector. By embedding reference metadata directly into reference bits ('colored pointers') and executing load barriers when application threads access references, it performs compaction concurrently, keeping pauses under 1ms.",
    focusArea: 'Focus Area: JVM ZGC Low-Latency Colored Pointers & Load Barriers',
  },
];
