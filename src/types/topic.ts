export type TopicCategory = 'dsa' | 'must_know' | 'language' | 'db_sys';

export type TopicTag = 'high_freq' | 'company_fav' | 'core';

export interface StudyTopic {
  id: string;
  category: TopicCategory;
  categoryLabel: string;
  title: string;
  frequency: string;
  tags: TopicTag[];
  difficulty: string;
  takeaway: string;
  deepDive: string[];
  codeLang: string;
  codeSnippet: string;
  pitfalls: string[];
}

export interface TopicCategoryMeta {
  id: TopicCategory;
  label: string;
}
