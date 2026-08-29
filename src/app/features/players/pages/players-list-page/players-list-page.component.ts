import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlayersService } from '../../players.service';
import { PageHeaderComponent, ChipComponent, EmptyStateComponent } from '../../../../shared/ui';
import { PlayerCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-players-list-page',
  imports: [FormsModule, PageHeaderComponent, ChipComponent, EmptyStateComponent, PlayerCardComponent, TranslatePipe],
  templateUrl: './players-list-page.component.html',
  styleUrl: './players-list-page.component.scss',
})
export class PlayersListPageComponent {
  protected readonly players = inject(PlayersService);
}
