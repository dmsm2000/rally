import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { Format, Level, Surface } from '../../../../core/models';
import { ChipComponent } from '../../../../shared/ui';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

type Hand = 'Right' | 'Left' | 'Ambidextrous';
type Backhand = 'OneHanded' | 'TwoHanded';
type PlayStyle = 'AggressiveBaseliner' | 'Counterpuncher' | 'ServeAndVolleyer' | 'AllCourt';
type CourtPref = 'Indoor' | 'Outdoor' | 'NoPreference';
type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening';

interface ChipOption<T extends string> {
  value: T;
  emoji: string;
  key: string;
}

interface TextOption {
  value: string;
  key: string;
}

interface CountryOption {
  name: string;
  flag: string;
  cities: string[];
}

const LEVELS: Level[] = ['Beginner', 'Improver', 'Intermediate', 'Advanced', 'Competitive'];
const FORMATS: Format[] = ['Singles', 'Doubles', 'Both'];
const SURFACES: Surface[] = ['Clay', 'Hard', 'Grass', 'Carpet'];
const FREQUENCIES: TextOption[] = [
  { value: 'Daily', key: 'auth.freqDaily' },
  { value: '3–4 times a week', key: 'auth.freq3to4' },
  { value: 'Twice a week', key: 'auth.freqTwice' },
  { value: 'Once a week', key: 'auth.freqOnce' },
  { value: 'A few times a month', key: 'auth.freqFewMonth' },
];
const AVAILABILITY_OPTIONS: TextOption[] = [
  { value: 'Early mornings', key: 'auth.availEarlyMorning' },
  { value: 'Weekday mornings', key: 'auth.availWeekdayMorning' },
  { value: 'Weekday evenings', key: 'auth.availWeekdayEvening' },
  { value: 'Late evenings', key: 'auth.availLateEvening' },
  { value: 'Saturdays', key: 'auth.availSaturdays' },
  { value: 'Sunday mornings', key: 'auth.availSundayMorning' },
  { value: 'Weekends', key: 'auth.availWeekends' },
];
const MAX_DISTANCE_OPTIONS = [5, 10, 20, 50, 100];
const MAX_YEARS = 40;

// Mirrors the countries/cities that already exist across the app's dataset.
const COUNTRIES: CountryOption[] = [
  { name: 'Portugal', flag: '🇵🇹', cities: ['Porto', 'Lisbon', 'Matosinhos'] },
  { name: 'Spain', flag: '🇪🇸', cities: ['Barcelona', 'Madrid'] },
  { name: 'France', flag: '🇫🇷', cities: ['Paris'] },
  { name: 'Italy', flag: '🇮🇹', cities: ['Milan'] },
  { name: 'UK', flag: '🇬🇧', cities: ['London', 'Surrey'] },
  { name: 'Netherlands', flag: '🇳🇱', cities: ['Amsterdam'] },
  { name: 'Morocco', flag: '🇲🇦', cities: ['Casablanca'] },
  { name: 'Japan', flag: '🇯🇵', cities: ['Tokyo'] },
  { name: 'USA', flag: '🇺🇸', cities: ['New York'] },
  { name: 'Australia', flag: '🇦🇺', cities: ['Sydney'] },
  { name: 'Brazil', flag: '🇧🇷', cities: ['São Paulo'] },
  { name: 'Mexico', flag: '🇲🇽', cities: ['Mexico City'] },
];

const HANDS: ChipOption<Hand>[] = [
  { value: 'Right', emoji: '🫱', key: 'auth.handRight' },
  { value: 'Left', emoji: '🫲', key: 'auth.handLeft' },
  { value: 'Ambidextrous', emoji: '🤷', key: 'auth.handAmbi' },
];
const BACKHANDS: ChipOption<Backhand>[] = [
  { value: 'OneHanded', emoji: '☝️', key: 'auth.backhandOne' },
  { value: 'TwoHanded', emoji: '✌️', key: 'auth.backhandTwo' },
];
const PLAY_STYLES: ChipOption<PlayStyle>[] = [
  { value: 'AggressiveBaseliner', emoji: '🔥', key: 'auth.styleAggressiveBaseliner' },
  { value: 'Counterpuncher', emoji: '🛡️', key: 'auth.styleCounterpuncher' },
  { value: 'ServeAndVolleyer', emoji: '⚡', key: 'auth.styleServeVolley' },
  { value: 'AllCourt', emoji: '🧭', key: 'auth.styleAllCourt' },
];
const COURT_PREFS: ChipOption<CourtPref>[] = [
  { value: 'Indoor', emoji: '🏟️', key: 'enums.indoor' },
  { value: 'Outdoor', emoji: '☀️', key: 'enums.outdoor' },
  { value: 'NoPreference', emoji: '🤙', key: 'auth.noPreference' },
];
const TIMES_OF_DAY: ChipOption<TimeOfDay>[] = [
  { value: 'Morning', emoji: '☀️', key: 'auth.morning' },
  { value: 'Afternoon', emoji: '🌤️', key: 'auth.afternoon' },
  { value: 'Evening', emoji: '🌙', key: 'auth.evening' },
];

