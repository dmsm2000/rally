import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Player } from '../../../core/models';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AvatarComponent } from '../../ui';

const GENDER_CLASSES: Record<string, string> = {
  Male: 'bg-cobalt text-white',
  Female: 'bg-pink-400 text-ink',
  NonBinary: 'bg-lime text-ink'
};

const GENDER_ICONS: Record<string, 'gender-male' | 'gender-female' | 'gender-nonbinary'> = {
  Male: 'gender-male',
  Female: 'gender-female',
  NonBinary: 'gender-nonbinary'
};

/**
 * A lighter player card for contexts where the discovery framing of `rally-player-card` (match
 * score, compatibility blurb, level/format/surface chips) doesn't make sense — the passport's
 * "players met" tab is a stamp of who you've already played, not a "should I play them" pitch.
 */
@Component({
  selector: 'rally-player-met-card',
  imports: [RouterLink, AvatarComponent, TranslatePipe],
  templateUrl: './player-met-card.component.html',
  styleUrl: './player-met-card.component.scss'
})
export class PlayerMetCardComponent {
  readonly player = input.required<Player>();
  readonly timesPlayed = input.required<number>();
  readonly lastPlayedAt = input.required<string>();

  protected genderClass(gender: string | undefined): string {
    return gender ? (GENDER_CLASSES[gender] ?? 'bg-lime text-ink') : 'bg-lime text-ink';
  }

  protected genderIcon(gender: string | undefined): 'gender-male' | 'gender-female' | 'gender-nonbinary' | undefined {
    return gender ? GENDER_ICONS[gender] : undefined;
  }
}
