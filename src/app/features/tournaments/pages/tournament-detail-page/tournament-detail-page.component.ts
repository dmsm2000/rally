import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { TournamentsService } from '../../tournaments.service';
import { StatComponent, ChipComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-tournament-detail-page',
  imports: [RouterLink, StatComponent, ChipComponent, SectionHeaderComponent, TranslatePipe],
  templateUrl: './tournament-detail-page.component.html',
  styleUrl: './tournament-detail-page.component.scss',
})
export class TournamentDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly tournaments = inject(TournamentsService);

  private readonly tournamentId = toSignal(this.route.paramMap.pipe(map((params) => params.get('tournamentId') ?? '')), { initialValue: '' });

  protected readonly tournament = computed(() => this.tournaments.getById(this.tournamentId()));
  protected readonly bracket = this.tournaments.bracket;
  protected readonly pct = computed(() => {
    const t = this.tournament();
    return t ? Math.round((t.participants / t.capacity) * 100) : 0;
  });
}