interface RegisterStep {
  label: string;
  tagline: string;
}

@Component({
  selector: 'rally-register-page',
  imports: [FormsModule, RouterLink, ChipComponent, LanguageSwitcherComponent, ThemeToggleComponent, TranslatePipe],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly levels = LEVELS;
  protected readonly formats = FORMATS;
  protected readonly surfaces = SURFACES;
  protected readonly frequencies = FREQUENCIES;
  protected readonly availabilityOptions = AVAILABILITY_OPTIONS;
  protected readonly maxDistanceOptions = MAX_DISTANCE_OPTIONS;
  protected readonly countries = COUNTRIES;
  protected readonly hands = HANDS;
  protected readonly backhands = BACKHANDS;
  protected readonly playStyles = PLAY_STYLES;
  protected readonly courtPrefs = COURT_PREFS;
  protected readonly timesOfDayOptions = TIMES_OF_DAY;

  protected readonly steps: RegisterStep[] = [
    { label: 'auth.steps.account', tagline: 'auth.taglines.account' },
    { label: 'auth.steps.traits', tagline: 'auth.taglines.traits' },
    { label: 'auth.steps.location', tagline: 'auth.taglines.location' },
    { label: 'auth.steps.game', tagline: 'auth.taglines.game' },
    { label: 'auth.steps.schedule', tagline: 'auth.taglines.schedule' },
    { label: 'auth.steps.finish', tagline: 'auth.taglines.finish' },
  ];

  protected readonly step = signal(0);

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly age = signal<number | null>(null);
  protected readonly dominantHand = signal<Hand | null>(null);
  protected readonly backhand = signal<Backhand | null>(null);
  protected readonly city = signal('');
  protected readonly country = signal('');
  protected readonly maxDistanceKm = signal<number | null>(null);
  protected readonly level = signal<Level | null>(null);
  protected readonly years = signal<number | null>(null);
  protected readonly playStyle = signal<PlayStyle | null>(null);
  protected readonly format = signal<Format | null>('Both');
  protected readonly surface = signal<Surface | null>(null);
  protected readonly courtPref = signal<CourtPref | null>('NoPreference');
  protected readonly frequency = signal<string | null>(null);
  protected readonly coached = signal<boolean | null>(null);
  protected readonly coachedFrequency = signal<string | null>(null);
  protected readonly timesOfDay = signal<TimeOfDay[]>([]);
  protected readonly availability = signal<string[]>([]);
  protected readonly bio = signal('');

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  protected readonly passwordsMismatch = computed(() => this.confirmPassword().length > 0 && this.password() !== this.confirmPassword());

  protected readonly availableCities = computed(() => this.countries.find((c) => c.name === this.country())?.cities ?? []);

  protected readonly canContinue = computed(() => {
    switch (this.step()) {
      case 0:
        return this.name().trim().length > 1 && this.emailPattern.test(this.email()) && this.password().length >= 6 && this.password() === this.confirmPassword();
      case 2:
        return this.country().length > 0 && this.city().length > 0;
      case 3:
        return !!this.level() && this.years() !== null;
      case 4:
        return !!this.frequency() && this.availability().length > 0;
      default:
        return true;
    }
  });

  protected setCountry(name: string): void {
    this.country.set(name);
    this.city.set('');
  }

  protected incrementYears(): void {
    this.years.set(Math.min(MAX_YEARS, (this.years() ?? -1) + 1));
  }

  protected decrementYears(): void {
    this.years.set(Math.max(0, (this.years() ?? 1) - 1));
  }

  protected toggleAvailability(option: string): void {
    const current = this.availability();
    this.availability.set(current.includes(option) ? current.filter((a) => a !== option) : [...current, option]);
  }

  protected toggleTimeOfDay(option: TimeOfDay): void {
    const current = this.timesOfDay();
    this.timesOfDay.set(current.includes(option) ? current.filter((t) => t !== option) : [...current, option]);
  }

  protected setCoached(value: boolean): void {
    this.coached.set(value);
    if (!value) {
      this.coachedFrequency.set(null);
    }
  }

  protected next(): void {
    if (this.canContinue() && this.step() < this.steps.length - 1) {
      this.step.update((s) => s + 1);
    }
  }

  protected back(): void {
    this.step.update((s) => Math.max(0, s - 1));
  }

  protected onSubmit(): void {
    if (!this.canContinue()) {
      return;
    }
    this.auth.register();
    this.router.navigateByUrl('/');
  }
}
