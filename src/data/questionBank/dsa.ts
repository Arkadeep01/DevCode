import type { Question } from '../../types/question';

export const DSA_QUESTIONS: Question[] = [
  {
    id: 'dsa-b1', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Beginner',
    question: 'Which tree traversal strategy visits nodes in strictly ascending order when executed on a valid Binary Search Tree (BST)?',
    codeSnippet: null,
    options: [
      'In-Order Traversal (Left, Root, Right)',
      'Pre-Order Traversal (Root, Left, Right)',
      'Post-Order Traversal (Left, Right, Root)',
      'Breadth-First Level-Order Traversal',
    ],
    correctIndex: 0,
    explanation: 'By BST definition, left subtrees contain keys strictly smaller than the root, and right subtrees contain keys greater than the root. Traversing Left -> Root -> Right (In-Order) visits elements in strictly sorted ascending order.',
    focusArea: 'Focus Area: Binary Search Tree In-Order Traversal',
  },
  {
    id: 'dsa-b2', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Beginner',
    question: 'What is the average and worst-case time complexity of accessing an element by its numeric index in a standard continuous dynamic array?',
    codeSnippet: 'int value = arr[42]; // Direct index access',
    options: [
      'O(1) constant time',
      'O(log N) logarithmic time',
      'O(N) linear time',
      'O(N²) quadratic time',
    ],
    correctIndex: 0,
    explanation: 'Because dynamic arrays allocate contiguous physical memory blocks, array index access computes memory address via base_address + (index * element_size) in strictly O(1) time.',
    focusArea: 'Focus Area: Contiguous Array Memory Address Arithmetic',
  },
  {
    id: 'dsa-b3', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Beginner',
    question: 'Which data structure operates strictly under the First-In, First-Out (FIFO) access policy?',
    codeSnippet: null,
    options: ['Queue', 'Stack', 'Max Heap', 'Disjoint Set (Union-Find)'],
    correctIndex: 0,
    explanation: 'A Queue enforces First-In, First-Out (FIFO) semantics, where items are enqueued at the back and dequeued from the front. Stacks enforce Last-In, First-Out (LIFO).',
    focusArea: 'Focus Area: Queue FIFO Order & Interface Invariants',
  },
  {
    id: 'dsa-b4', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Beginner',
    question: 'What is the time complexity of searching for an item in a sorted array of size N using Binary Search?',
    codeSnippet: null,
    options: ['O(log N)', 'O(1)', 'O(N)', 'O(N log N)'],
    correctIndex: 0,
    explanation: 'Binary search cuts the remaining search space in half with every comparison (N/2, N/4, ...), achieving O(log N) worst-case time complexity.',
    focusArea: 'Focus Area: Binary Search Logarithmic Divide-and-Conquer',
  },
  {
    id: 'dsa-b5', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Beginner',
    question: 'What is the time complexity of the one-pass hash map solution to the Two Sum problem, which stores each value with its index while scanning the array?',
    codeSnippet: null,
    options: [
      'O(N) — one scan with constant-time map lookups',
      'O(N log N) — a sort followed by one scan',
      'O(N²) — a nested loop over every pair',
      'O(1) — the map resolves every sum directly',
    ],
    correctIndex: 0,
    explanation: 'The array is scanned once; for each element the map answers "have I already seen the complement?" in O(1) average time, so the whole pass runs in O(N) time with O(N) extra space.',
    focusArea: 'Focus Area: Two Sum Hash Map Linear Scan',
  },
  {
    id: 'dsa-b6', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Beginner',
    question: 'Why can a hash map find the Two Sum pair in a single pass instead of checking every possible pair?',
    codeSnippet: null,
    options: [
      'It remembers seen values so each complement lookup is instant',
      'It sorts the values first so the pair sits next to each other',
      'It precomputes every possible pair sum before the scan starts',
      'It skips all duplicate values while scanning through the array',
    ],
    correctIndex: 0,
    explanation: 'Storing each seen value (with its index) lets the scan request the exact complement in O(1) average time, replacing the O(N²) all-pairs check with a single linear pass.',
    focusArea: 'Focus Area: Two Sum Complement Lookup Strategy',
  },
  {
    id: 'dsa-b7', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Beginner',
    question: 'In the one-pass Two Sum hash map, what is stored as the keys and what is stored as the values?',
    codeSnippet: null,
    options: [
      'Keys are array values; values are their indices',
      'Keys are their indices; values are array values',
      'Keys are complements; values are their indices',
      'Keys are target sums; values are array values',
    ],
    correctIndex: 0,
    explanation: 'The map answers "which index holds the value I still need?", so each array value is the key and its position is the value. Finding the complement completes the index pair.',
    focusArea: 'Focus Area: Two Sum Map Key-Value Roles',
  },
  {
    id: 'dsa-i1', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Intermediate',
    question: 'What is the amortized time complexity of inserting a key into an LRU Cache of capacity N implemented with a Hash Map and Doubly Linked List?',
    codeSnippet: `class LRUCache {
  unordered_map<int, Node*> map;
  Node *head, *tail;
public:
  void put(int key, int value);
};`,
    options: ['O(1) constant time', 'O(log N) logarithmic time', 'O(N) linear time', 'O(N log N)'],
    correctIndex: 0,
    explanation: 'Combining a hash map (for O(1) key lookups) with a doubly linked list (for O(1) removals and insertions at the head/tail) ensures all get and put operations complete in O(1) amortized time.',
    focusArea: 'Focus Area: LRU Cache Hybrid Map-LinkedList Structure',
  },
  {
    id: 'dsa-i2', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Intermediate',
    question: "In Dijkstra's single-source shortest path algorithm on a graph with V vertices and E edges using a binary min-heap, what is the time complexity?",
    codeSnippet: null,
    options: ['O((V + E) log V)', 'O(V²)', 'O(V * E)', 'O(V! + E)'],
    correctIndex: 0,
    explanation: 'Using a binary min-heap priority queue, extracting the minimum takes O(log V) V times, and edge relaxations decrease keys in O(log V) at most E times, totaling O((V + E) log V).',
    focusArea: 'Focus Area: Dijkstra Shortest Path Min-Heap Efficiency',
  },
  {
    id: 'dsa-i3', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Intermediate',
    question: 'What is the primary operational difference between Breadth-First Search (BFS) and Depth-First Search (DFS) on an unweighted cyclic graph?',
    codeSnippet: null,
    options: [
      'BFS discovers the shortest path in terms of edge count using a queue, while DFS dives deeply along paths using a stack or recursion',
      'DFS guarantees finding the shortest path on unweighted graphs while BFS does not',
      'BFS requires no visited tracking set whereas DFS requires a disjoint set union',
      'DFS runs in O(log V) while BFS runs in O(V!)',
    ],
    correctIndex: 0,
    explanation: 'On unweighted graphs, BFS explores vertices layer-by-layer using a FIFO queue, guaranteeing the shortest path in terms of edge count. DFS dives deep along branches, making it ideal for topological sorts and cycle detection.',
    focusArea: 'Focus Area: BFS Layer Exploration vs DFS Deep Recursion',
  },
  {
    id: 'dsa-i4', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Intermediate',
    question: "What is the time complexity to detect a cycle in a singly linked list using Floyd's Tortoise and Hare algorithm?",
    codeSnippet: `ListNode *slow = head, *fast = head;
while (fast && fast->next) {
    slow = slow->next;
    fast = fast->next->next;
    if (slow == fast) return true;
}`,
    options: [
      'O(N) time and O(1) auxiliary space',
      'O(N log N) time and O(N) space',
      'O(N²) time and O(1) space',
      'O(1) time and O(N) space',
    ],
    correctIndex: 0,
    explanation: "Floyd's cycle-finding algorithm advances slow by 1 step and fast by 2 steps. The relative distance decreases by 1 step every iteration inside the loop, detecting cycles in O(N) time using strictly O(1) memory.",
    focusArea: "Focus Area: Floyd's Two-Pointer Cycle Detection",
  },
  {
    id: 'dsa-a1', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Advanced',
    question: 'In QuickSort with Lomuto partitioning, what pathological case causes the algorithm to degrade to O(N²) time complexity?',
    codeSnippet: `int pivot = arr[high]; // Last element chosen
int i = low - 1;
for (int j = low; j < high; j++) {
    if (arr[j] <= pivot) swap(arr[++i], arr[j]);
}`,
    options: [
      'Selecting the first or last element as pivot on an already sorted or reverse-sorted input array',
      'Partitioning arrays that have identical elements when using 3-way Dutch National Flag partitioning',
      'Using randomized pivot selection when elements fit in CPU L1 cache',
      'Having an even number of elements in the recursive subproblem',
    ],
    correctIndex: 0,
    explanation: 'Choosing a fixed boundary element (first/last) as pivot on already sorted data yields maximally unbalanced splits (0 and N-1 elements). This forces recursion depth to N, producing N*(N-1)/2 operations or O(N²).',
    focusArea: 'Focus Area: QuickSort Degeneracy & Pivot Selection',
  },
  {
    id: 'dsa-a2', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Advanced',
    question: 'Which self-balancing binary search tree guarantees that the height of any branch is strictly at most ~1.44 log₂(N), enforcing stricter balancing than a standard Red-Black Tree?',
    codeSnippet: null,
    options: ['AVL Tree', 'Red-Black Tree', 'Splay Tree', 'Treap'],
    correctIndex: 0,
    explanation: 'AVL Trees enforce that the heights of the two child subtrees of any node differ by at most 1 (balance factor ∈ {-1, 0, 1}), maintaining maximum height ≈ 1.44 log₂(N). Red-Black trees tolerate height up to 2 log₂(N), making AVL faster for lookups.',
    focusArea: 'Focus Area: AVL vs Red-Black Tree Balance Invariants',
  },
  {
    id: 'dsa-a3', category: 'dsa', categoryLabel: 'Data Structures & Algorithms', difficulty: 'Advanced',
    question: 'What is the amortized time complexity per operation in a Disjoint Set Union (DSU / Union-Find) structure implemented with union by rank and path compression?',
    codeSnippet: `int find(int i) {
    if (parent[i] == i) return i;
    return parent[i] = find(parent[i]); // Path compression
}`,
    options: [
      'O(α(N)), where α is the inverse Ackermann function (effectively constant < 5)',
      'O(log* N)',
      'O(log N)',
      'O(1) strict worst-case',
    ],
    correctIndex: 0,
    explanation: 'Combining union by rank/size with path compression reduces the amortized cost per operation to O(α(N)), where α is the inverse Ackermann function, which grows so slowly it is less than 5 for all practical universe scales.',
    focusArea: 'Focus Area: Disjoint Set Union Inverse Ackermann Mechanics',
  },
];
