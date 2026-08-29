import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorldService } from '../../world.service';
import { PageHeaderComponent, ChipComponent, StatComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { RallyMapComponent, CourtCardComponent, PlayerCardComponent, TournamentCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-world-page',
  imports: [RouterLink, PageHeaderComponent, ChipComponent, StatComponent, SectionHeaderComponent, RallyMapComponent, CourtCardComponent, PlayerCardComponent, TournamentCardComponent, TranslatePipe],
  templateUrl: './world-page.component.html',
  styleUrl: './world-page.component.scss',
})
export class WorldPageComponent {
  protected readonly world = inject(WorldService);
}
