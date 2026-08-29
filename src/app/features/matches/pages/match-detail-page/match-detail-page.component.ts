import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { MatchesService } from '../../matches.service';
import { AvatarComponent, ChipComponent } from '../../../../shared/ui';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-match-detail-page',
  imports: [RouterLink, AvatarComponent, ChipComponent, TranslatePipe],
  templateUrl: './match-detail-page.component.html',
  styleUrl: './match-detail-page.component.scss',
})
export class MatchDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly matches = inject(MatchesService);

  private readonly matchId = toSignal(this.route.paramMap.pipe(map((params) => params.get('matchId') ?? '')), { initialValue: '' });

  protected readonly match = computed(() => this.matches.getById(this.matchId()));
  protected readonly playerA = computed(() => this.match() && this.matches.playerById(this.match()!.playerA));
  protected readonly playerB = computed(() => this.match() && this.matches.playerById(this.match()!.playerB));
  protected readonly court = computed(() => this.match() && this.matches.courtById(this.match()!.courtId));
  protected readonly done = computed(() => this.match()?.status === 'complete');
  protected readonly aWon = computed(() => this.match()?.winner === this.match()?.playerA);
}
