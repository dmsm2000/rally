export type FeedKind = 'match' | 'court' | 'review' | 'milestone' | 'meet' | 'challenge' | 'trip' | 'highlight';

export interface FeedStat {
  label: string;
  value: string;
}

export interface FeedItem {
  id: string;
  playerId: string;
  kind: FeedKind;
  text: string;
  detail?: string;
  time: string;
  image?: string;
  video?: string;
  stat?: FeedStat[];
}
