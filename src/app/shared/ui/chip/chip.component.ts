import { Component, computed, input, output } from '@angular/core';

const TONE_CLASSES: Record<string, string> = {
  default: 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground',
  lime: 'border-lime-deep/40 bg-lime/20 text-foreground',
  clay: 'border-clay/40 bg-clay/12 text-foreground',
  cobalt: 'border-cobalt/40 bg-cobalt/12 text-foreground',
};

@Component({
  selector: 'ui-chip',
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
})
export class ChipComponent {
  readonly active = input(false);
  readonly tone = input<'default' | 'lime' | 'clay' | 'cobalt'>('default');
  readonly clickable = input(false);
  readonly toggled = output<void>();

  protected readonly classes = computed(() =>
    this.active() ? 'border-foreground bg-foreground text-background' : (TONE_CLASSES[this.tone()] ?? TONE_CLASSES['default']),
  );
}
