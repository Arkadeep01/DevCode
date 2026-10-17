import type { StudyTopic } from '../../types/topic';

export const DSA_TOPICS: StudyTopic[] = [
  {
    id: 'dsa-sliding-window',
    category: 'dsa',
    categoryLabel: 'Core DSA Patterns',
    title: 'Two Pointers & Sliding Window Pattern',
    frequency: 'High Frequency',
    tags: ['high_freq', 'company_fav', 'core'],
    difficulty: 'Medium',
    takeaway:
      'Maintain a dynamic left/right window invariant over arrays or strings to reduce O(N²) quadratic nested loops down to O(N) linear time by adding new elements on the right and shrinking invalid states from the left.',
    deepDive: [
      '<strong>Fixed Window:</strong> Window size K is constant. Slide right by 1, add <code>arr[r]</code>, and evict <code>arr[r - K]</code>.',
      '<strong>Dynamic Window:</strong> Expand right pointer greedily while conditions are valid. When an invariant breaks (e.g., duplicate char or sum > K), advance left pointer until valid again.',
      '<strong>State Tracking:</strong> Use an integer hash table or frequency map to record window element occurrences in O(1) time.',
      '<strong>Time & Space Complexity:</strong> O(N) time because each index is visited at most twice (once by right, once by left). O(min(N, Σ)) space for hash map.',
    ],
    codeLang: 'Python 3 & C++',
    codeSnippet: `# Sliding Window: Longest Substring Without Repeating Characters
def length_of_longest_substring(s: str) -> int:
    char_index_map = {}
    max_len = 0
    left = 0
    for right, char in enumerate(s):
        if char in char_index_map and char_index_map[char] >= left:
            left = char_index_map[char] + 1
        char_index_map[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len

// C++ Equivalent Two-Pointer Window
int minSubArrayLen(int target, vector<int>& nums) {
    int left = 0, sum = 0, min_len = INT_MAX;
    for (int right = 0; right < nums.size(); ++right) {
        sum += nums[right];
        while (sum >= target) {
            min_len = min(min_len, right - left + 1);
            sum -= nums[left++];
        }
    }
    return min_len == INT_MAX ? 0 : min_len;
}`,
    pitfalls: [
      'Updating the left pointer without checking if the cached character index is actually inside the active window (<code>char_map[c] >= left</code>).',
      'Off-by-one errors when computing window length: length is <code>right - left + 1</code>, not <code>right - left</code>.',
      'Failing to handle negative numbers in subarray sum problems (requires prefix sums with a hash map instead of standard two pointers).',
    ],
  },
  {
    id: 'dsa-reverse-linkedlist',
    category: 'dsa',
    categoryLabel: 'Core DSA Patterns',
    title: 'Reverse a Singly Linked List (Iterative & Recursive)',
    frequency: 'High Frequency',
    tags: ['high_freq', 'company_fav', 'core'],
    difficulty: 'Easy - Medium',
    takeaway:
      'Flip the direction of next pointers by caching the previous, current, and next nodes in O(N) time and O(1) auxiliary space, or leverage the recursive call stack with base case termination.',
    deepDive: [
      '<strong>Iterative 3-Pointer Approach:</strong> Maintain <code>prev = None</code> and <code>curr = head</code>. Cache <code>next_temp = curr.next</code>, point <code>curr.next = prev</code>, then shift <code>prev = curr</code> and <code>curr = next_temp</code>.',
      '<strong>Recursive Mechanics:</strong> Recurse to the tail. The base case returns the new head. As recursion unwinds, point <code>head.next.next = head</code> and sever <code>head.next = None</code> to prevent infinite cycles.',
      '<strong>Memory Trade-off:</strong> Iterative achieves strictly O(1) auxiliary space; recursive incurs O(N) stack frame memory which can cause StackOverflow on long lists.',
    ],
    codeLang: 'Java & C++',
    codeSnippet: `// Iterative O(1) Space Solution
public ListNode reverseListIterative(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;
    while (curr != null) {
        ListNode nextTemp = curr.next; // 1. Save next
        curr.next = prev;             // 2. Reverse pointer
        prev = curr;                  // 3. Step prev forward
        curr = nextTemp;              // 4. Step curr forward
    }
    return prev; // New head
}

// Recursive O(N) Stack Solution
public ListNode reverseListRecursive(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode newHead = reverseListRecursive(head.next);
    head.next.next = head; // Point successor back to current
    head.next = null;      // Sever old forward link
    return newHead;
}`,
    pitfalls: [
      'Forgetting to set <code>head.next = null</code> in recursive backtracking, which creates a circular reference and an infinite loop.',
      'Dereferencing <code>curr.next</code> before checking if <code>curr</code> is null (NullPointerException).',
      'Losing the reference to the remainder of the linked list before flipping the current node pointer.',
    ],
  },
  {
    id: 'dsa-floyd-cycle',
    category: 'dsa',
    categoryLabel: 'Core DSA Patterns',
    title: "Cycle Detection (Floyd's Tortoise and Hare Algorithm)",
    frequency: 'High Frequency',
    tags: ['high_freq', 'core'],
    difficulty: 'Medium',
    takeaway:
      'Use two pointers moving at different speeds (slow advances by 1, fast advances by 2). If a cycle exists, fast will inevitably lap slow inside the loop in O(N) time with zero extra memory.',
    deepDive: [
      '<strong>Proof of Convergence:</strong> Within each loop iteration, the gap between fast and slow decreases by exactly 1 node. Thus, fast meets slow in at most C steps, where C is cycle length.',
      '<strong>Finding Cycle Origin:</strong> After fast and slow collide, reset slow to head. Advance both slow and fast by 1 step simultaneously. Their meeting node is the exact entry point of the cycle (2(F + a) = F + a + kC &rArr; F = kC - a).',
      '<strong>Universal Application:</strong> Applies to Linked Lists, Array Duplicate Detection (LeetCode 287), and Graph Functional Digraphs.',
    ],
    codeLang: 'C++ & Python',
    codeSnippet: `// Detect Cycle and Locate Exact Entry Point
ListNode* detectCycle(ListNode *head) {
    ListNode *slow = head, *fast = head;
    
    // Step 1: Detect presence of cycle
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            // Step 2: Find cycle origin node
            ListNode *entry = head;
            while (entry != slow) {
                entry = entry->next;
                slow = slow->next;
            }
            return entry; // Cycle entrance
        }
    }
    return nullptr; // No cycle
}`,
    pitfalls: [
      'Only checking <code>fast != null</code> without verifying <code>fast.next != null</code>, triggering a segmentation fault or NullPointerException.',
      'Modifying node values (flagging) instead of using two pointers when O(1) space and immutable data is required.',
      'Assuming fast and slow meet at the cycle entry; their collision occurs inside the cycle, requiring Phase 2 to find the entrance.',
    ],
  },
  {
    id: 'dsa-binary-search-answer',
    category: 'dsa',
    categoryLabel: 'Core DSA Patterns',
    title: 'Binary Search on Answer Space (Monotonic Predicate)',
    frequency: 'High Frequency',
    tags: ['high_freq', 'company_fav'],
    difficulty: 'Medium - Hard',
    takeaway:
      'When direct optimization is complex but checking whether a candidate answer is feasible runs in O(N) time, binary search over the range [min_ans, max_ans] solves the problem in O(N * log(Range)).',
    deepDive: [
      '<strong>Monotonicity Invariant:</strong> The predicate function <code>isValid(X)</code> must be monotonic (e.g. False, False, True, True... or vice-versa).',
      '<strong>Range Bounds:</strong> Carefully define lower bound <code>low</code> (minimum possible answer) and upper bound <code>high</code> (worst-case answer, e.g. sum of all elements).',
      '<strong>Typical Problems:</strong> Koko Eating Bananas (LeetCode 875), Capacity To Ship Packages Within D Days (1011), Split Array Largest Sum (410).',
    ],
    codeLang: 'Python 3',
    codeSnippet: `def ship_within_days(weights: list[int], days: int) -> int:
    def can_ship(capacity: int) -> bool:
        needed_days = 1
        curr_load = 0
        for w in weights:
            if curr_load + w > capacity:
                needed_days += 1
                curr_load = 0
            curr_load += w
        return needed_days <= days

    low = max(weights)       # Cannot ship an item larger than capacity
    high = sum(weights)      # Worst case: ship everything in 1 day
    ans = high

    while low <= high:
        mid = low + (high - low) // 2
        if can_ship(mid):
            ans = mid        # Try finding a smaller valid capacity
            high = mid - 1
        else:
            low = mid + 1    # Capacity too small, increase
            
    return ans`,
    pitfalls: [
      'Calculating mid as <code>(low + high) / 2</code> instead of <code>low + (high - low) / 2</code>, risking 32-bit signed integer overflow in languages like C++/Java.',
      'Selecting incorrect initial search bounds (e.g., setting <code>low = 0</code> instead of <code>max(weights)</code>, causing an infinite loop in the predicate).',
      'Incorrect termination conditions resulting in off-by-one errors (use clear <code>while low <= high</code> with explicit assignment).',
    ],
  },
];
