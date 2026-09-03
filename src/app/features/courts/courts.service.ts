import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CountryDataService } from '../../core/data/country-data.service';
import { SURFACES } from '../../core/data/player-profile-options';
import { TranslationService } from '../../core/i18n/translation.service';
import {
  CapturedCourt,
  CheckInResult,
  CountryEntry,
  Court,
  CourtReportReason,
  NearbyVenue,
  Surface,
  VenueAccess,
  VenueCandidate,
  VenueKind,
  mapCoordsFor
} from '../../core/models';
import { GeoError, GeolocationService } from '../../core/services/geolocation.service';
import { ToastService } from '../../core/services/toast.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlayersRepository } from '../players/data/players.repository';
import { CourtActionFailure, CourtsRepository } from './data/courts.repository';

/** Where the register-a-court dialog currently is. */
export type ComposerStep = 'locate' | 'nearby' | 'form' | 'candidates';

/**
 * Owns court discovery filters and the whole registration flow.
 *
 * The flow is deliberately locate-first, never form-first: you cannot type a court into existence,
 * you have to be standing at one. What the fix buys is the list of what is already registered
 * around you, which is both the duplicate check and — because drafts surface here and nowhere
 * else — the only way an unverified court ever gets confirmed.
 */
@Injectable({ providedIn: 'root' })
export class CourtsService {
  private readonly repository = inject(CourtsRepository);
  private readonly auth = inject(AuthService);
  private readonly geo = inject(GeolocationService);
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);
  private readonly countryData = inject(CountryDataService);
  private readonly notifications = inject(NotificationsService);
  private readonly players = inject(PlayersRepository);

  readonly surfaces = SURFACES;
  readonly locating = this.geo.locating;
  readonly loaded = this.repository.loaded;
  /** The collection arrives with the catalogue, so its loading state is the same one. */
  readonly loadingCaptures = computed(() => !this.repository.loaded());
  readonly lastRegisteredCourtId = this.repository.lastRegisteredCourtId;

  // ---------------------------------------------------------------------------
  // Catalogue
  // ---------------------------------------------------------------------------

  readonly query = signal('');
  readonly surface = signal<string | null>(null);
  readonly indoor = signal<boolean | null>(null);
  readonly capturedOnly = signal(false);

  readonly all = computed(() => this.repository.catalogue());

  readonly results = computed(() => {
    const query = this.normalize(this.query());
    const surface = this.surface();
    const indoor = this.indoor();
    const capturedOnly = this.capturedOnly();
    return this.all()
      .filter(c => (query ? this.normalize(`${c.venue.name} ${c.number ?? ''} ${c.venue.city} ${c.venue.country}`).includes(query) : true))
      .filter(c => (surface ? c.surface === surface : true))
      .filter(c => (indoor === null ? true : c.indoor === indoor))
      .filter(c => (capturedOnly ? c.capturedByMe : true));
  });

  // Community-wide totals for the hero; the stats row under the filters reacts to the filters
  // instead — same split the page had before courts became real.
  readonly totalCourts = computed(() => this.all().length);
  readonly totalVenues = computed(() => new Set(this.all().map(c => c.venueId)).size);
  /** The viewer's collection, loaded with the catalogue — one source for every count in the app. */
  readonly myCaptures = this.repository.captured;
  readonly myCaptureCount = computed(() => this.myCaptures().length);
  /**
   * Countries the player has actually played in, derived from their captures — the passport's
   * stamps, with a real "first played here" date instead of an invented one.
   */
  readonly myCountries = computed<CountryEntry[]>(() => {
    const byCountry = new Map<string, { name: string; flag: string; courts: number; first: string }>();
    for (const capture of this.myCaptures()) {
      const entry = byCountry.get(capture.country) ?? {
        name: capture.country,
        flag: capture.flag,
        courts: 0,
        first: capture.capturedAt
      };
      entry.courts += 1;
      entry.first = entry.first < capture.capturedAt ? entry.first : capture.capturedAt;
      byCountry.set(capture.country, entry);
    }
    return [...byCountry.values()]
      .sort((a, b) => b.courts - a.courts)
      .map(entry => ({
        name: entry.name,
        flag: entry.flag,
        courts: entry.courts,
        visited: true,
        firstPlayed: this.formatMonth(entry.first),
        // The stylised map needs a point per country; the first court captured there is as good a
        // stand-in as any, and unlike the old hardcoded coords it's a real place.
        coords: this.countryCoords(entry.name)
      }));
  });
  readonly myCountryCount = computed(() => this.myCountries().length);

  // Community-wide, and real: every public court, and the countries they sit in.
  readonly communityCourts = computed(() => this.all().length);
  readonly communityCountries = computed(() => new Set(this.all().map(c => c.venue.country)).size);
  readonly topCountries = computed(() => {
    const byCountry = new Map<string, { country: string; flag: string; n: number }>();
    for (const c of this.all()) {
      const entry = byCountry.get(c.venue.country) ?? { country: c.venue.country, flag: c.venue.flag, n: 0 };
      entry.n += 1;
      byCountry.set(c.venue.country, entry);
    }
    return [...byCountry.values()].sort((a, b) => b.n - a.n).slice(0, 4);
  });

  readonly countriesWithCourts = computed(() => new Set(this.results().map(c => c.venue.country)).size);
  readonly indoorShare = computed(() => {
    const list = this.results();
    return list.length ? Math.round((list.filter(c => c.indoor).length / list.length) * 100) : 0;
  });

  constructor() {
    this.countryData.loadCountries();
    void this.repository.ensureCatalogue();

    // Reload whenever the signed-in player changes, so captures ("captured by me") are attributed
    // to the right viewer. Deliberately not gated on the catalogue already being loaded: the first
    // read is kicked off before auth resolves, so it can land anonymously and would otherwise leave
    // every court showing as uncaptured for the rest of the session.
    effect(() => {
      const uid = this.auth.currentUserId();
      untracked(() => {
        if (uid) {
          void this.repository.reload();
        }
      });
    });

    // City options follow the country picked in the venue form, same as the match composer.
    effect(() => {
      const country = this.formCountry();
      const countries = this.countryData.countries();
      untracked(() => {
        const match = countries.find(c => c.name === country);
        if (!match) {
          this.cityOptions.set([]);
          return;
        }
        this.formFlag.set(match.flag);
        void this.countryData.citiesFor(match.iso2).then(cities => this.cityOptions.set(cities));
      });
    });
  }

  toggleSurface(surface: string): void {
    this.surface.set(this.surface() === surface ? null : surface);
  }

  toggleIndoor(value: boolean): void {
    this.indoor.set(this.indoor() === value ? null : value);
  }

  resetFilters(): void {
    this.query.set('');
    this.surface.set(null);
    this.indoor.set(null);
    this.capturedOnly.set(false);
  }

  getById(id: string): Court | undefined {
    return this.repository.courtById(id);
  }

  loadCourt(id: string): Promise<Court | null> {
    return this.repository.getCourt(id);
  }

  courtsForVenue(venueId: string): Promise<Court[]> {
    return this.repository.courtsForVenue(venueId);
  }

  myCapturedCourts(): Promise<CapturedCourt[]> {
    return this.repository.myCapturedCourts();
  }

  // ---------------------------------------------------------------------------
  // Register-a-court dialog
  // ---------------------------------------------------------------------------

  readonly composerOpen = signal(false);
  readonly step = signal<ComposerStep>('locate');
  readonly fix = signal<{ lat: number; lng: number; accuracyM: number } | null>(null);
  readonly nearby = signal<NearbyVenue[]>([]);
  readonly candidates = signal<VenueCandidate[]>([]);
  readonly submitting = signal(false);
  readonly geoError = signal<string | null>(null);

  /** Set when adding a court to a venue that already exists; null when registering a new place. */
  readonly selectedVenue = signal<NearbyVenue | VenueCandidate | null>(null);

  readonly formVenueName = signal('');
  readonly formVenueKind = signal<VenueKind>('club');
  readonly formCountry = signal('');
  readonly formCity = signal('');
  readonly formFlag = signal('');
  readonly formAccess = signal<VenueAccess | null>(null);
  readonly formHours = signal('');
  readonly formPrice = signal('');
  readonly formFacilities = signal<string[]>([]);
  readonly formNumber = signal('');
  readonly formSurface = signal<Surface>('Hard');
  readonly formIndoor = signal(false);
  readonly formLights = signal(false);

  readonly cityOptions = signal<string[]>([]);
  readonly countryNames = computed(() => this.countryData.countries().map(c => c.name));
  readonly countryFlags = computed(() => Object.fromEntries(this.countryData.countries().map(c => [c.name, c.flag])));

  /** True when the current fix is too vague to corroborate — the court will be born as a draft. */
  readonly lowAccuracy = computed(() => {
    const fix = this.fix();
    return !!fix && !this.geo.isGoodFix(fix);
  });

  readonly accuracyLabel = computed(() => {
    const fix = this.fix();
    return fix && Number.isFinite(fix.accuracyM) ? `±${Math.round(fix.accuracyM)} m` : '—';
  });

  readonly canSubmit = computed(() => {
    if (!this.fix() || this.submitting()) {
      return false;
    }
    if (this.selectedVenue()) {
      return true;
    }
    return (
      this.formVenueName().trim().length >= 2 && this.formCity().trim().length > 0 && this.formCountry().trim().length > 0
    );
  });

  async openComposer(): Promise<void> {
    this.composerOpen.set(true);
    this.step.set('locate');
    this.geoError.set(null);
    this.candidates.set([]);
    this.selectedVenue.set(null);
    this.resetForm();
    await this.locate();
  }

  closeComposer(): void {
    this.composerOpen.set(false);
  }

  /** Locating is the entry gate: no fix, no registration. */
  async locate(): Promise<void> {
    this.geoError.set(null);
    try {
      const fix = await this.geo.locate();
      if (!this.geo.isUsableFix(fix)) {
        // A reading this vague is the ISP's centroid, not a place — the RPC would refuse it anyway.
        this.geoError.set(this.translation.t('courts.geoTooVague'));
        this.fix.set(null);
        return;
      }
      this.fix.set(fix);
      this.nearby.set(await this.repository.nearbyVenues(fix));
      this.step.set('nearby');
    } catch (error) {
      const code = error instanceof GeoError ? error.code : 'unavailable';
      this.geoError.set(this.translation.t(`courts.geo.${code}`));
      this.fix.set(null);
    }
  }

  /** "Add a court to this place" — skips every venue field. */
  chooseVenue(venue: NearbyVenue): void {
    this.selectedVenue.set(venue);
    this.step.set('form');
  }

  /** "None of these" — falls through to the full venue form, prefilled with home turf. */
  startNewVenue(): void {
    this.selectedVenue.set(null);
    const me = this.auth.currentPlayer();
    if (!this.formCountry()) {
      this.formCountry.set(me.country ?? '');
      this.formCity.set(me.city ?? '');
    }
    this.step.set('form');
  }

  backToNearby(): void {
    this.candidates.set([]);
    this.step.set('nearby');
  }

  toggleFacility(facility: string): void {
    this.formFacilities.update(list => (list.includes(facility) ? list.filter(f => f !== facility) : [...list, facility]));
  }

  setFormCountry(name: string): void {
    this.formCountry.set(name);
    this.formCity.set('');
  }

  /**
   * Submits the registration. A `candidates` result is not a failure — it's the server saying
   * "there's something that close with a name this similar, look before you insert".
   */
  async submit(force = false): Promise<void> {
    const fix = this.fix();
    if (!fix || !this.canSubmit()) {
      return;
    }
    this.submitting.set(true);
    try {
      const venue = this.selectedVenue();
      const result = await this.repository.registerCourt({
        fix,
        surface: this.formSurface(),
        number: this.formNumber().trim() || undefined,
        indoor: this.formIndoor(),
        lights: this.formLights(),
        venueId: venue?.id,
        venueName: this.formVenueName().trim(),
        venueKind: this.formVenueKind(),
        city: this.formCity().trim(),
        country: this.formCountry().trim(),
        flag: this.formFlag() || undefined,
        access: this.formAccess(),
        hours: this.formHours().trim() || undefined,
        price: this.formPrice().trim() || undefined,
        facilities: this.formFacilities(),
        force
      });

      if (result.status === 'candidates') {
        this.candidates.set(result.candidates);
        this.step.set('candidates');
        return;
      }

      await this.repository.reload();
      this.composerOpen.set(false);
      this.toast.success(
        this.translation.t(result.venueStatus === 'live' ? 'courts.registeredLive' : 'courts.registeredDraft')
      );
    } catch (error) {
      this.showFailure(error);
    } finally {
      this.submitting.set(false);
    }
  }

  /** Picked one of the suggested duplicates: attach the new court to it instead of creating a twin. */
  async useCandidate(candidate: VenueCandidate): Promise<void> {
    this.selectedVenue.set(candidate);
    this.candidates.set([]);
    await this.submit();
  }

  // ---------------------------------------------------------------------------
  // Capture
  // ---------------------------------------------------------------------------

  readonly capturing = signal<string | null>(null);

  /**
   * Captures a court, which is also what corroborates its venue. On the check-in that promotes a
   * draft to live, the feed announcement is written by the RPC (it belongs to the discoverer, not
   * to whoever confirmed it) while the notifications are sent from here — the same split every
   * other feature uses, since notifying is something a client is allowed to do as itself.
   */
  async capture(court: Court): Promise<void> {
    if (this.capturing()) {
      return;
    }
    this.capturing.set(court.id);
    try {
      const fix = await this.geo.locate();
      const result = await this.repository.checkIn(court.id, fix);
      await this.repository.reload();

      if (result.justVerified) {
        this.toast.success(this.translation.t('courts.verifiedToast'));
        void this.announceVerification(court.id, result);
      } else if (result.venueStatus === 'draft') {
        this.toast.success(this.translation.t('courts.capturedPending', { n: Math.max(0, 2 - result.confirmations) }));
      } else {
        this.toast.success(this.translation.t('courts.capturedToast'));
      }
    } catch (error) {
      this.showFailure(error);
    } finally {
      this.capturing.set(null);
    }
  }

  private async announceVerification(courtId: string, result: CheckInResult): Promise<void> {
    const { discoveredBy, city } = result;
    // courtId points at the court just confirmed, so the bell can route straight to a real page —
    // the venue itself has no route of its own, and this one renders it in full anyway.
    const data = { courtId, venueId: result.venueId, venueName: result.venueName, city, country: result.country };
    if (discoveredBy) {
      await this.notifications.notify(discoveredBy, 'court_verified', data);
    }
    // Everyone in the same city gets told a new place opened up — the discoverer already got the
    // more personal court_verified above, so they're filtered out to avoid a double ping.
    const locals = this.players
      .getAll()
      .filter(p => p.city === city && p.id !== discoveredBy)
      .map(p => p.id);
    if (locals.length > 0) {
      await this.notifications.notifyMany(locals, 'court_added_nearby', data);
    }
  }

  // ---------------------------------------------------------------------------
  // Photos and reports
  // ---------------------------------------------------------------------------

  photosFor(courtId: string) {
    return this.repository.photosFor(courtId);
  }

  async addPhoto(courtId: string, file: File) {
    try {
      return await this.repository.addPhoto(courtId, file);
    } catch (error) {
      this.showFailure(error);
      return null;
    }
  }

  removePhoto(photo: { id: string; courtId: string; url: string; createdAt: string }) {
    return this.repository.removePhoto(photo);
  }

  async report(courtId: string, reason: CourtReportReason, note?: string): Promise<boolean> {
    const ok = await this.repository.report(courtId, reason, note);
    this.toast.show(
      this.translation.t(ok ? 'courts.reportThanks' : 'courts.reportFailed'),
      ok ? 'success' : 'error'
    );
    return ok;
  }

  reportedCourtIds() {
    return this.repository.reportedCourtIds();
  }

  // ---------------------------------------------------------------------------

  private resetForm(): void {
    this.formVenueName.set('');
    this.formVenueKind.set('club');
    this.formAccess.set(null);
    this.formHours.set('');
    this.formPrice.set('');
    this.formFacilities.set([]);
    this.formNumber.set('');
    this.formSurface.set('Hard');
    this.formIndoor.set(false);
    this.formLights.set(false);
  }

  private showFailure(error: unknown): void {
    if (error instanceof CourtActionFailure) {
      this.toast.error(this.translation.t(`courts.errors.${error.reason}`));
      return;
    }
    if (error instanceof GeoError) {
      this.toast.error(this.translation.t(`courts.geo.${error.code}`));
      return;
    }
    this.toast.error(this.translation.t('courts.errors.unknown'));
  }

  private formatMonth(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString(this.translation.locale(), { month: 'short', year: 'numeric' });
  }

  private countryCoords(country: string): { x: number; y: number } {
    const capture = this.myCaptures().find(c => c.country === country);
    const court = capture ? this.repository.courtById(capture.courtId) : undefined;
    return court ? mapCoordsFor(court.venue.lat, court.venue.lng) : { x: 50, y: 50 };
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
