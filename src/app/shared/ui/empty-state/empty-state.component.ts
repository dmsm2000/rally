import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly body = input.required<string>();
  readonly action = input<string>();
}
