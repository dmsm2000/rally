import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../profile.service';
import { AvatarComponent, ChipComponent, StatComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { MatchCardComponent, CourtCardComponent, AchievementCardComponent, CountryBadgeComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-profile-page',
  imports: [RouterLink, AvatarComponent, ChipComponent, StatComponent, SectionHeaderComponent, MatchCardComponent, CourtCardComponent, AchievementCardComponent, CountryBadgeComponent, TranslatePipe],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
  protected readonly profile = inject(ProfileService);
}
