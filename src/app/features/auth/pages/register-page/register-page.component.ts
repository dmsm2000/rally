import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  AVAILABILITY_OPTIONS,
  Backhand,
  BACKHANDS,
  COUNTRIES,
  COURT_PREFS,
  CourtPref,
  FORMATS,
  FREQUENCIES,
  Gender,
  GENDERS,
  Hand,
  HANDS,
  LEVELS,
  MAX_DISTANCE_OPTIONS,
  MAX_YEARS,
  PLAY_STYLES,
  PlayStyle,
  SURFACES,
  TimeOfDay,
  TIMES_OF_DAY
} from '../../../../core/data/player-profile-options';
import { Format, Level, Surface } from '../../../../core/models';
import { AVATAR_STYLES, AvatarStyleId } from '../../../../core/services/avatar.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { AvatarPickerComponent, LanguageSwitcherComponent, ThemeToggleComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ChipComponent } from '../../../../shared/ui';

interface RegisterStep {
  label: string;
  tagline: string;
}

@Component({
  selector: 'rally-register-page',
  imports: [
    FormsModule,
    RouterLink,
    ChipComponent,
    LanguageSwitcherComponent,
    ThemeToggleComponent,
    AvatarPickerComponent,
    TranslatePipe
  ],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss'
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
  protected readonly genders = GENDERS;
  protected readonly playStyles = PLAY_STYLES;
  protected readonly courtPrefs = COURT_PREFS;
  protected readonly timesOfDayOptions = TIMES_OF_DAY;

  protected readonly steps: RegisterStep[] = [
    { label: 'auth.steps.account', tagline: 'auth.taglines.account' },
    { label: 'auth.steps.traits', tagline: 'auth.taglines.traits' },
    { label: 'auth.steps.location', tagline: 'auth.taglines.location' },
    { label: 'auth.steps.game', tagline: 'auth.taglines.game' },
    { label: 'auth.steps.schedule', tagline: 'auth.taglines.schedule' },
    { label: 'auth.steps.finish', tagline: 'auth.taglines.finish' }
  ];

  protected readonly step = signal(0);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmationPending = signal(false);

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly age = signal<number | null>(null);
  protected readonly gender = signal<Gender | null>(null);
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
  protected readonly avatarSeed = signal('rally-player');
  protected readonly avatarStyle = signal<AvatarStyleId>(AVATAR_STYLES[0]);

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  protected readonly passwordsMismatch = computed(
    () => this.confirmPassword().length > 0 && this.password() !== this.confirmPassword()
  );

  protected readonly availableCities = computed(
    () => this.countries.find(c => c.name === this.country())?.cities ?? []
  );

  protected readonly canContinue = computed(() => {
    switch (this.step()) {
      case 0:
        return (
          this.name().trim().length > 1 &&
          this.emailPattern.test(this.email()) &&
          this.password().length >= 6 &&
          this.password() === this.confirmPassword()
        );
      case 1:
        return this.age() !== null;
      case 2:
        return this.country().length > 0 && this.city().length > 0 && this.maxDistanceKm() !== null;
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
    this.availability.set(current.includes(option) ? current.filter(a => a !== option) : [...current, option]);
  }

  protected toggleTimeOfDay(option: TimeOfDay): void {
    const current = this.timesOfDay();
    this.timesOfDay.set(current.includes(option) ? current.filter(t => t !== option) : [...current, option]);
  }

  protected setCoached(value: boolean): void {
    this.coached.set(value);
    if (!value) {
      this.coachedFrequency.set(null);
    }
  }

  protected next(): void {
    if (this.canContinue() && this.step() < this.steps.length - 1) {
      const nextStep = this.step() + 1;
      if (nextStep === this.steps.length - 1) {
        this.avatarSeed.update(seed => (seed === 'rally-player' ? this.name().trim() || seed : seed));
      }
      this.step.set(nextStep);
    }
  }

  protected back(): void {
    this.step.update(s => Math.max(0, s - 1));
  }

  protected async onSubmit(): Promise<void> {
    if (!this.canContinue() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const result = await this.auth.register(this.email(), this.password(), {
      name: this.name(),
      age: this.age() ?? undefined,
      gender: this.gender() ?? undefined,
      dominantHand: this.dominantHand() ?? undefined,
      backhand: this.backhand() ?? undefined,
      city: this.city(),
      country: this.country(),
      maxDistanceKm: this.maxDistanceKm() ?? undefined,
      level: this.level() ?? undefined,
      years: this.years() ?? undefined,
      playStyle: this.playStyle() ?? undefined,
      format: this.format() ?? undefined,
      surface: this.surface() ?? undefined,
      courtPref: this.courtPref() ?? undefined,
      frequency: this.frequency() ?? undefined,
      coached: this.coached() ?? undefined,
      coachedFrequency: this.coachedFrequency() ?? undefined,
      timesOfDay: this.timesOfDay(),
      availability: this.availability(),
      bio: this.bio(),
      avatarSeed: this.avatarSeed(),
      avatarStyle: this.avatarStyle()
    });
    this.submitting.set(false);
    if (!result.success) {
      this.error.set(result.error ?? 'auth.errorGeneric');
      return;
    }
    if (result.needsEmailConfirmation) {
      this.confirmationPending.set(true);
      return;
    }
    this.router.navigateByUrl('/');
  }
}
