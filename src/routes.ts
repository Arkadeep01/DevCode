/** Route path constants. Use these instead of string literals. */
export const ROUTES = {
  home: '/',
  study: '/study',
  practice: '/practice',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** DOM ids of the in-page sections targeted by navbar/hero scroll links. */
export const SECTION_IDS = {
  studyPaths: 'study-paths',
  dailyChallenge: 'daily-challenge',
  whyDevcode: 'why-devcode',
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];
