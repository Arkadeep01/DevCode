import type { Question } from '../../types/question';

export const JAVASCRIPT_QUESTIONS: Question[] = [
  {
    id: 'js-b1', category: 'javascript', categoryLabel: 'Modern JavaScript & Node', difficulty: 'Beginner',
    question: 'What is the key difference between `var`, `let`, and `const` in JavaScript?',
    codeSnippet: null,
    options: [
      '`var` is function-scoped and hoisted as `undefined`; `let`/`const` are block-scoped and hit the Temporal Dead Zone',
      '`const` freezes the binding and deeply freezes any object or array assigned to it',
      '`let` declares globals on window while `var` is confined to the nearest block scope',
      '`var` is resolved entirely at compile time while `let` is resolved dynamically at runtime',
    ],
    correctIndex: 0,
    explanation: '`var` declarations are hoisted to the enclosing function or global scope and initialized to undefined. `let` and `const` provide block scoping (`{}`) and reside in the Temporal Dead Zone (TDZ) where accessing them prior to declaration throws a ReferenceError.',
    focusArea: 'Focus Area: JavaScript Scope & Temporal Dead Zone',
  },
  {
    id: 'js-b2', category: 'javascript', categoryLabel: 'Modern JavaScript & Node', difficulty: 'Beginner',
    question: 'What is the output of checking shallow freeze immutability with `Object.freeze()` in standard JavaScript?',
    codeSnippet: `const config = Object.freeze({
  env: 'prod',
  db: { port: 5432 }
});
config.env = 'dev';
config.db.port = 3306;
console.log(config.env, config.db.port);`,
    options: ['prod 3306', 'dev 3306', 'prod 5432', 'TypeError on env'],
    correctIndex: 0,
    explanation: "`Object.freeze()` performs a shallow freeze on the immediate properties of the passed object (`env` remains 'prod'). Nested objects (`db`) are not frozen recursively and remain fully mutable, updating `port` to 3306.",
    focusArea: 'Focus Area: JavaScript Shallow vs Deep Object Immutability',
  },
  {
    id: 'js-b3', category: 'javascript', categoryLabel: 'Modern JavaScript & Node', difficulty: 'Beginner',
    question: 'What is a Closure in JavaScript?',
    codeSnippet: `function makeCounter() {
    let count = 0;
    return function() { return ++count; };
}
const counter = makeCounter();
counter(); // 1`,
    options: [
      'A function that keeps access to its lexical outer scope after that outer function returns',
      'A method to close active database connections automatically',
      'A way to prevent an object from adding new properties',
      'An anonymous arrow function that takes no parameters',
    ],
    correctIndex: 0,
    explanation: 'A closure is the combination of a function bundled together with references to its surrounding lexical environment. This allows inner functions to remember and access variables declared in outer scopes even after the outer function has returned.',
    focusArea: 'Focus Area: JavaScript Lexical Scoping & Closures',
  },
  {
    id: 'js-i1', category: 'javascript', categoryLabel: 'Modern JavaScript & Node', difficulty: 'Intermediate',
    question: 'What is the exact execution order logged to the console by the JavaScript Event Loop?',
    codeSnippet: `console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');`,
    options: ['1, 4, 3, 2', '1, 2, 3, 4', '1, 4, 2, 3', '1, 3, 4, 2'],
    correctIndex: 0,
    explanation: 'Synchronous code runs first (1, then 4). Microtasks (Promise.then callbacks) are drained next before processing the next macrotask (setTimeout). Thus, microtask 3 runs before macrotask 2, producing: 1, 4, 3, 2.',
    focusArea: 'Focus Area: Event Loop Microtask vs Macrotask Execution Order',
  },
  {
    id: 'js-i2', category: 'javascript', categoryLabel: 'Modern JavaScript & Node', difficulty: 'Intermediate',
    question: 'In Node.js, what is the key difference between `process.nextTick()` and `setImmediate()`?',
    codeSnippet: null,
    options: [
      '`nextTick()` runs right after the current operation; `setImmediate()` runs in the next loop iteration Check phase',
      '`setImmediate()` runs before any Promise microtask callbacks in the same tick',
      '`process.nextTick()` runs on a separate libuv worker thread pool',
      '`setImmediate()` is only available inside web browsers, not Node.js',
    ],
    correctIndex: 0,
    explanation: '`process.nextTick()` is technically not part of the event loop; it runs immediately at the completion of the current phase before the event loop continues. `setImmediate()` runs during the Check phase of the libuv event loop.',
    focusArea: 'Focus Area: Node.js process.nextTick vs setImmediate Phases',
  },
  {
    id: 'js-i3', category: 'javascript', categoryLabel: 'Modern JavaScript & Node', difficulty: 'Intermediate',
    question: 'How does JavaScript Prototype Inheritance work when looking up an unassigned property on an object?',
    codeSnippet: `const animal = { eats: true };
const rabbit = Object.create(animal);
console.log(rabbit.eats);`,
    options: [
      'The runtime walks the `[[Prototype]]` chain upward until it finds the property or reaches `null`',
      'It queries a global database index for the variable name',
      'It throws an immediate ReferenceError if the property is not an own-property',
      'It clones the entire animal prototype onto the rabbit object',
    ],
    correctIndex: 0,
    explanation: "When accessing a property, the JavaScript engine first checks the object's own properties. If not found, it inspects its prototype (`__proto__`), traversing upward through the prototype chain until the property is found or `null` is encountered.",
    focusArea: 'Focus Area: Prototype Chain Property Traversal',
  },
  {
    id: 'js-a1', category: 'javascript', categoryLabel: 'Modern JavaScript & Node', difficulty: 'Advanced',
    question: 'In high-throughput Node.js servers, how does backpressure handling in Streams prevent out-of-memory crashes?',
    codeSnippet: 'readableStream.pipe(writableStream);',
    options: [
      "When the writable buffer passes `highWaterMark`, `write()` returns `false` and the source pauses until `drain`",
      'Node.js automatically increases the process heap size to 64GB when buffers fill',
      'It drops excess incoming network packets whenever internal buffers are full',
      'It compresses stream chunks into gzip format in RAM before writing',
    ],
    correctIndex: 0,
    explanation: "Backpressure coordinates mismatched reading and writing speeds. When a writable stream's buffer fills past `highWaterMark`, write returns false, pausing the readable source until the writable flushes to the underlying resource and emits 'drain'.",
    focusArea: 'Focus Area: Node.js Stream Backpressure & highWaterMark',
  },
  {
    id: 'js-a2', category: 'javascript', categoryLabel: 'Modern JavaScript & Node', difficulty: 'Advanced',
    question: 'What is the difference between CommonJS (`require`) and ECMAScript Modules (`import` / ESM) in modern Node.js runtimes?',
    codeSnippet: null,
    options: [
      'CommonJS loads synchronously at runtime; ESM is parsed statically before execution, enabling live bindings and top-level await',
      'CommonJS executes only in browsers via script tags while ESM executes only in Node.js',
      'ESM snapshots exported primitives at import time whereas CommonJS preserves live bindings',
      'CommonJS modules are limited to JSON data and cannot export functions or classes',
    ],
    correctIndex: 0,
    explanation: 'ESM uses static module structure (imports/exports are determined before code executes, enabling tree-shaking and live bindings). CommonJS loads synchronously at runtime when `require()` is called.',
    focusArea: 'Focus Area: ESM Static Module Analysis vs CommonJS Synchronous Loading',
  },
  {
    id: 'js-a3', category: 'javascript', categoryLabel: 'Modern JavaScript & Node', difficulty: 'Advanced',
    question: 'What V8 engine optimization de-optimizes and degrades JavaScript execution from TurboFan machine code back to Ignition bytecode?',
    codeSnippet: `function add(a, b) {
    return a + b;
}
add(1, 2); // Warm path (monomorphic SMI numbers)
add("hello", 3); // Passing polymorphic string changes hidden class!`,
    options: [
      'Megamorphic type pollution that changes the hidden class, breaking inline caches and forcing de-optimization',
      'Calling `console.log()` inside a hot loop during every iteration',
      'Defining variables with the `let` keyword instead of `var` in hot functions',
      'Using arrow functions instead of the `function` keyword for callbacks',
    ],
    correctIndex: 0,
    explanation: "V8's TurboFan compiler optimizes monomorphic call sites by caching inline assembly assuming consistent hidden classes (Shapes). Passing inconsistent types (e.g. numbers then strings) pollutes inline caches, forcing the engine to de-optimize back to bytecode.",
    focusArea: 'Focus Area: V8 TurboFan Optimization & Inline Cache Megamorphism',
  },
];
