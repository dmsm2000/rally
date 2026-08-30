import { Component, inject } from '@angular/core';
import { AchievementCardComponent, PlayerCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { SectionHeaderComponent, StatComponent } from '../../../../shared/ui';
import { PassportService } from '../../passport.service';

@Component({
  selector: 'rally-passport-page',
  imports: [StatComponent, SectionHeaderComponent, AchievementCardComponent, PlayerCardComponent, TranslatePipe],
  templateUrl: './passport-page.component.html',
  styleUrl: './passport-page.component.scss'
})
export class PassportPageComponent {
  protected readonly passport = inject(PassportService);
}
