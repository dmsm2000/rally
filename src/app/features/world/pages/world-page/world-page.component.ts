import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorldService } from '../../world.service';
import { PlayersService } from '../../../players/players.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ChipComponent, IconComponent, StatComponent, SectionHeaderComponent, AvatarComponent, EmptyStateComponent } from '../../../../shared/ui';
import { PlayerCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-world-page',
  imports: [FormsModule, ChipComponent, IconComponent, StatComponent, SectionHeaderComponent, AvatarComponent, EmptyStateComponent, PlayerCardComponent, TranslatePipe],
  templateUrl: './world-page.component.html',
  styleUrl: './world-page.component.scss',
})
export class WorldPageComponent {
  protected readonly world = inject(WorldService);
  protected readonly players = inject(PlayersService);
  protected readonly auth = inject(AuthService);

}
