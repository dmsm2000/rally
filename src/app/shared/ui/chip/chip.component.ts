import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

const TONE_CLASSES: Record<string, string> = {
  default: 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground',
  lime: 'border-lime-deep/40 bg-lime/20 text-foreground',
  clay: 'border-clay/40 bg-clay/12 text-foreground',
  cobalt: 'border-cobalt/40 bg-cobalt/12 text-foreground'
};

@Component({
  selector: 'ui-chip',
  imports: [NgTemplateOutlet],
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss'
})
export class ChipComponent {
  readonly active = input(false);
  readonly tone = input<'default' | 'lime' | 'clay' | 'cobalt'>('default');
  readonly clickable = input(false);
  /** Read-only metadata has no hover state or colour accent. */
  readonly subtle = input(false);
  /** For a clickable chip that isn't selectable yet (e.g. an unbuilt option) — greyed out, inert. */
  readonly disabled = input(false);
  readonly toggled = output<void>();

  protected readonly classes = computed(() =>
    this.active()
      ? 'border-foreground bg-foreground text-background'
      : this.subtle()
        ? 'border-border bg-background text-muted-foreground'
        : (TONE_CLASSES[this.tone()] ?? TONE_CLASSES['default'])
  );
}
