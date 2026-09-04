import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { CountryDataService } from '../../../../core/data/country-data.service';
import {
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
  surfaceLabelKey,
  TimeOfDay,
  TIMES_OF_DAY
} from '../../../../core/data/player-profile-options';
import { CanComponentDeactivate } from '../../../../core/guards/unsaved-changes.guard';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { Format, Level, Player, Surface } from '../../../../core/models';
import { AVATAR_STYLES, AvatarStyleId } from '../../../../core/services/avatar.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { GeolocationService } from '../../../../core/services/geolocation.service';
import { ReverseGeocodeService } from '../../../../core/services/reverse-geocode.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AvatarPickerComponent, MatchCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AutocompleteComponent, AvatarComponent, ChipComponent, DatePickerComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { CourtsService } from '../../../courts/courts.service';
import { MatchesService } from '../../../matches/matches.service';
import { ChangePasswordDialogComponent } from '../../change-password-dialog/change-password-dialog.component';
import { MyTripsSectionComponent } from '../../my-trips-section/my-trips-section.component';
import { ProfileService } from '../../profile.service';

type ProfileSection = 'avatar' | 'traits' | 'location' | 'game' | 'schedule';

@Component({
  selector: 'rally-profile-page',
  imports: [
    FormsModule,
    RouterLink,
    AvatarComponent,
    ChipComponent,
    SectionHeaderComponent,
    AvatarPickerComponent,
    MatchCardComponent,
    TranslatePipe,
    ChangePasswordDialogComponent,
    MyTripsSectionComponent,
    AutocompleteComponent,
    DatePickerComponent
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss'
})
export class ProfilePageComponent implements CanComponentDeactivate {
  protected readonly profile = inject(ProfileService);
  protected readonly auth = inject(AuthService);
  protected readonly matchesService = inject(MatchesService);
  protected readonly courts = inject(CourtsService);
  private readonly translation = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);
  private readonly countryData = inject(CountryDataService);
  private readonly geolocation = inject(GeolocationService);
  private readonly reverseGeocode = inject(ReverseGeocodeService);

  // MatchesService's upcoming()/completed() are already scoped to the signed-in player.
  private readonly myMatches = computed(() => [...this.matchesService.upcoming(), ...this.matchesService.completed()]);
  protected readonly recentMatches = computed(() => this.myMatches().slice(0, 6));

  protected readonly levels = LEVELS;
  protected readonly formats = FORMATS;
  protected readonly surfaces = SURFACES;
  protected readonly frequencies = FREQUENCIES;
  protected readonly maxDistanceOptions = MAX_DISTANCE_OPTIONS;
  protected readonly countries = this.countryData.countries;
  protected readonly countryNames = computed(() => this.countries().map(c => c.name));
  // Players must be at least 6 years old — same lock as registration.
  protected readonly maxBirthDate = new Date(new Date().setFullYear(new Date().getFullYear() - 6)).toISOString().slice(0, 10);
  protected readonly countryFlags = computed(() => Object.fromEntries(this.countries().map(c => [c.name, c.flag])));
  protected readonly cityOptions = signal<string[]>([]);
  protected readonly hands = HANDS;
  protected readonly backhands = BACKHANDS;
  protected readonly genders = GENDERS;
  protected readonly playStyles = PLAY_STYLES;
  protected readonly courtPrefs = COURT_PREFS;
  protected readonly timesOfDayOptions = TIMES_OF_DAY;
  protected readonly surfaceLabelKey = surfaceLabelKey;

  protected readonly draftBirthDate = signal(this.profile.me().birthDate ?? '');
  protected readonly draftGender = signal<Gender | null>((this.profile.me().gender as Gender) ?? null);
  protected readonly draftDominantHand = signal<Hand | null>((this.profile.me().dominantHand as Hand) ?? null);
  protected readonly draftBackhand = signal<Backhand | null>((this.profile.me().backhand as Backhand) ?? null);
  protected readonly draftCity = signal(this.profile.me().city);
  protected readonly draftCountry = signal(this.profile.me().country);
  protected readonly draftLocationConsent = signal<boolean | null>(null);
  protected readonly draftLocatingConsent = signal(false);
  // Falls back to the same 20 km default registration starts at, for a profile that predates this field.
  protected readonly draftMaxDistanceKm = signal<number | null>(this.profile.me().maxDistanceKm ?? MAX_DISTANCE_OPTIONS[2]);
  protected readonly draftLevel = signal<Level | null>(this.profile.me().level);
  protected readonly draftYears = signal<number | null>(this.profile.me().years);
  protected readonly draftPlayStyle = signal<PlayStyle | null>((this.profile.me().playStyle as PlayStyle) ?? null);
  protected readonly draftFormat = signal<Format | null>(this.profile.me().format);
  protected readonly draftSurface = signal<Surface | null>(this.profile.me().surface);
  protected readonly draftCourtPref = signal<CourtPref | null>((this.profile.me().courtPref as CourtPref) ?? null);
  protected readonly draftFrequency = signal<Frequency | null>((this.profile.me().frequency as Frequency) ?? null);
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

  protected readonly canSaveTraits = computed(
    () => this.draftBirthDate().length > 0 && !!this.draftGender() && !!this.draftDominantHand()
  );

  protected readonly canSaveLocation = computed(
    () => this.draftCountry().length > 0 && this.draftCity().length > 0 && this.draftMaxDistanceKm() !== null
  );

  protected readonly maxDistanceIndex = computed(() => Math.max(0, this.maxDistanceOptions.indexOf(this.draftMaxDistanceKm() ?? -1)));

  // 0 years is a complete answer on its own — "Nível de jogo" is only required once years > 0.
  protected readonly canSaveGame = computed(
    () => this.draftYears() !== null && (this.draftYears() === 0 || !!this.draftLevel())
  );

  protected readonly canSaveSchedule = computed(
    () => this.draftCoached() !== null && (this.draftCoached() === false || !!this.draftCoachedFrequency())
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

  // Each profile-page section saves independently, so editing one doesn't require scrolling to a
  // single button at the bottom — savingSection/savedSection track which one is currently in flight.
  protected readonly savingSection = signal<ProfileSection | null>(null);
  protected readonly savedSection = signal<ProfileSection | null>(null);

  protected readonly changingAvatar = signal(false);

  protected readonly deletingAccount = signal(false);

  protected readonly changingPassword = signal(false);

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
  }

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

  protected async requestDraftLocation(): Promise<void> {
    this.draftLocatingConsent.set(true);
    try {
      const fix = await this.geolocation.locate();
      this.draftLocationConsent.set(true);
      await this.fillDraftLocationFromFix(fix.lat, fix.lng);
    } catch {
      this.draftLocationConsent.set(false);
    } finally {
      this.draftLocatingConsent.set(false);
    }
  }

  // Best-effort only — a failed or unmatched lookup leaves country/city exactly as manual fields.
  private async fillDraftLocationFromFix(lat: number, lng: number): Promise<void> {
    const [result, countries] = await Promise.all([this.reverseGeocode.lookup(lat, lng), this.countryData.loadCountries()]);
    const match = result && countries.find(c => c.iso2.toUpperCase() === result.countryCode);
    if (match) {
      this.setDraftCountry(match.name);
    }
    if (result?.city) {
      this.draftCity.set(result.city);
    }
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

  protected isSaving(section: ProfileSection): boolean {
    return this.savingSection() === section;
  }

  protected isSaved(section: ProfileSection): boolean {
    return this.savedSection() === section;
  }

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
      // Not coalesced to undefined like the other fields here: frequency is now optional, and a
      // player may deliberately clear a previously-set answer, which must persist as null rather
      // than being silently skipped by ProfileRepositoryService.update()'s "only defined keys" filter.
      frequency: this.draftFrequency(),
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
    this.draftMaxDistanceKm.set(me.maxDistanceKm ?? MAX_DISTANCE_OPTIONS[2]);
    this.draftLocationConsent.set(null);
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

  protected async deleteAccount(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: this.translation.t('profile.deleteAccountConfirmLead'),
      confirmLabel: this.translation.t('profile.deleteAccountConfirmButton'),
      cancelLabel: this.translation.t('common.cancel'),
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
