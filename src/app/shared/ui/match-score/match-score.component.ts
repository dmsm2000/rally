import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'ui-match-score',
  templateUrl: './match-score.component.html',
  styleUrl: './match-score.component.scss',
})
export class MatchScoreComponent {
  readonly value = input.required<number>();
  readonly size = input(56);

  protected readonly radius = computed(() => (this.size() - 6) / 2);
  private readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly dashArray = computed(() => `${(this.value() / 100) * this.circumference()} ${this.circumference()}`);
}
