import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { PlayersService } from '../../players.service';
import { RallyDataService } from '../../../../core/data/rally-data.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { MessagesWidgetService } from '../../../../core/services/messages-widget.service';
import { AvatarComponent, ChipComponent, MatchScoreComponent, StatComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { CourtCardComponent, MatchCardComponent, CountryBadgeComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-player-detail-page',
  imports: [RouterLink, AvatarComponent, ChipComponent, MatchScoreComponent, StatComponent, SectionHeaderComponent, CourtCardComponent, MatchCardComponent, CountryBadgeComponent, TranslatePipe],
  templateUrl: './player-detail-page.component.html',
  styleUrl: './player-detail-page.component.scss',
})
export class PlayerDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly players = inject(PlayersService);
  private readonly data = inject(RallyDataService);
  protected readonly auth = inject(AuthService);
  private readonly messagesWidget = inject(MessagesWidgetService);

  private readonly playerId = toSignal(this.route.paramMap.pipe(map((params) => params.get('playerId') ?? '')), { initialValue: '' });

  protected readonly player = computed(() => this.players.getById(this.playerId()));
  protected readonly history = computed(() => {
    const id = this.playerId();
    return this.data.matches().filter((m) => m.playerA === id || m.playerB === id);
  });
  protected readonly visitedCountries = computed(() => {
    const count = this.player()?.stats.countries ?? 0;
    return this.data.countries().filter((c) => c.visited).slice(0, count);
  });
  protected readonly unlockedAchievements = computed(() => this.data.achievements().filter((a) => a.unlocked));
  protected readonly featuredCourts = computed(() => this.data.courts().slice(0, 4));

  protected message(playerId: string): void {
    this.messagesWidget.openThread(playerId);
  }
}
