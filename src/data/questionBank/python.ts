import type { Question } from '../../types/question';

export const PYTHON_QUESTIONS: Question[] = [
  {
    id: 'py-b1', category: 'python', categoryLabel: 'Python', difficulty: 'Beginner',
    question: 'What is the output of executing the following Python function multiple times?',
    codeSnippet: `def append_item(item, target_list=[]):
    target_list.append(item)
    return target_list

print(append_item(1))
print(append_item(2))`,
    options: ['[1] then [1, 2]', '[1] then [2]', '[1] then TypeError', '[] then []'],
    correctIndex: 0,
    explanation: 'In Python, default parameter expressions are evaluated once when the function definition is executed, not at runtime call. Because lists are mutable, repeated calls share the exact same list instance, outputting [1] followed by [1, 2].',
    focusArea: 'Focus Area: Python Mutable Default Argument Pitfalls',
  },
  {
    id: 'py-b2', category: 'python', categoryLabel: 'Python', difficulty: 'Beginner',
    question: 'What is the difference between `==` and `is` in Python?',
    codeSnippet: `a = [1, 2, 3]
b = [1, 2, 3]
print(a == b, a is b)`,
    options: [
      '`==` compares values for equality; `is` checks whether both names reference the same object',
      '`is` compares values for equality; `==` compares object identity addresses',
      '`is` converts between types automatically; `==` never performs any coercion',
      '`==` works only on numbers; `is` works only on strings and other text objects',
    ],
    correctIndex: 0,
    explanation: '`==` invokes `__eq__()` to check if values are logically equal. `is` checks object identity (comparing `id(a) == id(b)`), confirming whether both identifiers reference the identical memory address.',
    focusArea: 'Focus Area: Python Object Identity vs Value Equality',
  },
  {
    id: 'py-b3', category: 'python', categoryLabel: 'Python', difficulty: 'Beginner',
    question: 'Which of the following built-in Python data structures is IMMUTABLE?',
    codeSnippet: null,
    options: ['Tuple (`tuple`)', 'List (`list`)', 'Dictionary (`dict`)', 'Set (`set`)'],
    correctIndex: 0,
    explanation: 'Tuples, strings, ints, and frozensets are immutable in Python; once created, their elements and length cannot be modified. Lists, dictionaries, and sets are mutable.',
    focusArea: 'Focus Area: Python Built-in Immutability Types',
  },
  {
    id: 'py-i1', category: 'python', categoryLabel: 'Python', difficulty: 'Intermediate',
    question: 'How does the Python Global Interpreter Lock (GIL) impact multi-threaded CPU-bound programs vs I/O-bound programs in CPython?',
    codeSnippet: null,
    options: [
      'It restricts CPU-bound multi-threading to 1 core due to mutex lock contention, while I/O-bound programs release the GIL during syscalls',
      'It parallelizes CPU-bound threads across cores by auto-vectorizing bytecode execution loops',
      'It transparently converts threads into separate OS processes to bypass interpreter locking',
      'It serializes all bytecode but still allows true multi-core parallelism for pure-Python loops',
    ],
    correctIndex: 0,
    explanation: "CPython's GIL is a mutex preventing multiple native threads from executing Python bytecode simultaneously. Multi-threaded CPU-bound code cannot run in parallel on multiple cores. However, threads release the GIL during network/disk I/O.",
    focusArea: 'Focus Area: CPython GIL & Concurrency Characteristics',
  },
  {
    id: 'py-i2', category: 'python', categoryLabel: 'Python', difficulty: 'Intermediate',
    question: 'What does the `yield` keyword do inside a Python function, and how does it save memory when processing large datasets?',
    codeSnippet: `def read_large_file(file_path):
    with open(file_path) as f:
        for line in f:
            yield line.strip()`,
    options: [
      'It turns the function into a generator that yields values lazily on demand instead of materializing the whole sequence',
      'It compiles the function into native C machine code for roughly 10x faster execution',
      'It spawns an asynchronous background thread to read the file concurrently',
      'It saves every return value to the operating system disk cache automatically',
    ],
    correctIndex: 0,
    explanation: 'Using `yield` makes a function a Generator. Instead of computing and returning an entire list in memory, it yields items one by one, suspending its state between `next()` invocations and achieving O(1) auxiliary memory consumption.',
    focusArea: 'Focus Area: Python Generator Mechanics & Lazy Evaluation',
  },
  {
    id: 'py-i3', category: 'python', categoryLabel: 'Python', difficulty: 'Intermediate',
    question: 'In Python, how does a decorator function wrap another function, and why is `@functools.wraps(func)` recommended?',
    codeSnippet: `from functools import wraps
def my_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper`,
    options: [
      "It copies the original function's name, docstring and annotations onto the wrapper",
      'It forces the decorated function to execute on the GPU',
      'It prevents the decorated function from raising exceptions',
      'It converts the decorated function into a singleton class',
    ],
    correctIndex: 0,
    explanation: 'A decorator takes a function and returns a wrapper function. `@functools.wraps` copies metadata (such as `__name__`, `__doc__`, and `__module__`) from the original function to the wrapper, preventing introspection issues.',
    focusArea: 'Focus Area: Python Decorators & functools.wraps Metadata Preservation',
  },
  {
    id: 'py-a1', category: 'python', categoryLabel: 'Python', difficulty: 'Advanced',
    question: "How does Python's cyclic garbage collector detect and reclaim unreachable reference cycles that reference counting alone cannot collect?",
    codeSnippet: `class Node:
    def __init__(self): self.peer = None
a, b = Node(), Node()
a.peer = b
b.peer = a
del a, b # Reference count never reaches 0!`,
    options: [
      'A generational cyclic GC tracks container objects and trial-decrements reference counts to isolate unreachable cycles',
      'By destroying all container objects immediately when their defining scope exits',
      'By serializing suspected cycles to swap space and reclaiming them on memory pressure',
      'CPython cannot reclaim cyclic references automatically and permanently leaks any isolated cycle',
    ],
    correctIndex: 0,
    explanation: "While reference counting handles immediate deallocation when count reaches 0, cyclic references (a points to b, b points to a) prevent count from reaching 0. CPython's cyclic GC periodically scans container objects across 3 generations, testing for unreachable loops.",
    focusArea: 'Focus Area: Python Cyclic Garbage Collection & Generational Tracking',
  },
  {
    id: 'py-a2', category: 'python', categoryLabel: 'Python', difficulty: 'Advanced',
    question: 'What is a Python Metaclass, and what is the relationship between `type` and `object`?',
    codeSnippet: `class Meta(type):
    def __new__(cls, name, bases, dct):
        # Custom class creation logic
        return super().__new__(cls, name, bases, dct)`,
    options: [
      'A metaclass is the class of a class; `type` is an instance of `object`, and `object` is an instance of `type`',
      'A metaclass is an abstract class that can only contain static methods',
      'A metaclass is a C extension that must be compiled into the Python interpreter',
      'Metaclasses are deprecated and have been replaced by dataclasses',
    ],
    correctIndex: 0,
    explanation: "Classes in Python are themselves objects at runtime, instantiated by metaclasses (by default, `type`). In Python's object model, `object` is the base class of all classes, and `type` is the metaclass of all classes (including itself).",
    focusArea: 'Focus Area: Python Metaclasses & Type Hierarchy Mechanics',
  },
  {
    id: 'py-a3', category: 'python', categoryLabel: 'Python', difficulty: 'Advanced',
    question: 'What happens under the hood when `__slots__` is defined on a Python class?',
    codeSnippet: `class Point:
    __slots__ = ('x', 'y')
    def __init__(self, x, y):
        self.x = x
        self.y = y`,
    options: [
      'It prevents the creation of a dynamic `__dict__` for instances, storing attributes in fixed-size descriptor arrays to drastically reduce memory usage',
      'It marks all declared attributes as private final fields that cannot be reassigned after init',
      'It compiles the class body into a native C++ struct to bypass the interpreter entirely',
      'It enables zero-copy pickling by storing instances directly as contiguous C memory blocks',
    ],
    correctIndex: 0,
    explanation: 'By default, Python instances store attributes in a dynamic `__dict__` dictionary, which incurs memory overhead. `__slots__` allocates a fixed set of descriptors, eliminating `__dict__` and reducing memory footprint by ~50-70% for millions of objects.',
    focusArea: 'Focus Area: Python __slots__ Memory Optimization',
  },
  {
    id: 'py-a4', category: 'python', categoryLabel: 'Python', difficulty: 'Advanced',
    question: 'How does asyncio achieve high-concurrency I/O without OS threads, and what role does the event loop play?',
    codeSnippet: `import asyncio
async def fetch(url):
    await asyncio.sleep(0.1)
    return url
async def main():
    return await asyncio.gather(*[fetch(f"u{i}") for i in range(1000)])`,
    options: [
      'A single-threaded event loop multiplexes coroutines, suspending them at await points so thousands of I/O waits overlap cooperatively',
      'The interpreter spawns one OS thread per coroutine and load-balances them across CPU cores automatically',
      'Coroutines are compiled into GPU kernels that execute network syscalls in parallel hardware queues',
      'Each await serializes the coroutine to disk and resumes it after a fixed 100ms timer expiry',
    ],
    correctIndex: 0,
    explanation: 'Asyncio runs coroutines on a single-threaded event loop. When a coroutine hits await on I/O, it yields control, letting the loop drive other ready coroutines, achieving massive I/O overlap without thread overhead.',
    focusArea: 'Focus Area: Asyncio Event Loop & Cooperative Coroutine Scheduling',
  },
  {
    id: 'py-a5', category: 'python', categoryLabel: 'Python', difficulty: 'Advanced',
    question: 'What determines attribute lookup order in Python multiple inheritance, and how does C3 linearization behave?',
    codeSnippet: `class A: pass
class B(A): pass
class C(A): pass
class D(B, C): pass
print(D.__mro__)`,
    options: [
      'C3 linearization produces a monotonic MRO (D, B, C, A, object) preserving local precedence and monotonicity guarantees',
      'Depth-first search returns D, B, A, C, object, duplicating the shared base class in the lookup chain',
      'Breadth-first search flattens all bases alphabetically regardless of declaration order in class headers',
      'The interpreter picks a random base order at import time to balance method cache contention',
    ],
    correctIndex: 0,
    explanation: 'Python uses C3 linearization to compute MRO, guaranteeing that subclasses precede parents, declaration order is respected, and monotonicity holds. D.__mro__ is (D, B, C, A, object).',
    focusArea: 'Focus Area: Multiple Inheritance MRO & C3 Linearization',
  },
];
