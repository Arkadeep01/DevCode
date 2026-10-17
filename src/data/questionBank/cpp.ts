import type { Question } from '../../types/question';

export const CPP_QUESTIONS: Question[] = [
  {
    id: 'cpp-b1', category: 'cpp', categoryLabel: 'Modern C++', difficulty: 'Beginner',
    question: 'What is the core idiom of RAII (Resource Acquisition Is Initialization) in C++?',
    codeSnippet: null,
    options: [
      'Resource allocation (memory, file handles, locks) is tied to object lifetime, acquired in constructors and automatically released in destructors',
      'All local variables must be deduced with `auto` so lifetimes are tracked by the compiler',
      'Classes should avoid heap allocation entirely and keep all state in static storage',
      'Raw pointers must always be passed by reference to extend the pointee lifetime safely',
    ],
    correctIndex: 0,
    explanation: 'RAII ties resource lifecycle to object scope. When an object is created on the stack, its constructor acquires resources; when it goes out of scope, its destructor is automatically called, preventing memory and resource leaks.',
    focusArea: 'Focus Area: RAII Resource Management & Destructor Safety',
  },
  {
    id: 'cpp-b2', category: 'cpp', categoryLabel: 'Modern C++', difficulty: 'Beginner',
    question: 'What is the key difference between `std::unique_ptr` and `std::shared_ptr` in Modern C++?',
    codeSnippet: null,
    options: [
      '`std::unique_ptr` represents exclusive, non-copyable ownership of a resource; `std::shared_ptr` manages shared ownership using a reference-counted control block',
      '`std::shared_ptr` is faster because it does not allocate memory on the heap',
      '`std::unique_ptr` can be copied across multiple threads without locks',
      '`std::unique_ptr` does not call delete when going out of scope',
    ],
    correctIndex: 0,
    explanation: 'std::unique_ptr enforces exclusive ownership with zero runtime overhead over a raw pointer (move-only). std::shared_ptr allows multiple pointers to own the resource, using atomic reference counting to free memory when count hits 0.',
    focusArea: 'Focus Area: Smart Pointer Ownership Semantics',
  },
  {
    id: 'cpp-b3', category: 'cpp', categoryLabel: 'Modern C++', difficulty: 'Beginner',
    question: 'What does the `const` qualifier after a member function signature indicate?',
    codeSnippet: `class Widget {
public:
    int getValue() const;
};`,
    options: [
      'The member function promises not to modify any non-mutable member variables of the object',
      'The function returns a constant integer that cannot be assigned',
      "The function can only be called once during the program's lifecycle",
      'The function is executed entirely at compile time',
    ],
    correctIndex: 0,
    explanation: 'A const member function treats `this` as `const Widget*`, guaranteeing that the function will not alter non-mutable member fields, allowing it to be safely invoked on const object instances.',
    focusArea: 'Focus Area: C++ const Member Functions & Immutability',
  },
  {
    id: 'cpp-i1', category: 'cpp', categoryLabel: 'Modern C++', difficulty: 'Intermediate',
    question: 'What does `std::move(x)` actually perform at runtime in modern C++11 and beyond?',
    codeSnippet: `std::vector<int> a = {1, 2, 3};
std::vector<int> b = std::move(a);`,
    options: [
      'It performs an unconditional static_cast to an rvalue reference (T&&) without moving any data bytes itself',
      'It issues a memcpy instruction copying the vector heap pointer over to b',
      'It invokes the OS memory manager to remap virtual memory pages',
      'It deletes object a and invalidates all pointers immediately',
    ],
    correctIndex: 0,
    explanation: "std::move is purely a compile-time static_cast to an rvalue reference (T&&). It generates no runtime assembly instructions itself; it simply signals that an object may be 'moved from' via move constructors or move assignments.",
    focusArea: 'Focus Area: C++ Move Semantics & Rvalue References',
  },
  {
    id: 'cpp-i2', category: 'cpp', categoryLabel: 'Modern C++', difficulty: 'Intermediate',
    question: 'Why does `std::make_shared<T>()` perform fewer memory allocations than `std::shared_ptr<T>(new T())`?',
    codeSnippet: `auto p1 = std::make_shared<Widget>();
std::shared_ptr<Widget> p2(new Widget());`,
    options: [
      '`make_shared` allocates the managed object and the reference count control block together in a single contiguous memory block',
      '`make_shared` stores the object on the CPU stack instead of the heap',
      '`new Widget()` bypasses the memory allocator and leaks memory',
      '`make_shared` uses thread-local memory pools',
    ],
    correctIndex: 0,
    explanation: 'std::make_shared allocates both the object instance and the internal shared_ptr control block (ref count, weak count, deleter) in one single heap allocation, improving cache locality and reducing heap allocator overhead.',
    focusArea: 'Focus Area: std::make_shared Control Block Allocation',
  },
  {
    id: 'cpp-i3', category: 'cpp', categoryLabel: 'Modern C++', difficulty: 'Intermediate',
    question: 'What is the Rule of Five in modern C++ class design?',
    codeSnippet: null,
    options: [
      'If a class defines or deletes a destructor, it should likely explicitly declare: Destructor, Copy Constructor, Copy Assignment, Move Constructor, and Move Assignment',
      'A class should never have more than five public member functions',
      'Inheritance trees must never exceed five levels of derivation',
      'Templates can accept a maximum of five type parameters',
    ],
    correctIndex: 0,
    explanation: 'The Rule of Five states that if a class manages resources and requires a custom destructor, copy constructor, copy assignment operator, move constructor, or move assignment operator, it should explicitly define all five to ensure correct lifetime semantics.',
    focusArea: 'Focus Area: C++ Rule of Five Special Member Functions',
  },
  {
    id: 'cpp-a1', category: 'cpp', categoryLabel: 'Modern C++', difficulty: 'Advanced',
    question: 'Why must a base class have a `virtual` destructor if derived objects are deleted via base class pointers (`Base* ptr = new Derived()`)?',
    codeSnippet: `class Base {
public:
    virtual ~Base() = default;
};
class Derived : public Base {
    int* resource = new int[100];
public:
    ~Derived() { delete[] resource; }
};`,
    options: [
      'Without a virtual destructor, calling delete on Base* invokes undefined behavior according to the C++ standard and ~Derived() is never called, leaking resources',
      'Virtual destructors allow the compiler to inline derived constructors',
      'C++ forbids allocating memory on the heap without virtual destructors',
      'Derived destructors cannot call std::free without dynamic vtable dispatch',
    ],
    correctIndex: 0,
    explanation: 'If Base does not declare its destructor virtual, executing `delete ptr;` where `ptr` is a `Base*` pointing to `Derived` results in undefined behavior. The derived class destructor will not be called, resulting in severe resource leaks.',
    focusArea: 'Focus Area: Virtual Destructors & Polymorphic Lifetime',
  },
  {
    id: 'cpp-a2', category: 'cpp', categoryLabel: 'Modern C++', difficulty: 'Advanced',
    question: 'What is Perfect Forwarding in C++ templates, and why is `std::forward<T>` required alongside universal references (`T&&`)?',
    codeSnippet: `template<typename T>
void forwarder(T&& arg) {
    target(std::forward<T>(arg));
}`,
    options: [
      'It preserves the original value category (lvalue vs rvalue) of the argument when passing it to another function',
      'It prevents compiler optimizations from inlining the function call',
      'It converts all arguments into const references to prevent mutation',
      'It ensures functions execute asynchronously in separate threads',
    ],
    correctIndex: 0,
    explanation: 'Inside `forwarder`, the named parameter `arg` is treated as an lvalue even if an rvalue was passed in. `std::forward<T>(arg)` casts `arg` back to an rvalue only if the original argument passed into the template was an rvalue.',
    focusArea: 'Focus Area: Perfect Forwarding & std::forward Mechanics',
  },
  {
    id: 'cpp-a3', category: 'cpp', categoryLabel: 'Modern C++', difficulty: 'Advanced',
    question: 'What is the difference between `constexpr` and `consteval` introduced in C++20?',
    codeSnippet: null,
    options: [
      '`constexpr` functions can be evaluated at compile time OR runtime depending on context; `consteval` enforces immediate compile-time evaluation (producing a compiler error if evaluated at runtime)',
      '`consteval` allocates memory on the stack while `constexpr` allocates on the heap',
      '`constexpr` can only be used with primitive numbers; `consteval` is for pointers',
      '`consteval` functions are executed in an external Python script',
    ],
    correctIndex: 0,
    explanation: 'A `constexpr` function can run at compile time if arguments are constant expressions, or fallback to runtime execution. `consteval` (immediate functions) guarantees strictly compile-time execution; calling it with runtime variables fails compilation.',
    focusArea: 'Focus Area: C++20 consteval vs constexpr Execution',
  },
];
