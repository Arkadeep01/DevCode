import type { TagVariant } from '../../components/Tag/Tag';
import type { TopicTag } from '../../types/topic';

export const TAG_META: Record<TopicTag, { label: string; variant: TagVariant }> = {
  high_freq: { label: 'High frequency', variant: 'warn' },
  company_fav: { label: 'Company favorite', variant: 'flag' },
  core: { label: 'Core concept', variant: 'info' },
};
