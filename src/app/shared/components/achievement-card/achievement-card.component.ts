import { Component, computed, input } from '@angular/core';
import { Achievement } from '../../../core/models';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-achievement-card',
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
}
