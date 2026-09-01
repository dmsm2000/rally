import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Player } from '../../../core/models';
import { DistanceKmPipe } from '../../pipes/distance-km.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AvatarComponent, ChipComponent, MatchScoreComponent } from '../../ui';

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
  selector: 'rally-player-card',
  imports: [RouterLink, AvatarComponent, ChipComponent, MatchScoreComponent, DistanceKmPipe, TranslatePipe],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.scss'
})
export class PlayerCardComponent {
  readonly player = input.required<Player>();
  readonly compact = input(false);
  readonly showMatchScore = input(true);

  protected genderSymbol(gender: string | undefined): string | undefined {
    return gender ? GENDER_SYMBOLS[gender] : undefined;
  }

  protected profileBadge(gender: string | undefined): string {
    return this.genderSymbol(gender) ?? '🎾';
  }

  protected genderClass(gender: string | undefined): string {
    return gender ? (GENDER_CLASSES[gender] ?? 'bg-lime text-ink') : 'bg-lime text-ink';
  }
}
