import { Component, inject } from '@angular/core';
import { AchievementsService } from '../../achievements.service';
import { PageHeaderComponent, StatComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { AchievementCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-achievements-page',
  imports: [PageHeaderComponent, StatComponent, SectionHeaderComponent, AchievementCardComponent, TranslatePipe],
  templateUrl: './achievements-page.component.html',
  styleUrl: './achievements-page.component.scss',
})
export class AchievementsPageComponent {
  protected readonly achievements = inject(AchievementsService);
}
