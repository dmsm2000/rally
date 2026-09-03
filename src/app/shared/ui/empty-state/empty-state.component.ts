import { Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly body = input.required<string>();
  readonly action = input<string>();
  /** Optional — existing callers render `action` as a decorative label and ignore this. */
  readonly actionClick = output<void>();
}
