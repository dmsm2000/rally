import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CountryDataService } from '../../core/data/country-data.service';
import { RallyDataService } from '../../core/data/rally-data.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { Player, TripIntent, mapCoordsFor } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { MapMarker } from '../../shared/components';
import { CourtsRepository } from '../courts/data/courts.repository';
import { PostsRepository } from '../feed/data/posts.repository';
import { PlayersService } from '../players/players.service';
import { TripsRepository } from './data/trips.repository';

@Injectable({ providedIn: 'root' })
export class WorldService {
  private readonly data = inject(RallyDataService);
  private readonly auth = inject(AuthService);
  private readonly countryData = inject(CountryDataService);
  private readonly courtsRepository = inject(CourtsRepository);
  private readonly players = inject(PlayersService);
  private readonly trips = inject(TripsRepository);
  private readonly posts = inject(PostsRepository);
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);

  readonly destinations = this.data.destinations;
  readonly countries = this.data.countries;
  // Real courts, drawn at their real coordinates — warmed here since the map reads the signal.
  readonly courts = computed(() => this.courtsRepository.catalogue());
  readonly activity = this.data.worldActivity;

  readonly selectedId = signal(this.destinations()[0]?.id ?? '');
  readonly selectedDestination = computed(() => this.destinations().find((d) => d.id === this.selectedId()) ?? this.destinations()[0]);

  readonly markers = computed<MapMarker[]>(() => [
    ...this.destinations().map((d) => ({ id: d.id, x: d.coords.x, y: d.coords.y, kind: 'destination' as const, label: d.city })),
    // Real coordinates, projected onto the stylised grid — the map stops inventing positions.
    ...this.courts().map((c) => ({ id: `court-${c.id}`, ...mapCoordsFor(c.venue.lat, c.venue.lng), kind: 'court' as const, label: c.venue.name })),
    ...this.activity().map((a) => ({ id: a.id, x: a.coords.x, y: a.coords.y, kind: 'activity' as const, label: a.city })),
    ...this.countries()
      .filter((c) => !c.visited)
      .map((c) => ({ id: `l-${c.name}`, x: c.coords.x, y: c.coords.y, kind: 'locked' as const, label: c.name })),
  ]);

  select(id: string): void {
    if (this.destinations().some((d) => d.id === id)) {
      this.selectedId.set(id);
    }
  }

  readonly meId = this.auth.currentUserId;

  // Trip publish draft — country/city picked the same way as registration/profile.
  readonly tripCountry = signal('');
  readonly tripCity = signal('');
  readonly tripFromDate = signal('');
  readonly tripToDate = signal('');
  readonly tripNote = signal('');
  readonly tripCityOptions = signal<string[]>([]);
  readonly tripPublishing = signal(false);
  readonly tripComposerOpen = signal(false);

  // ui-date-picker defaults its `max` to today (right for a birth date) — trips need the opposite:
  // any day from today up to a couple of years out.
  readonly todayIso = new Date().toISOString().slice(0, 10);
  readonly maxTripDateIso = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 2);
    return date.toISOString().slice(0, 10);
  })();

  readonly countryNames = computed(() => this.countryData.countries().map((c) => c.name));
  readonly countryFlags = computed(() => Object.fromEntries(this.countryData.countries().map((c) => [c.name, c.flag])));
  readonly canPublishTrip = computed(
    () =>
      this.tripCountry().length > 0 &&
      this.tripCity().length > 0 &&
      this.tripFromDate().length > 0 &&
      this.tripToDate().length > 0 &&
      this.tripNote().trim().length > 0,
  );

  private readonly hostRequestsRaw = signal<TripIntent[]>([]);
  private readonly volunteeredTripIds = signal<Set<string>>(new Set());
  private readonly volunteeringTripIds = signal<Set<string>>(new Set());

  readonly hostRequestsForMyCountry = computed(() =>
    this.hostRequestsRaw()
      .map((intent) => ({ intent, player: this.players.getById(intent.playerId) }))
      .filter((row): row is { intent: TripIntent; player: Player } => !!row.player),
  );

  private readonly hostRequestsPreviewLimit = 2;
  readonly visibleHostRequestsForMyCountry = computed(() => this.hostRequestsForMyCountry().slice(0, this.hostRequestsPreviewLimit));
  readonly hasMoreHostRequests = computed(() => this.hostRequestsForMyCountry().length > this.hostRequestsPreviewLimit);

  readonly hostDialogOpen = signal(false);

  openHostDialog(): void {
    this.hostDialogOpen.set(true);
  }

  closeHostDialog(): void {
    this.hostDialogOpen.set(false);
  }

  // Re-derives only when the resolved country actually changes value (not on every unrelated
  // profile-signal update), and reloads the host list whenever it does.
  private readonly myCountryKey = computed(() => this.auth.currentPlayer().country ?? '');

  constructor() {
    void this.courtsRepository.ensureCatalogue();
    this.countryData.loadCountries();

    effect(() => {
      const match = this.countryData.countries().find((c) => c.name === this.tripCountry());
      if (!match) {
        this.tripCityOptions.set([]);
        return;
      }
      this.countryData.citiesFor(match.iso2).then((cities) => this.tripCityOptions.set(cities));
    });

    effect(() => {
      this.myCountryKey();
      untracked(() => {
        void this.loadHostRequests(this.auth.currentPlayer().country);
      });
    });
  }

  openTripComposer(): void {
    this.tripComposerOpen.set(true);
  }

  closeTripComposer(): void {
    this.tripComposerOpen.set(false);
  }

  setTripCountry(name: string): void {
    this.tripCountry.set(name);
    this.tripCity.set('');
  }

  countryFlag(name: string | undefined): string {
    return this.countryData.countries().find((c) => c.name === name)?.flag ?? '';
  }

  formatDate(iso: string): string {
    return this.trips.formatDate(iso);
  }

  hasVolunteered(tripId: string): boolean {
    return this.volunteeredTripIds().has(tripId);
  }

  isVolunteering(tripId: string): boolean {
    return this.volunteeringTripIds().has(tripId);
  }

  async publishTripIntent(): Promise<void> {
    if (!this.tripCountry() || !this.tripCity() || !this.tripFromDate() || !this.tripToDate() || !this.tripNote().trim()) {
      return;
    }
    this.tripPublishing.set(true);
    const tripId = await this.trips.publish({
      destinationCountry: this.tripCountry(),
      destinationCity: this.tripCity(),
      fromDate: this.tripFromDate(),
      toDate: this.tripToDate(),
      note: this.tripNote().trim(),
    });
    this.tripPublishing.set(false);
    if (!tripId) {
      return;
    }
    // Best-effort: the trip itself already published successfully (hosting still works from
    // World either way), so a failure here is logged by PostsRepository but not surfaced.
    void this.posts.createTripAnnouncement(tripId);
    this.tripCountry.set('');
    this.tripCity.set('');
    this.tripFromDate.set('');
    this.tripToDate.set('');
    this.tripNote.set('');
    this.closeTripComposer();
    this.toast.success(this.translation.t('world.tripPublished'));
    void this.loadHostRequests(this.auth.currentPlayer().country);
  }

  async volunteerForTrip(intent: TripIntent): Promise<void> {
    if (this.hasVolunteered(intent.id) || this.isVolunteering(intent.id)) {
      return;
    }
    this.volunteeringTripIds.update((ids) => new Set(ids).add(intent.id));
    const success = await this.trips.volunteer(intent);
    this.volunteeringTripIds.update((ids) => {
      const next = new Set(ids);
      next.delete(intent.id);
      return next;
    });
    if (success) {
      this.volunteeredTripIds.update((ids) => new Set(ids).add(intent.id));
      const name = this.players.getById(intent.playerId)?.name ?? intent.destinationCity;
      this.toast.success(this.translation.t('world.volunteerSuccess', { name }));
    }
  }

  private async loadHostRequests(country: string | undefined): Promise<void> {
    if (!country) {
      this.hostRequestsRaw.set([]);
      this.volunteeredTripIds.set(new Set());
      return;
    }
    const intents = await this.trips.hostRequestsForCountry(country);
    this.hostRequestsRaw.set(intents);
    this.volunteeredTripIds.set(await this.trips.myVolunteeredTripIds(intents.map((i) => i.id)));
  }
}
