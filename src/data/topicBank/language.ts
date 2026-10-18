import type { StudyTopic } from '../../types/topic';

export const LANGUAGE_TOPICS: StudyTopic[] = [
  {
    id: 'lang-shallow-vs-deep-copy',
    category: 'language',
    categoryLabel: 'Language Masterclass',
    title: 'Shallow Copy vs Deep Copy (Python / C++ / Java)',
    frequency: 'High Frequency',
    tags: ['company_fav'],
    difficulty: 'Medium',
    takeaway:
      'A shallow copy duplicates the parent object but copies references to nested child objects; a deep copy recursively constructs new objects and duplicates all nested elements independently.',
    deepDive: [
      '<strong>Python:</strong> <code>copy.copy(obj)</code> creates a shallow copy; <code>copy.deepcopy(obj)</code> duplicates the entire object graph recursively.',
      '<strong>C++:</strong> The default synthesized copy constructor performs memberwise shallow copies. Deep copy requires custom copy constructors and <code>operator=</code> (Rule of 3/5).',
      '<strong>Java:</strong> <code>Object.clone()</code> is shallow by default. True deep copying requires manual recursive copying, copy constructors, or serialization.',
    ],
    codeLang: 'Python 3 & C++',
    codeSnippet: `# Python Demonstration
import copy

orig = [[1, 2, 3], [4, 5, 6]]
shallow = copy.copy(orig)
deep = copy.deepcopy(orig)

orig[0][0] = 999
print(shallow[0][0])  # 999! (Shared nested reference modified)
print(deep[0][0])     # 1 (Independent copy preserved)

// C++ Custom Deep Copy via Copy Constructor
class DynamicArray {
    int* data;
    size_t size;
public:
    DynamicArray(const DynamicArray& other) : size(other.size) {
        data = new int[size]; // Deep copy: allocate dedicated memory
        std::copy(other.data, other.data + size, data);
    }
    ~DynamicArray() { delete[] data; }
};`,
    pitfalls: [
      'Modifying nested elements inside a shallow copy and accidentally mutating the original source data.',
      'Double-free crashes in C++ when two shallow copies share a raw pointer and both destructors call `delete` on the same memory address.',
      'Performance degradation when running deep copy on large, cyclical object graphs.',
    ],
  },
  {
    id: 'lang-overload-vs-override',
    category: 'language',
    categoryLabel: 'Language Masterclass',
    title: 'Method Overloading vs Overriding & VTable Polymorphism',
    frequency: 'High Frequency',
    tags: ['high_freq', 'core'],
    difficulty: 'Medium',
    takeaway:
      'Overloading provides compile-time polymorphism by varying method signatures within the same class; Overriding provides runtime dynamic polymorphism by redefining a base class method in a derived class using VTables.',
    deepDive: [
      '<strong>Method Overloading:</strong> Resolved statically at compile-time by the compiler based on method name, argument count, and parameter types (return type alone cannot overload).',
      '<strong>Method Overriding:</strong> Resolved dynamically at runtime. The compiler creates a Virtual Method Table (VTable) for classes with virtual functions. Each object carries a hidden `vptr`.',
      '<strong>Language Rules:</strong> Java methods are virtual by default (unless marked `final`); C++ requires the explicit `virtual` keyword and `override` specifier.',
    ],
    codeLang: 'Java & C++',
    codeSnippet: `// Java Example
class Calculator {
    // Overloading (Compile-time / Static Dispatch)
    int add(int a, int b) { return a + b; }
    double add(double a, double b) { return a + b; }
}

class Animal {
    void speak() { System.out.println("Generic sound"); }
}

class Dog extends Animal {
    // Overriding (Runtime Dynamic Dispatch via VTable)
    @Override
    void speak() { System.out.println("Bark!"); }
}

// C++ VTable Mechanics:
// Dog d; Animal* ptr = &d;
// ptr->speak(); // Inspects d's vptr -> invokes Dog::speak() at runtime`,
    pitfalls: [
      'Attempting to overload methods solely by altering the return type (fails to compile).',
      'Forgetting `virtual` on base class destructors in C++, causing derived class destructors not to run and leaking memory.',
      'Failing to use `@Override` in Java, turning an intended override into an unintentional overload due to mismatched parameter types.',
    ],
  },
  {
    id: 'lang-pointers-vs-references',
    category: 'language',
    categoryLabel: 'Language Masterclass',
    title: 'Memory: Pointers vs References & Smart Pointers',
    frequency: 'High Frequency',
    tags: ['company_fav'],
    difficulty: 'Medium - Hard',
    takeaway:
      'A pointer stores a mutable memory address and can be null or re-seated; a reference is an immutable alias bound to an existing object at initialization that cannot be null or re-assigned.',
    deepDive: [
      '<strong>Pointers:</strong> Can point to arbitrary memory addresses, support pointer arithmetic (`ptr++`), and can be `nullptr`.',
      '<strong>References:</strong> Syntactic sugar for an alias; cannot be null, must be initialized upon declaration, and reassignment assigns to the referred object.',
      '<strong>Modern C++ Smart Pointers:</strong> <code>std::unique_ptr</code> (exclusive ownership, zero runtime overhead), <code>std::shared_ptr</code> (reference-counted shared ownership), <code>std::weak_ptr</code> (breaks cyclic references).',
    ],
    codeLang: 'Modern C++ (C++11/20)',
    codeSnippet: `#include <memory>
#include <iostream>

void demonstrate_smart_pointers() {
    // Exclusive Ownership (Automatic RAII deallocation)
    std::unique_ptr<int> uptr = std::make_unique<int>(42);
    // std::unique_ptr<int> copy = uptr; // COMPILE ERROR: Cannot copy unique_ptr!
    std::unique_ptr<int> moved = std::move(uptr); // Transfers ownership cleanly

    // Shared Ownership with Atomic Reference Counting
    std::shared_ptr<int> sptr1 = std::make_shared<int>(100);
    std::shared_ptr<int> sptr2 = sptr1; // Reference count becomes 2
    
    std::cout << "Ref count: " << sptr1.use_count() << "\\n"; // Output: 2
} // Both pointers automatically deallocated when scope closes!`,
    pitfalls: [
      'Dangling pointers: accessing memory after `free()` or `delete` has deallocated it.',
      'Memory leaks caused by `std::shared_ptr` cyclic references (solution: break cycles with `std::weak_ptr`).',
      'Mixing `delete` and `delete[]` on array allocations.',
    ],
  },
  {
    id: 'lang-java-gc-generations',
    category: 'language',
    categoryLabel: 'Language Masterclass',
    title: 'Java Garbage Collection & Generational Heap Model',
    frequency: 'High Frequency',
    tags: ['core'],
    difficulty: 'Medium - Hard',
    takeaway:
      'JVM divides heap memory into Young Generation (Eden, S0, S1) and Old/Tenured Generation based on the Weak Generational Hypothesis: most objects die shortly after allocation.',
    deepDive: [
      '<strong>Weak Generational Hypothesis:</strong> The vast majority of created objects have very short lifespans (e.g. local loop variables, method parameters).',
      '<strong>Minor GC:</strong> Objects allocated in Eden. When Eden fills, active survivors are copied to Survivor spaces (S0/S1). Fast mark-and-copy.',
      '<strong>Major / Full GC:</strong> Objects surviving multiple GC cycles (default threshold: 15) are promoted to the Old Generation. Major GC collects the Old Generation (Stop-The-World pause).',
      '<strong>Modern Collectors:</strong> G1 GC (region-based, predictable pauses), ZGC and Shenandoah (ultra-low pause times < 1ms on terabyte heaps).',
    ],
    codeLang: 'JVM Heap Architecture',
    codeSnippet: `+---------------------------------------------------------------+
|                       JVM HEAP MEMORY                         |
|  +-------------------------------------+  +----------------+  |
|  |           YOUNG GENERATION          |  | OLD GENERATION |  |
|  |  +------------+  +----+  +----+     |  |   (TENURED)    |  |
|  |  |    Eden    |  | S0 |  | S1 |     |  | Long-surviving |  |
|  |  | (New objs) |  |Survivor Spaces|  |  | objects        |  |
|  |  +------------+  +----+  +----+     |  | (Threshold 15) |  |
|  +-------------------------------------+  +----------------+  |
+---------------------------------------------------------------+`,
    pitfalls: [
      'Memory leaks in Java: holding references in static collections or unclosed thread-locals prevents GC from reclaiming objects.',
      'Calling `System.gc()` in production: this hints to the JVM to trigger a full Stop-The-World GC cycle, degrading throughput.',
      'Excessive object creation in high-frequency loops triggering frequent Minor GC pauses.',
    ],
  },
];
