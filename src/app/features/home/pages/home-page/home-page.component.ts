import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeService } from '../../home.service';
import { StatComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { PlayerCardComponent, MatchCardComponent, CourtCardComponent, TournamentCardComponent, FeedCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, StatComponent, SectionHeaderComponent, PlayerCardComponent, MatchCardComponent, CourtCardComponent, TournamentCardComponent, FeedCardComponent, TranslatePipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  protected readonly home = inject(HomeService);
}
