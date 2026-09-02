import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { Match, Player } from '../../../core/models';
import { AvatarComponent } from '../../ui';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'rally-match-card',
  imports: [RouterLink, AvatarComponent, TranslatePipe, DatePipe],
  templateUrl: './match-card.component.html',
  styleUrl: './match-card.component.scss',
})
export class MatchCardComponent {
  private readonly data = inject(RallyDataService);

  readonly match = input.required<Match>();
  readonly playerA = input<Player | undefined>();
  readonly playerB = input<Player | undefined>();
  /** Full doubles roster (see MatchesService.participantsFor()) — ignored for Singles matches. */
  readonly participants = input<(Player | undefined)[]>([]);
  readonly compact = input(false);

  protected readonly court = computed(() => this.data.courtById(this.match().courtId ?? ''));
  protected readonly locationLabel = computed(() => {
    const court = this.court();
    return court ? `${court.flag} ${court.name}` : `📍 ${this.match().city}`;
  });

  private readonly done = computed(() => this.match().status === 'complete');
  private readonly won = computed(() => this.match().winner === this.match().playerA);

  protected readonly statusLabel = computed(() => (this.done() ? (this.won() ? 'enums.matchStatus.win' : 'enums.matchStatus.loss') : 'enums.matchStatus.upcoming'));
  protected readonly statusClasses = computed(() => (this.done() ? (this.won() ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss') : 'bg-lime text-ink'));
}
