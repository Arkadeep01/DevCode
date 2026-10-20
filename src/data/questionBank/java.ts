import type { Question } from '../../types/question';

export const JAVA_QUESTIONS: Question[] = [
  {
    id: 'java-b1', category: 'java', categoryLabel: 'Java Enterprise', difficulty: 'Beginner',
    question: 'What is the fundamental difference between `String`, `StringBuilder`, and `StringBuffer` in Java?',
    codeSnippet: null,
    options: [
      '`String` is immutable; `StringBuilder` is mutable but not thread-safe; `StringBuffer` is mutable and synchronized',
      '`String` lives on the stack; `StringBuilder` lives in the permanent generation',
      '`StringBuffer` cannot be used safely in multi-threaded programs at all',
      '`StringBuilder` creates a new instance on every concatenation operation',
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
      'So equal objects always share the same bucket in hash-based collections like HashMap and HashSet',
      'To allow the JVM to serialize the object directly to disk',
      'Because the Java compiler rejects the class if one is omitted',
      'To enable garbage collection in the young Eden space',
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
      'Checked exceptions must be caught or declared in `throws`; unchecked (`RuntimeException`) exceptions need no explicit handling',
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
      "The weak generational hypothesis: most objects die young, so cheap Minor GCs reclaim the Young Gen without scanning the whole heap",
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
      'It locks individual buckets and uses CAS operations, so writes do not block concurrent reads',
      'It clones the entire hash map in memory on every put operation',
      'It disables multi-threading and runs all operations on a single daemon thread',
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
      'It guarantees visibility and prevents reordering, but it does NOT make `counter++` atomic',
      'It guarantees mutual exclusion across all methods in the class',
      'It guarantees the variable is stored exclusively in the CPU L1 cache',
      'It guarantees immutable values similar to the `final` modifier',
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
      'They are JVM-managed threads that unmount from carrier OS threads during blocking I/O, allowing millions of tasks',
      'Virtual threads run in a WebAssembly sandbox inside the browser',
      'Virtual threads bypass the JVM garbage collector entirely for their stacks',
      'Virtual threads execute only CPU-bound mathematical calculations on the JVM',
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
      'A loader asks its parent first, so core classes like `java.lang.Object` cannot be hijacked by malicious bytecode',
      'Child classloaders compile classes into native machine code before parents see them',
      'Parent classloaders delete classes loaded by child classloaders if memory is low',
      'It requires all JAR files to be digitally signed by Oracle before loading',
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
      'ZGC runs marking, relocation and reference processing concurrently using colored pointers and load barriers',
      'ZGC stops all application threads and compresses memory on the GPU',
      'ZGC disables heap garbage collection and reboots the JVM every hour',
      'ZGC only collects young generation objects and ignores old generation',
    ],
    correctIndex: 0,
    explanation: "ZGC is a scalable, low-latency garbage collector. By embedding reference metadata directly into reference bits ('colored pointers') and executing load barriers when application threads access references, it performs compaction concurrently, keeping pauses under 1ms.",
    focusArea: 'Focus Area: JVM ZGC Low-Latency Colored Pointers & Load Barriers',
  },
];
