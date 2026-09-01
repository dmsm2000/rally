import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { CountryDataService } from '../../../../core/data/country-data.service';
import {
  AVAILABILITY_OPTIONS,
  AvailabilityOption,
  Backhand,
  BACKHANDS,
  COURT_PREFS,
  CourtPref,
  FORMATS,
  FREQUENCIES,
  Frequency,
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
import { CanComponentDeactivate } from '../../../../core/guards/unsaved-changes.guard';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { Format, Level, Player, Surface, TripIntent } from '../../../../core/models';
import { AVATAR_STYLES, AvatarStyleId } from '../../../../core/services/avatar.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AvatarPickerComponent, MatchCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import {
  AutocompleteComponent,
  AvatarComponent,
  ChipComponent,
  DatePickerComponent,
  IconComponent,
  PasswordToggleComponent,
  SectionHeaderComponent,
  StatComponent
} from '../../../../shared/ui';
import { MatchesService } from '../../../matches/matches.service';
import { PassportService } from '../../../passport/passport.service';
import { TripsRepository } from '../../../world/data/trips.repository';
import { ProfileService } from '../../profile.service';

type ProfileSection = 'avatar' | 'traits' | 'location' | 'game' | 'schedule';

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
    TranslatePipe,
    PasswordToggleComponent,
    AutocompleteComponent,
    DatePickerComponent,
    IconComponent
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss'
})
export class ProfilePageComponent implements CanComponentDeactivate {
  protected readonly profile = inject(ProfileService);
  protected readonly auth = inject(AuthService);
  protected readonly matchesService = inject(MatchesService);
  protected readonly passportService = inject(PassportService);
  private readonly trips = inject(TripsRepository);
  private readonly translation = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly countryData = inject(CountryDataService);

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
  protected readonly countries = this.countryData.countries;
  protected readonly countryNames = computed(() => this.countries().map(c => c.name));
  protected readonly maxBirthDate = new Date().toISOString().slice(0, 10);
  protected readonly countryFlags = computed(() => Object.fromEntries(this.countries().map(c => [c.name, c.flag])));
  protected readonly cityOptions = signal<string[]>([]);
  protected readonly hands = HANDS;
  protected readonly backhands = BACKHANDS;
  protected readonly genders = GENDERS;
  protected readonly playStyles = PLAY_STYLES;
  protected readonly courtPrefs = COURT_PREFS;
  protected readonly timesOfDayOptions = TIMES_OF_DAY;

  protected readonly draftBirthDate = signal(this.profile.me().birthDate ?? '');
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
  protected readonly draftFrequency = signal<Frequency | null>(this.profile.me().frequency as Frequency);
  protected readonly draftCoached = signal<boolean | null>(this.profile.me().coached ?? null);
  protected readonly draftCoachedFrequency = signal<Frequency | null>(
    (this.profile.me().coachedFrequency as Frequency) ?? null
  );
  protected readonly draftTimesOfDay = signal<TimeOfDay[]>((this.profile.me().timesOfDay as TimeOfDay[]) ?? []);
  protected readonly draftAvailability = signal<AvailabilityOption[]>(
    this.profile.me().availability as AvailabilityOption[]
  );
  protected readonly draftBio = signal(this.profile.me().bio);
  protected readonly draftAvatarSeed = signal(this.profile.me().avatarSeed ?? this.profile.me().id);
  protected readonly draftAvatarStyle = signal<AvatarStyleId>(
    (this.profile.me().avatarStyle as AvatarStyleId) ?? AVATAR_STYLES[0]
  );

  protected readonly draftFlag = computed(
    () => this.countries().find(c => c.name === this.draftCountry())?.flag ?? this.profile.me().flag
  );

  constructor() {
    this.countryData.loadCountries();
    // Re-fetches this country's city list (cached per country in the service) whenever it changes.
    effect(() => {
      const match = this.countries().find(c => c.name === this.draftCountry());
      if (!match) {
        this.cityOptions.set([]);
        return;
      }
      this.countryData.citiesFor(match.iso2).then(cities => this.cityOptions.set(cities));
    });
    void this.loadMyTrips();
  }

  protected readonly canSaveTraits = computed(
    () => this.draftBirthDate().length > 0 && !!this.draftGender() && !!this.draftDominantHand()
  );

  protected readonly canSaveLocation = computed(
    () => this.draftCountry().length > 0 && this.draftCity().length > 0 && this.draftMaxDistanceKm() !== null
  );

  protected readonly canSaveGame = computed(() => !!this.draftLevel() && this.draftYears() !== null);

  protected readonly canSaveSchedule = computed(
    () =>
      !!this.draftFrequency() &&
      this.draftCoached() !== null &&
      (this.draftCoached() === false || !!this.draftCoachedFrequency())
  );

