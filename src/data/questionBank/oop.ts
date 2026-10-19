import type { Question } from '../../types/question';

export const OOP_QUESTIONS: Question[] = [
  {
    id: 'oop-b1', category: 'oop', categoryLabel: 'OOP & Architecture', difficulty: 'Beginner',
    question: 'What design paradigm prioritizes assembling objects containing references to interfaces rather than deriving deep multi-level class inheritance hierarchies?',
    codeSnippet: null,
    options: [
      'Composition over Inheritance',
      'Multiple Virtual Inheritance',
      'Dynamic Method Swizzling',
      'Global Singleton Aggregation',
    ],
    correctIndex: 0,
    explanation: 'Composition over Inheritance promotes loose coupling and greater runtime flexibility by delegating responsibilities to composed components rather than creating rigid compile-time subclass hierarchies.',
    focusArea: 'Focus Area: Composition over Inheritance Principles',
  },
  {
    id: 'oop-b2', category: 'oop', categoryLabel: 'OOP & Architecture', difficulty: 'Beginner',
    question: 'Which of the four core pillars of Object-Oriented Programming is responsible for restricting direct access to internal state and hiding implementation details?',
    codeSnippet: `class BankAccount {
private:
    double balance;
public:
    void deposit(double amount) { /* validation */ }
};`,
    options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Metaprogramming'],
    correctIndex: 0,
    explanation: 'Encapsulation bundles data and the methods that operate on that data into a single unit, keeping internal representation private and exposing only well-defined public interfaces.',
    focusArea: 'Focus Area: Encapsulation & Information Hiding',
  },
  {
    id: 'oop-b3', category: 'oop', categoryLabel: 'OOP & Architecture', difficulty: 'Beginner',
    question: 'What creational design pattern ensures a class has only one instance and provides a global access point to it?',
    codeSnippet: null,
    options: ['Singleton Pattern', 'Factory Method Pattern', 'Decorator Pattern', 'Observer Pattern'],
    correctIndex: 0,
    explanation: 'The Singleton pattern restricts instantiation of a class to a single object, typically providing a static getInstance() method to access that shared instance.',
    focusArea: 'Focus Area: Singleton Creational Pattern',
  },
  {
    id: 'oop-i1', category: 'oop', categoryLabel: 'OOP & Architecture', difficulty: 'Intermediate',
    question: "Which SOLID principle is violated when a subclass overrides a base class method by throwing an 'UnsupportedOperationException' or narrowing accepted pre-conditions?",
    codeSnippet: `class ReadOnlyList extends ArrayList {
    @Override
    public boolean add(Object o) {
        throw new UnsupportedOperationException();
    }
}`,
    options: [
      'Liskov Substitution Principle (LSP)',
      'Single Responsibility Principle (SRP)',
      'Open/Closed Principle (OCP)',
      'Interface Segregation Principle (ISP)',
    ],
    correctIndex: 0,
    explanation: 'The Liskov Substitution Principle demands that subtypes must be substitutable for their base types without altering program correctness. Throwing an exception on a method guaranteed by the base contract violates LSP.',
    focusArea: 'Focus Area: SOLID Liskov Substitution Principle (LSP)',
  },
  {
    id: 'oop-i2', category: 'oop', categoryLabel: 'OOP & Architecture', difficulty: 'Intermediate',
    question: 'Which structural design pattern attaches additional responsibilities and behaviors to an object dynamically at runtime without modifying the underlying class?',
    codeSnippet: null,
    options: ['Decorator Pattern', 'Adapter Pattern', 'Bridge Pattern', 'Facade Pattern'],
    correctIndex: 0,
    explanation: 'The Decorator pattern wraps an existing component inside decorator objects that share the same interface, extending behavior dynamically without relying on static subclass inheritance.',
    focusArea: 'Focus Area: Decorator Pattern Dynamic Wrapping',
  },
  {
    id: 'oop-i3', category: 'oop', categoryLabel: 'OOP & Architecture', difficulty: 'Intermediate',
    question: 'In Clean Architecture / Hexagonal Architecture (Ports and Adapters), what is the Dependency Rule?',
    codeSnippet: null,
    options: [
      'Source code dependencies must point only inward, toward higher-level domain policies; inner circles know nothing of outer circles',
      'Domain entities must directly import the database ORM and HTTP controller libraries',
      'Database drivers must implement the UI view rendering interfaces directly',
      'All dependencies must be statically resolved at compile-time via C macros',
    ],
    correctIndex: 0,
    explanation: 'The Dependency Inversion rule of Clean Architecture mandates that inner core domain business logic never depends on outer mechanisms (database, UI, frameworks). Outer layers adapt to inward domain interfaces.',
    focusArea: 'Focus Area: Clean Architecture Dependency Inversion Rule',
  },
  {
    id: 'oop-a1', category: 'oop', categoryLabel: 'OOP & Architecture', difficulty: 'Advanced',
    question: 'In Domain-Driven Design (DDD), what distinguishes an Entity from a Value Object?',
    codeSnippet: null,
    options: [
      'An Entity is defined by an identity that persists across state changes, while a Value Object is immutable and compared by its attributes',
      'An Entity cannot contain business logic methods, while Value Objects contain all database queries',
      'Value Objects must be stored in separate SQL tables with foreign keys, while Entities cannot be persisted',
      'Entities are always garbage-collected immediately after each request finishes handling',
    ],
    correctIndex: 0,
    explanation: 'In DDD, an Entity (e.g. User, Order) has an explicit identity that remains identical even as attributes change. A Value Object (e.g. Money, Address, Color) is immutable and two instances are interchangeable if their attribute values match.',
    focusArea: 'Focus Area: DDD Entities vs Immutable Value Objects',
  },
  {
    id: 'oop-a2', category: 'oop', categoryLabel: 'OOP & Architecture', difficulty: 'Advanced',
    question: 'How does the VTable (Virtual Method Table) facilitate dynamic runtime polymorphism in compiled languages like C++?',
    codeSnippet: null,
    options: [
      'The compiler builds a per-class table of function pointers; each object carries a hidden vptr used to dispatch the right override',
      'The OS loader rewrites assembly instructions in machine memory on every function call',
      'The CPU branch predictor resolves method names using an internal string hash map',
      'Virtual functions execute in an interpreted bytecode sandbox placed on the stack',
    ],
    correctIndex: 0,
    explanation: "The compiler constructs a static VTable of function pointers for classes containing virtual functions. Each object instance contains a hidden vptr pointing to its class's VTable, resolving calls dynamically at runtime.",
    focusArea: 'Focus Area: VTable Function Pointer Dynamic Dispatch',
  },
  {
    id: 'oop-a3', category: 'oop', categoryLabel: 'OOP & Architecture', difficulty: 'Advanced',
    question: 'What problem does the Double-Checked Locking pattern solve when implementing a thread-safe Singleton, and why is a memory barrier (or volatile) necessary?',
    codeSnippet: `if (instance == null) {
    synchronized(Lock.class) {
        if (instance == null) instance = new Singleton();
    }
}`,
    options: [
      'It avoids synchronizing on every read; volatile stops reordering that can expose a half-constructed instance',
      'It prevents deadlocks by acquiring multiple locks in a strict alphabetical order',
      'It lets the garbage collector reclaim unused singletons when memory runs low',
      'It guarantees the class loads correctly across multiple JVM classloaders',
    ],
    correctIndex: 0,
    explanation: 'Double-checked locking checks instance nullity before synchronizing. Without volatile, the compiler or CPU can reorder instructions (allocating memory, assigning pointer, then running constructor), allowing another thread to observe a half-initialized object.',
    focusArea: 'Focus Area: Thread-Safe Singleton & Double-Checked Locking',
  },
];
