import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { AvatarComponent } from '../../ui';

@Component({
  selector: 'app-ranking-row',
  imports: [RouterLink, AvatarComponent],
  templateUrl: './ranking-row.component.html',
  styleUrl: './ranking-row.component.scss',
})
export class RankingRowComponent {
  private readonly data = inject(RallyDataService);

  readonly rank = input.required<number>();
  readonly playerId = input.required<string>();
  readonly points = input.required<number>();
  readonly trend = input.required<string>();

  protected readonly player = computed(() => this.data.playerById(this.playerId()));
  protected readonly trendClass = computed(() => (this.trend().startsWith('+') ? 'text-win' : this.trend() === '0' ? 'text-muted-foreground' : 'text-loss'));
}