  // Feeds the unsaved-changes route guard — compares every draft signal against the persisted profile.
  protected readonly hasUnsavedChanges = computed(() => {
    const me = this.profile.me();
    const sameArray = (a: readonly string[], b: readonly string[] | undefined) =>
      [...a].sort().join('|') === [...(b ?? [])].sort().join('|');
    return (
      this.draftBirthDate() !== (me.birthDate ?? '') ||
      this.draftGender() !== ((me.gender as Gender | undefined) ?? null) ||
      this.draftDominantHand() !== ((me.dominantHand as Hand | undefined) ?? null) ||
      this.draftBackhand() !== ((me.backhand as Backhand | undefined) ?? null) ||
      this.draftCity() !== me.city ||
      this.draftCountry() !== me.country ||
      this.draftMaxDistanceKm() !== (me.maxDistanceKm ?? null) ||
      this.draftLevel() !== me.level ||
      this.draftYears() !== me.years ||
      this.draftPlayStyle() !== ((me.playStyle as PlayStyle | undefined) ?? null) ||
      this.draftFormat() !== me.format ||
      this.draftSurface() !== me.surface ||
      this.draftCourtPref() !== ((me.courtPref as CourtPref | undefined) ?? null) ||
      this.draftFrequency() !== ((me.frequency as Frequency | undefined) ?? null) ||
      this.draftCoached() !== (me.coached ?? null) ||
      this.draftCoachedFrequency() !== ((me.coachedFrequency as Frequency | undefined) ?? null) ||
      !sameArray(this.draftTimesOfDay(), me.timesOfDay) ||
      !sameArray(this.draftAvailability(), me.availability) ||
      this.draftBio() !== me.bio
    );
  });

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

