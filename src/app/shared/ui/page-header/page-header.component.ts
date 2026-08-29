import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-page-header',
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input<string>();
  readonly lead = input<string>();
}
