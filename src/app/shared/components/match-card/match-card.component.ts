import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { Match } from '../../../core/models';
import { AvatarComponent } from '../../ui';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-match-card',
  imports: [RouterLink, AvatarComponent, TranslatePipe],
  templateUrl: './match-card.component.html',
  styleUrl: './match-card.component.scss',
})
export class MatchCardComponent {
  private readonly data = inject(RallyDataService);

  readonly match = input.required<Match>();
  readonly compact = input(false);

  protected readonly playerA = computed(() => this.data.playerById(this.match().playerA));
  protected readonly playerB = computed(() => this.data.playerById(this.match().playerB));
  protected readonly court = computed(() => this.data.courtById(this.match().courtId));

  private readonly done = computed(() => this.match().status === 'complete');
  private readonly won = computed(() => this.match().winner === this.match().playerA);

  protected readonly statusLabel = computed(() => (this.done() ? (this.won() ? 'enums.matchStatus.win' : 'enums.matchStatus.loss') : this.match().status === 'live' ? 'enums.matchStatus.live' : 'enums.matchStatus.upcoming'));
  protected readonly statusClasses = computed(() => (this.done() ? (this.won() ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss') : 'bg-lime text-ink'));
}
