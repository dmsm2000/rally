import { Component, effect, inject, input, signal } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { IconRegistryService } from './icon-registry.service';

export type IconName = 'home' | 'world' | 'courts' | 'passport' | 'matches' | 'chevron-down' | 'error-circle' | 'eye' | 'calendar';

// Maps each name to its dedicated file under public/assets/icons/.
const ICON_URLS: Record<IconName, string> = {
  home: 'assets/icons/home.svg',
  world: 'assets/icons/world.svg',
  courts: 'assets/icons/courts.svg',
  passport: 'assets/icons/passport.svg',
  matches: 'assets/icons/matches.svg',
  'chevron-down': 'assets/icons/chevron-down.svg',
  'error-circle': 'assets/icons/error-circle.svg',
  eye: 'assets/icons/eye.svg',
  calendar: 'assets/icons/calendar.svg'
};

/** Public icon API — loads the real .svg file for `name()` and inlines it so `stroke="currentColor"` still themes correctly. */
@Component({
  selector: 'ui-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss'
})
export class IconComponent {
  private readonly registry = inject(IconRegistryService);

  readonly name = input.required<IconName>();
  readonly className = input('size-5');

  protected readonly svg = signal<SafeHtml | null>(null);

  constructor() {
    effect(() => {
      const url = ICON_URLS[this.name()];
      this.svg.set(null);
      this.registry.load(url).then(html => this.svg.set(html));
    });
  }
}
