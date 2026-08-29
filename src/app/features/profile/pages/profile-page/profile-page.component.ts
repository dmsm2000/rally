import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../profile.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AvatarComponent, ChipComponent, StatComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { AvatarPickerComponent } from '../../../../shared/components';
import { AVATAR_STYLES, AvatarStyleId } from '../../../../core/services/avatar.service';
import { Format, Level, Surface } from '../../../../core/models';
import {
  Backhand,
  CourtPref,
  Hand,
  PlayStyle,
  TimeOfDay,
  LEVELS,
  FORMATS,
  SURFACES,
  FREQUENCIES,
  AVAILABILITY_OPTIONS,
  MAX_DISTANCE_OPTIONS,
  MAX_YEARS,
  COUNTRIES,
  HANDS,
  BACKHANDS,
  PLAY_STYLES,
  COURT_PREFS,
  TIMES_OF_DAY,
} from '../../../../core/data/player-profile-options';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-profile-page',
  imports: [FormsModule, AvatarComponent, ChipComponent, StatComponent, SectionHeaderComponent, AvatarPickerComponent, TranslatePipe],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
  protected readonly profile = inject(ProfileService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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

  protected readonly draftAge = signal<number | null>(this.profile.me().age ?? null);
  protected readonly draftDominantHand = signal<Hand | null>((this.profile.me().dominantHand as Hand) ?? null);
  protected readonly draftBackhand = signal<Backhand | null>((this.profile.me().backhand as Backhand) ?? null);
  protected readonly draftCity = signal(this.profile.me().city);
  protected readonly draftCountry = signal(this.profile.me().country);
  protected readonly draftMaxDistanceKm = signal<number | null>(this.profile.me().maxDistanceKm ?? null);
  protected readonly draftLevel = signal<Level | null>(this.profile.me().level);
  protected readonly draftYears = signal<number | null>(this.profile.me().years);
  protected readonly draftPlayStyle = signal<PlayStyle | null>((this.profile.me().playStyle as PlayStyle) ?? null);
  protected readonly draftFormat = signal<Format | null>(this.profile.me().format);
  protected readonly draftSurface = signal<Surface | null>(this.profile.me().surface);
  protected readonly draftCourtPref = signal<CourtPref | null>((this.profile.me().courtPref as CourtPref) ?? null);
  protected readonly draftFrequency = signal<string | null>(this.profile.me().frequency);
  protected readonly draftCoached = signal<boolean | null>(this.profile.me().coached ?? null);
  protected readonly draftCoachedFrequency = signal<string | null>(this.profile.me().coachedFrequency ?? null);
  protected readonly draftTimesOfDay = signal<TimeOfDay[]>((this.profile.me().timesOfDay as TimeOfDay[]) ?? []);
  protected readonly draftAvailability = signal<string[]>(this.profile.me().availability);
  protected readonly draftBio = signal(this.profile.me().bio);
  protected readonly draftAvatarSeed = signal(this.profile.me().avatarSeed ?? this.profile.me().id);
  protected readonly draftAvatarStyle = signal<AvatarStyleId>((this.profile.me().avatarStyle as AvatarStyleId) ?? AVATAR_STYLES[0]);

  protected readonly availableDraftCities = computed(() => this.countries.find((c) => c.name === this.draftCountry())?.cities ?? []);
  protected readonly draftFlag = computed(() => this.countries.find((c) => c.name === this.draftCountry())?.flag ?? this.profile.me().flag);

  protected readonly canSave = computed(() => this.draftAge() !== null);

  protected setDraftCountry(name: string): void {
    this.draftCountry.set(name);
    this.draftCity.set('');
  }

  protected incrementDraftYears(): void {
    this.draftYears.set(Math.min(MAX_YEARS, (this.draftYears() ?? -1) + 1));
  }

  protected decrementDraftYears(): void {
    this.draftYears.set(Math.max(0, (this.draftYears() ?? 1) - 1));
  }

  protected toggleDraftAvailability(option: string): void {
    const current = this.draftAvailability();
    this.draftAvailability.set(current.includes(option) ? current.filter((a) => a !== option) : [...current, option]);
  }

  protected toggleDraftTimeOfDay(option: TimeOfDay): void {
    const current = this.draftTimesOfDay();
    this.draftTimesOfDay.set(current.includes(option) ? current.filter((t) => t !== option) : [...current, option]);
  }

  protected setDraftCoached(value: boolean): void {
    this.draftCoached.set(value);
    if (!value) {
      this.draftCoachedFrequency.set(null);
    }
  }

  protected readonly saved = signal(false);

  protected save(): void {
    this.profile.updateMe({
      age: this.draftAge() ?? undefined,
      dominantHand: this.draftDominantHand() ?? undefined,
      backhand: this.draftBackhand() ?? undefined,
      city: this.draftCity(),
      country: this.draftCountry(),
      maxDistanceKm: this.draftMaxDistanceKm() ?? undefined,
      level: this.draftLevel() ?? undefined,
      years: this.draftYears() ?? undefined,
      playStyle: this.draftPlayStyle() ?? undefined,
      format: this.draftFormat() ?? undefined,
      surface: this.draftSurface() ?? undefined,
      courtPref: this.draftCourtPref() ?? undefined,
      frequency: this.draftFrequency() ?? undefined,
      coached: this.draftCoached() ?? undefined,
      coachedFrequency: this.draftCoachedFrequency() ?? undefined,
      timesOfDay: this.draftTimesOfDay(),
      availability: this.draftAvailability(),
      bio: this.draftBio(),
      avatarSeed: this.draftAvatarSeed(),
      avatarStyle: this.draftAvatarStyle(),
    });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
