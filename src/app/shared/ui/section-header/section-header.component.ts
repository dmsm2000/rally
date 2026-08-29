import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ui-section-header',
  imports: [RouterLink],
  templateUrl: './section-header.component.html',
  styleUrl: './section-header.component.scss',
})
export class SectionHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input<string>();
  readonly action = input<string>();
  readonly to = input<string>();
}
