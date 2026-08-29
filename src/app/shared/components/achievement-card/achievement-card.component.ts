import { Component, computed, input } from '@angular/core';
import { Achievement, AchievementTier } from '../../../core/models';
import { TranslatePipe } from '../../pipes/translate.pipe';

interface TierStyle {
  badge: string;
  bar: string;
  pill: string;
  glow: string;
}

const TIER_STYLES: Record<AchievementTier, TierStyle> = {
  bronze: {
    badge: 'border-clay/40 bg-clay/15 text-clay',
    bar: 'bg-clay',
    pill: 'bg-clay/15 text-clay',
    glow: '',
  },
  silver: {
    badge: 'border-silver/50 bg-silver/20 text-muted-foreground',
    bar: 'bg-silver',
    pill: 'bg-silver/20 text-muted-foreground',
    glow: '',
  },
  gold: {
    badge: 'border-achievement/40 bg-achievement/15 text-achievement',
    bar: 'bg-achievement',
    pill: 'bg-achievement/15 text-achievement',
    glow: 'shadow-[0_0_0_1px_var(--achievement)_inset]',
  },
  world: {
    badge: 'border-cobalt/40 bg-gradient-to-br from-lime/25 to-cobalt/25 text-cobalt',
    bar: 'bg-gradient-to-r from-lime to-cobalt',
    pill: 'bg-gradient-to-r from-lime/25 to-cobalt/25 text-cobalt',
    glow: 'shadow-[0_0_0_1px_var(--cobalt)_inset]',
  },
};

@Component({
  selector: 'rally-achievement-card',
  imports: [TranslatePipe],
  templateUrl: './achievement-card.component.html',
  styleUrl: './achievement-card.component.scss',
})
export class AchievementCardComponent {
  readonly achievement = input.required<Achievement>();

  protected readonly pct = computed(() => {
    const a = this.achievement();
    return a.progress && a.goal ? Math.round((a.progress / a.goal) * 100) : a.unlocked ? 100 : 0;
  });

  protected readonly tierStyle = computed(() => TIER_STYLES[this.achievement().tier]);
}
