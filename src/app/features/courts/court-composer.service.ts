import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CountryDataService } from '../../core/data/country-data.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { NearbyVenue, Surface, VenueAccess, VenueCandidate, VenueKind } from '../../core/models';
import { GeoError, GeolocationService } from '../../core/services/geolocation.service';
import { ToastService } from '../../core/services/toast.service';
import { courtErrorKey } from './court-errors';
import { CourtsRepository } from './data/courts.repository';

/** Where the register-a-court dialog currently is. */
export type ComposerStep = 'locate' | 'nearby' | 'form' | 'candidates';

/**
 * Owns the whole register-a-court flow, separately from browsing the catalogue.
 *
 * The flow is deliberately locate-first, never form-first: you cannot type a court into existence,
 * you have to be standing at one. What the fix buys is the list of what is already registered
 * around you, which is both the duplicate check and — because drafts surface here and nowhere
 * else — the only way an unverified court ever gets confirmed.
 */
@Injectable({ providedIn: 'root' })
export class CourtComposerService {
  private readonly repository = inject(CourtsRepository);
  private readonly auth = inject(AuthService);
  private readonly geo = inject(GeolocationService);
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);
  private readonly countryData = inject(CountryDataService);

  readonly locating = this.geo.locating;

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

  constructor() {
    this.countryData.loadCountries();

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
      this.toast.error(this.translation.t(courtErrorKey(error)));
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
}
