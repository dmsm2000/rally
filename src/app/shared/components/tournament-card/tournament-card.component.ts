import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tournament } from '../../../core/models';
import { ChipComponent } from '../../ui';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-tournament-card',
  imports: [RouterLink, ChipComponent, TranslatePipe],
  templateUrl: './tournament-card.component.html',
  styleUrl: './tournament-card.component.scss',
})
export class TournamentCardComponent {
  readonly tournament = input.required<Tournament>();
  readonly compact = input(false);

  protected readonly pct = computed(() => Math.round((this.tournament().participants / this.tournament().capacity) * 100));
}
