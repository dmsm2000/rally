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
import { TranslationService } from '../../../../core/i18n/translation.service';
import { Format, Level, Surface } from '../../../../core/models';
import { AVATAR_STYLES, AvatarStyleId } from '../../../../core/services/avatar.service';
import { AvatarPickerComponent, MatchCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AvatarComponent, ChipComponent, SectionHeaderComponent, StatComponent } from '../../../../shared/ui';
import { MatchesService } from '../../../matches/matches.service';
import { PassportService } from '../../../passport/passport.service';
import { ProfileService } from '../../profile.service';

@Component({
  selector: 'rally-profile-page',
  imports: [
    FormsModule,
    RouterLink,
    AvatarComponent,
    ChipComponent,
    StatComponent,
    SectionHeaderComponent,
    AvatarPickerComponent,
    MatchCardComponent,
    TranslatePipe
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss'
})
export class ProfilePageComponent {
  protected readonly profile = inject(ProfileService);
  protected readonly auth = inject(AuthService);
  protected readonly matchesService = inject(MatchesService);
  protected readonly passportService = inject(PassportService);
  private readonly translation = inject(TranslationService);
  private readonly router = inject(Router);

  private readonly myMatches = computed(() => {
    const meId = this.profile.me().id;
    return this.matchesService.all().filter(m => m.playerA === meId || m.playerB === meId);
  });
  protected readonly recentMatches = computed(() => this.myMatches().slice(0, 6));
  private readonly myCompletedMatches = computed(() => this.myMatches().filter(m => m.status === 'complete'));
  private readonly myWins = computed(() => this.myCompletedMatches().filter(m => m.winner === this.profile.me().id));
  protected readonly winRatePct = computed(() =>
    this.myCompletedMatches().length ? Math.round((this.myWins().length / this.myCompletedMatches().length) * 100) : 0
  );
  protected readonly winCount = computed(() => this.myWins().length);
  protected readonly completedCount = computed(() => this.myCompletedMatches().length);

  // Surface the player has won on most often, to back up the win-rate stat with something concrete.
  protected readonly bestSurface = computed(() => {
    const bySurface = new Map<string, number>();
    for (const m of this.myWins()) {
      const surface = this.matchesService.courtById(m.courtId)?.surface;
      if (surface) {
        bySurface.set(surface, (bySurface.get(surface) ?? 0) + 1);
      }
    }
    let best: string | undefined;
    let max = 0;
    for (const [surface, count] of bySurface) {
      if (count > max) {
        max = count;
        best = surface;
      }
    }
    return best;
  });

  protected readonly bestSurfaceLabel = computed(() => {
    const surface = this.bestSurface();
    return surface ? this.translation.t('enums.surface.' + surface) : '—';
  });

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

  protected readonly draftAge = signal<number | null>(this.profile.me().age ?? null);
  protected readonly draftGender = signal<Gender | null>((this.profile.me().gender as Gender) ?? null);
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
  protected readonly draftAvatarStyle = signal<AvatarStyleId>(
    (this.profile.me().avatarStyle as AvatarStyleId) ?? AVATAR_STYLES[0]
  );

  protected readonly availableDraftCities = computed(
    () => this.countries.find(c => c.name === this.draftCountry())?.cities ?? []
  );
  protected readonly draftFlag = computed(
    () => this.countries.find(c => c.name === this.draftCountry())?.flag ?? this.profile.me().flag
  );

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
    this.draftAvailability.set(current.includes(option) ? current.filter(a => a !== option) : [...current, option]);
  }

  protected toggleDraftTimeOfDay(option: TimeOfDay): void {
    const current = this.draftTimesOfDay();
    this.draftTimesOfDay.set(current.includes(option) ? current.filter(t => t !== option) : [...current, option]);
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
      gender: this.draftGender() ?? undefined,
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
      avatarStyle: this.draftAvatarStyle()
    });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
