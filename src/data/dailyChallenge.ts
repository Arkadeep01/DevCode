export interface DailyChallenge {
  id: string;
  topic: string;
  minutes: number;
  difficulty: string;
  title: string;
  description: string;
  codeLang: string;
  code: string;
}

export const DAILY_CHALLENGE: DailyChallenge = {
  id: 'two-sum',
  topic: 'Arrays',
  minutes: 15,
  difficulty: 'Easy',
  title: 'Two Sum',
  description:
    'Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.',
  codeLang: 'javascript',
  code: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    // your insight goes here
  }
}`,
};