  protected toggleDraftAvailability(option: AvailabilityOption): void {
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

  // Each profile-page section saves independently, so editing one doesn't require scrolling to a
  // single button at the bottom — savingSection/savedSection track which one is currently in flight.
  protected readonly savingSection = signal<ProfileSection | null>(null);
  protected readonly savedSection = signal<ProfileSection | null>(null);

  protected isSaving(section: ProfileSection): boolean {
    return this.savingSection() === section;
  }

  protected isSaved(section: ProfileSection): boolean {
    return this.savedSection() === section;
  }

  protected readonly changingAvatar = signal(false);

  protected openAvatarDialog(): void {
    this.changingAvatar.set(true);
  }

  protected cancelAvatarDialog(): void {
    this.draftAvatarSeed.set(this.profile.me().avatarSeed ?? this.profile.me().id);
    this.draftAvatarStyle.set((this.profile.me().avatarStyle as AvatarStyleId) ?? AVATAR_STYLES[0]);
    this.changingAvatar.set(false);
  }

  protected async confirmAvatarDialog(): Promise<void> {
    const success = await this.saveSection('avatar', {
      avatarSeed: this.draftAvatarSeed(),
      avatarStyle: this.draftAvatarStyle()
    });
    if (success) {
      this.changingAvatar.set(false);
    }
  }

  protected saveTraits(): void {
    if (!this.canSaveTraits()) {
      return;
    }
    void this.saveSection('traits', {
      birthDate: this.draftBirthDate() || undefined,
      gender: this.draftGender() ?? undefined,
      dominantHand: this.draftDominantHand() ?? undefined,
      backhand: this.draftBackhand() ?? undefined,
      bio: this.draftBio()
    });
  }

  protected saveLocation(): void {
    if (!this.canSaveLocation()) {
      return;
    }
    void this.saveSection('location', {
      city: this.draftCity(),
      country: this.draftCountry(),
      maxDistanceKm: this.draftMaxDistanceKm() ?? undefined
    });
  }

  protected saveGame(): void {
    if (!this.canSaveGame()) {
      return;
    }
    void this.saveSection('game', {
      level: this.draftLevel() ?? undefined,
      years: this.draftYears() ?? undefined,
      playStyle: this.draftPlayStyle() ?? undefined,
      format: this.draftFormat() ?? undefined,
      surface: this.draftSurface() ?? undefined,
      courtPref: this.draftCourtPref() ?? undefined
    });
  }

  protected saveSchedule(): void {
    if (!this.canSaveSchedule()) {
      return;
    }
    void this.saveSection('schedule', {
      frequency: this.draftFrequency() ?? undefined,
      coached: this.draftCoached() ?? undefined,
      coachedFrequency: this.draftCoachedFrequency() ?? undefined,
      timesOfDay: this.draftTimesOfDay(),
      availability: this.draftAvailability()
    });
  }

  protected resetTraits(): void {
    const me = this.profile.me();
    this.draftBirthDate.set(me.birthDate ?? '');
    this.draftGender.set((me.gender as Gender) ?? null);
    this.draftDominantHand.set((me.dominantHand as Hand) ?? null);
    this.draftBackhand.set((me.backhand as Backhand) ?? null);
    this.draftBio.set(me.bio);
  }

  protected resetLocation(): void {
    const me = this.profile.me();
    this.draftCity.set(me.city);
    this.draftCountry.set(me.country);
    this.draftMaxDistanceKm.set(me.maxDistanceKm ?? null);
  }

  protected resetGame(): void {
    const me = this.profile.me();
    this.draftLevel.set(me.level);
    this.draftYears.set(me.years);
    this.draftPlayStyle.set((me.playStyle as PlayStyle) ?? null);
    this.draftFormat.set(me.format);
    this.draftSurface.set(me.surface);
    this.draftCourtPref.set((me.courtPref as CourtPref) ?? null);
  }

  protected resetSchedule(): void {
    const me = this.profile.me();
    this.draftFrequency.set((me.frequency as Frequency) ?? null);
    this.draftCoached.set(me.coached ?? null);
    this.draftCoachedFrequency.set((me.coachedFrequency as Frequency) ?? null);
    this.draftTimesOfDay.set((me.timesOfDay as TimeOfDay[]) ?? []);
    this.draftAvailability.set(me.availability as AvailabilityOption[]);
  }

  private async saveSection(section: ProfileSection, partial: Partial<Player>): Promise<boolean> {
    this.savingSection.set(section);
    const result = await this.profile.updateMe(partial);
    this.savingSection.set(null);
    if (!result.success) {
      this.toast.error(this.translation.t(result.error ?? 'auth.errorGeneric'));
      return false;
    }
    this.savedSection.set(section);
    setTimeout(() => {
      if (this.savedSection() === section) {
        this.savedSection.set(null);
      }
    }, 2000);
    return true;
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  protected readonly myTrips = signal<TripIntent[]>([]);
  protected readonly myTripsLoading = signal(true);
  protected readonly deletingTripId = signal<string | null>(null);

  protected formatTripDate(iso: string): string {
    return this.trips.formatDate(iso);
  }

  protected async deleteTrip(trip: TripIntent): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: this.translation.t('profile.deleteTripConfirmLead'),
      confirmLabel: this.translation.t('profile.deleteTripConfirmButton'),
      cancelLabel: this.translation.t('profile.cancel'),
      tone: 'destructive'
    });
    if (!confirmed) {
      return;
    }
    this.deletingTripId.set(trip.id);
    const success = await this.trips.deleteTrip(trip.id);
    this.deletingTripId.set(null);
    if (success) {
      this.myTrips.update(list => list.filter(t => t.id !== trip.id));
    }
  }

  private async loadMyTrips(): Promise<void> {
    this.myTripsLoading.set(true);
    this.myTrips.set(await this.trips.myTrips());
    this.myTripsLoading.set(false);
  }

  protected readonly deletingAccount = signal(false);

  protected async deleteAccount(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: this.translation.t('profile.deleteAccountConfirmLead'),
      confirmLabel: this.translation.t('profile.deleteAccountConfirmButton'),
      cancelLabel: this.translation.t('profile.cancel'),
      tone: 'destructive'
    });
    if (!confirmed) {
      return;
    }
    this.deletingAccount.set(true);
    const result = await this.auth.deleteAccount();
    this.deletingAccount.set(false);
    if (!result.success) {
      this.toast.error(this.translation.t(result.error ?? 'auth.errorGeneric'));
      return;
    }
    this.router.navigateByUrl('/login');
  }

  protected readonly changingPassword = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmNewPassword = signal('');
  protected readonly passwordFieldError = signal(false);
  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmNewPassword = signal(false);

  protected readonly newPasswordMismatch = computed(
    () => this.confirmNewPassword().length > 0 && this.newPassword() !== this.confirmNewPassword()
  );

  protected readonly newPasswordTooShort = computed(
    () => this.newPassword().length > 0 && this.newPassword().length < 6
  );

  protected readonly canSavePassword = computed(
    () =>
      !this.savingPassword() &&
      this.currentPassword().length > 0 &&
      this.newPassword().length >= 6 &&
      this.newPassword() === this.confirmNewPassword()
  );

  protected openChangePassword(): void {
    this.changingPassword.set(true);
  }

  protected closeChangePassword(): void {
    this.changingPassword.set(false);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmNewPassword.set('');
    this.passwordFieldError.set(false);
    this.showCurrentPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmNewPassword.set(false);
  }

  protected setCurrentPassword(value: string): void {
    this.currentPassword.set(value);
    this.passwordFieldError.set(false);
  }

  protected async submitChangePassword(): Promise<void> {
    if (!this.canSavePassword()) {
      return;
    }
    this.savingPassword.set(true);
    const result = await this.auth.changePassword(this.currentPassword(), this.newPassword());
    this.savingPassword.set(false);
    if (!result.success) {
      this.passwordFieldError.set(true);
      this.toast.error(this.translation.t(result.error ?? 'auth.errorGeneric'));
      return;
    }
    this.toast.success(this.translation.t('profile.passwordUpdated'));
    this.closeChangePassword();
  }

  /** Route guard hook — asks before leaving with unsaved edits in any of the editable sections. */
  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges()) {
      return true;
    }
    return this.confirmDialog.confirm({
      message: this.translation.t('profile.unsavedChangesLead'),
      confirmLabel: this.translation.t('profile.discardChanges'),
      cancelLabel: this.translation.t('profile.keepEditing'),
      tone: 'destructive'
    });
  }
}
