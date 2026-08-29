import { Component, input } from '@angular/core';

@Component({
  selector: 'rally-country-badge',
  templateUrl: './country-badge.component.html',
  styleUrl: './country-badge.component.scss',
})
export class CountryBadgeComponent {
  readonly flag = input.required<string>();
  readonly name = input.required<string>();
  readonly muted = input(false);
}
