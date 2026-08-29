export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'world';

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  goal?: number;
  tier: AchievementTier;
}
