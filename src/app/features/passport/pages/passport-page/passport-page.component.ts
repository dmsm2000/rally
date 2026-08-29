import { Component, inject } from '@angular/core';
import { PassportService } from '../../passport.service';
import { StatComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { RallyMapComponent, MapMarker, AchievementCardComponent, PlayerCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-passport-page',
  imports: [StatComponent, SectionHeaderComponent, RallyMapComponent, AchievementCardComponent, PlayerCardComponent, TranslatePipe],
  templateUrl: './passport-page.component.html',
  styleUrl: './passport-page.component.scss',
})
export class PassportPageComponent {
  protected readonly passport = inject(PassportService);

  protected readonly markers = (): MapMarker[] =>
    this.passport.countries().map((c) => ({ id: c.name, x: c.coords.x, y: c.coords.y, kind: c.visited ? 'destination' : 'locked', label: c.name }));
}
