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
  | 'arrow-left'
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
  | 'map-pin'
  | 'crosshair'
  | 'shield-check'
  | 'camera'
  | 'flag'
  | 'plus'
  | 'check'
  | 'lightbulb'
  | 'close'
  | 'menu'
  | 'google';

// Maps each name to its dedicated file under public/assets/icons/.
const ICON_URLS: Record<IconName, string> = {
  home: 'assets/icons/home.svg',
  world: 'assets/icons/world.svg',
  courts: 'assets/icons/courts.svg',
  passport: 'assets/icons/passport.svg',
  matches: 'assets/icons/matches.svg',
  'chevron-down': 'assets/icons/chevron-down.svg',
  'arrow-left': 'assets/icons/arrow-left.svg',
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
  'map-pin': 'assets/icons/map-pin.svg',
  crosshair: 'assets/icons/crosshair.svg',
  'shield-check': 'assets/icons/shield-check.svg',
  camera: 'assets/icons/camera.svg',
  flag: 'assets/icons/flag.svg',
  plus: 'assets/icons/plus.svg',
  check: 'assets/icons/check.svg',
  lightbulb: 'assets/icons/lightbulb.svg',
  close: 'assets/icons/close.svg',
  menu: 'assets/icons/menu.svg',
  google: 'assets/icons/google.svg'
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
