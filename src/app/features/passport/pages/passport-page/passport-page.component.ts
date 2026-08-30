import { Component, inject } from '@angular/core';
import { PassportService } from '../../passport.service';
import { StatComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { AchievementCardComponent, PlayerCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-passport-page',
  imports: [StatComponent, SectionHeaderComponent, AchievementCardComponent, PlayerCardComponent, TranslatePipe],
  templateUrl: './passport-page.component.html',
  styleUrl: './passport-page.component.scss',
})
export class PassportPageComponent {
  protected readonly passport = inject(PassportService);
}
