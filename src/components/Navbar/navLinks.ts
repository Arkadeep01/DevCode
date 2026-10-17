import { ROUTES, SECTION_IDS, type RoutePath, type SectionId } from '../../routes';

export interface RouteLink {
  label: string;
  to: RoutePath;
}

export interface SectionLink {
  label: string;
  sectionId: SectionId;
}

/** Shown on every route. */
export const ROUTE_LINKS: RouteLink[] = [
  { label: 'Home', to: ROUTES.home },
  { label: 'Study', to: ROUTES.study },
  { label: 'Practice', to: ROUTES.practice },
];

/** In-page Home sections; rendered only while on the Home route. */
export const SECTION_LINKS: SectionLink[] = [
  { label: 'Study paths', sectionId: SECTION_IDS.studyPaths },
  { label: 'Daily challenge', sectionId: SECTION_IDS.dailyChallenge },
  { label: 'Why DevCode', sectionId: SECTION_IDS.whyDevcode },
];
