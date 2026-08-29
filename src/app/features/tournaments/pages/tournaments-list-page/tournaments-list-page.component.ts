import { Component, inject } from '@angular/core';
import { TournamentsService } from '../../tournaments.service';
import { PageHeaderComponent, ChipComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { TournamentCardComponent, RankingRowComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-tournaments-list-page',
  imports: [PageHeaderComponent, ChipComponent, SectionHeaderComponent, TournamentCardComponent, RankingRowComponent, TranslatePipe],
  templateUrl: './tournaments-list-page.component.html',
  styleUrl: './tournaments-list-page.component.scss',
})
export class TournamentsListPageComponent {
  protected readonly tournaments = inject(TournamentsService);
}
