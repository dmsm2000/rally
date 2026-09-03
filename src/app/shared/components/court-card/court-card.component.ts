import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Court } from '../../../core/models';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../../ui';

// Tints the photo-less fallback by what you'd actually be standing on.
const SURFACE_TONE: Record<string, string> = {
  Clay: 'bg-clay/25',
  Hard: 'bg-cobalt/20',
  Grass: 'bg-lime/25',
  Carpet: 'bg-muted'
};

@Component({
  selector: 'rally-court-card',
  imports: [RouterLink, IconComponent, TranslatePipe],
  templateUrl: './court-card.component.html',
  styleUrl: './court-card.component.scss'
})
export class CourtCardComponent {
  readonly court = input.required<Court>();
  readonly compact = input(false);

  /** Green field means most courts start with no photo at all — the fallback has to look deliberate. */
  protected readonly photo = computed(() => this.court().photos?.[0]?.url);
  protected readonly tone = computed(() => SURFACE_TONE[this.court().surface] ?? 'bg-muted');
  protected readonly title = computed(() => this.court().venue.name);
  protected readonly subtitle = computed(() => {
    const court = this.court();
    return court.number ? `${court.venue.city} · ${court.number}` : court.venue.city;
  });
}
