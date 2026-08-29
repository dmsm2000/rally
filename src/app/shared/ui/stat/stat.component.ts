import { Component, computed, input } from '@angular/core';

const SIZE_CLASSES: Record<string, string> = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-5xl sm:text-6xl',
};

@Component({
  selector: 'ui-stat',
  templateUrl: './stat.component.html',
  styleUrl: './stat.component.scss',
})
export class StatComponent {
  readonly value = input.required<string | number>();
  readonly label = input.required<string>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly sizeClass = computed(() => SIZE_CLASSES[this.size()]);
}
