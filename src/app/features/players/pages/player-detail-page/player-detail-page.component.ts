import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { PlayersService } from '../../players.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { MessagesWidgetService } from '../../../../core/services/messages-widget.service';
import { AvatarComponent, ChipComponent, EmptyStateComponent, MatchScoreComponent, SectionHeaderComponent, StatComponent } from '../../../../shared/ui';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

type PlayerMatchTab = 'upcoming' | 'complete' | 'open';

const PREFERENCE_KEYS: Record<string, string> = {
  Right: 'auth.handRight',
  Left: 'auth.handLeft',
  Ambidextrous: 'auth.handAmbi',
  OneHanded: 'auth.backhandOne',
  TwoHanded: 'auth.backhandTwo',
  Unknown: 'auth.backhandUnknown',
  AggressiveBaseliner: 'auth.styleAggressiveBaseliner',
  Counterpuncher: 'auth.styleCounterpuncher',
  ServeAndVolleyer: 'auth.styleServeVolley',
  AllCourt: 'auth.styleAllCourt',
  Indoor: 'enums.indoor',
  Outdoor: 'enums.outdoor',
  NoPreference: 'auth.noPreference',
  Morning: 'auth.morning',
  Afternoon: 'auth.afternoon',
  Evening: 'auth.evening'
};

const GENDER_SYMBOLS: Record<string, string> = {
  Male: '♂',
  Female: '♀',
  NonBinary: '⚧'
};

const GENDER_CLASSES: Record<string, string> = {
  Male: 'bg-cobalt text-white',
  Female: 'bg-pink-400 text-ink',
  NonBinary: 'bg-lime text-ink'
};

@Component({
  selector: 'rally-player-detail-page',
  imports: [RouterLink, AvatarComponent, ChipComponent, EmptyStateComponent, MatchScoreComponent, StatComponent, SectionHeaderComponent, TranslatePipe],
  templateUrl: './player-detail-page.component.html',
  styleUrl: './player-detail-page.component.scss',
})
export class PlayerDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly players = inject(PlayersService);
  protected readonly auth = inject(AuthService);
  private readonly messagesWidget = inject(MessagesWidgetService);

  private readonly playerId = toSignal(this.route.paramMap.pipe(map((params) => params.get('playerId') ?? '')), { initialValue: '' });

  protected readonly player = computed(() => this.players.getById(this.playerId()));
  protected readonly matchTab = signal<PlayerMatchTab>('upcoming');

  protected preferenceKey(value: string): string {
    return PREFERENCE_KEYS[value] ?? value;
  }

  protected genderEmoji(gender: string | undefined): string | undefined {
    return gender ? GENDER_SYMBOLS[gender] : undefined;
  }

  protected profileBadge(gender: string | undefined): string {
    return this.genderEmoji(gender) ?? '🎾';
  }

  protected genderClass(gender: string | undefined): string {
    return gender ? (GENDER_CLASSES[gender] ?? 'bg-lime text-ink') : 'bg-lime text-ink';
  }

  protected message(playerId: string): void {
    this.messagesWidget.openThread(playerId);
  }
}
