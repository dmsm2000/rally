import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Player } from '../../../core/models';
import { AvatarComponent, ChipComponent, MatchScoreComponent } from '../../ui';
import { DistanceKmPipe } from '../../pipes/distance-km.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-player-card',
  imports: [RouterLink, AvatarComponent, ChipComponent, MatchScoreComponent, DistanceKmPipe, TranslatePipe],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.scss',
})
export class PlayerCardComponent {
  readonly player = input.required<Player>();
  readonly compact = input(false);
}
