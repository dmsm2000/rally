import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Court } from '../../../core/models';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-court-card',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './court-card.component.html',
  styleUrl: './court-card.component.scss',
})
export class CourtCardComponent {
  readonly court = input.required<Court>();
  readonly compact = input(false);
}
