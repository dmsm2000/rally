import { Component, effect, inject, input, signal } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { IconRegistryService } from './icon-registry.service';

export type IconName =
  | 'home'
  | 'world'
  | 'courts'
  | 'passport'
  | 'matches'
  | 'chevron-down'
  | 'error-circle'
  | 'eye'
  | 'calendar'
  | 'clock'
  | 'help-circle'
  | 'sliders-horizontal'
  | 'arrow-down-up'
  | 'search'
  | 'gender-male'
  | 'gender-female'
  | 'gender-nonbinary'
  | 'trash'
  | 'tennis-ball'
  | 'close'
  | 'plus';

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
  calendar: 'assets/icons/calendar.svg',
  clock: 'assets/icons/clock.svg',
  'help-circle': 'assets/icons/help-circle.svg',
  'sliders-horizontal': 'assets/icons/sliders-horizontal.svg',
  'arrow-down-up': 'assets/icons/arrow-down-up.svg',
  search: 'assets/icons/search.svg',
  'gender-male': 'assets/icons/gender-male.svg',
  'gender-female': 'assets/icons/gender-female.svg',
  'gender-nonbinary': 'assets/icons/gender-nonbinary.svg',
  trash: 'assets/icons/trash.svg',
  'tennis-ball': 'assets/icons/tennis-ball.svg',
  close: 'assets/icons/close.svg',
  plus: 'assets/icons/plus.svg'
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
