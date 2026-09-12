import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { Player } from '../../core/models';
import { MatchesRepository } from '../matches/data/matches.repository';
import { PlayersRepository } from './data/players.repository';
import { computeMatchCompatibility } from './match-compatibility';

export const PLAYER_FORMATS = ['Singles', 'Doubles', 'Both'] as const;
export type PlayerSort = 'newest' | 'name' | 'city' | 'memberNumber';

/** Owns the search/filter state for player discovery and derives the result list. */
@Injectable({ providedIn: 'root' })
export class PlayersService {
  private readonly repository = inject(PlayersRepository);
  private readonly matches = inject(MatchesRepository);
  private readonly auth = inject(AuthService);

  readonly levels = this.repository.levels;
  readonly surfaces = this.repository.surfaces;
  readonly formats = PLAYER_FORMATS;

  readonly query = signal('');
  readonly levelsSelected = signal<string[]>([]);
  readonly formatsSelected = signal<string[]>([]);
  readonly surfacesSelected = signal<string[]>([]);
  readonly sameCountryOnly = signal(false);
  readonly filtersOpen = signal(false);
  readonly sortOpen = signal(false);
  readonly sort = signal<PlayerSort>('newest');

  /** Match Score's "activity" factor needs each player's completed-match count, which isn't
   *  visible client-side otherwise (see MatchesRepository.matchActivityFor) — fetched lazily per
   *  id and cached here rather than upfront, since the discovery list can grow over time. */
  private readonly activityById = signal<ReadonlyMap<string, number>>(new Map());
  private readonly activityRequested = new Set<string>();

  /** Real players with a real Match Score/reason computed against the signed-in viewer, replacing
   *  the repository's placeholder 0/bio-as-reason — see match-compatibility.ts. */
  private readonly scoredPlayers = computed<Player[]>(() => {
    const viewer = this.auth.currentPlayer();
    const others = this.repository.getAll();
    const activity = this.activityById();
    const viewerActivity = activity.get(viewer.id) ?? 0;
    return others.map(other => {
      const { score, reasonKeys } = computeMatchCompatibility(viewer, viewerActivity, other, activity.get(other.id) ?? 0);
      return { ...other, matchScore: score, matchReasonKeys: reasonKeys };
    });
  });

  readonly countriesRepresented = computed(() => new Set(this.repository.getAll().map(p => p.country)).size);
  /** Discovery excludes the signed-in player, but the community total includes them. */
  readonly activeCount = computed(() => this.repository.getAll().length + (this.auth.currentUserId() ? 1 : 0));
  readonly hasActiveFilters = computed(
    () =>
      this.levelsSelected().length > 0 ||
      this.formatsSelected().length > 0 ||
      this.surfacesSelected().length > 0 ||
      this.sameCountryOnly()
  );

  readonly results = computed(() => {
    const query = this.normalise(this.query());
    const levels = this.levelsSelected();
    const formats = this.formatsSelected();
    const surfaces = this.surfacesSelected();
    const sameCountryOnly = this.sameCountryOnly();
    const ownCountry = this.auth.currentPlayer().country;

    const results = this.scoredPlayers()
      .filter(p => (query ? this.normalise(`${p.name} ${p.city} ${p.country}`).includes(query) : true))
      .filter(p => (levels.length ? levels.includes(p.level) : true))
      .filter(p => (formats.length ? formats.includes(p.format) : true))
      .filter(p => (surfaces.length ? surfaces.includes(p.surface) : true))
      .filter(p => (sameCountryOnly ? p.country === ownCountry : true));
    if (this.sort() === 'name') {
      return [...results].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (this.sort() === 'city') {
      return [...results].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
    }
    if (this.sort() === 'memberNumber') {
      return [...results].sort(
        (a, b) =>
          Number(a.memberNumber ?? Number.POSITIVE_INFINITY) - Number(b.memberNumber ?? Number.POSITIVE_INFINITY)
      );
    }
    return results;
  });

  constructor() {
    // Loads activity counts for whichever players are actually in view (plus the viewer), rather
    // than the whole catalogue up front. Skipped for observers: Match Score is never shown to
    // them, and RallyDataService.me().id is a mock id for observer sessions — passing it to
    // player_match_activity would just be a wasted, failing request.
    effect(() => {
      const isObserver = this.auth.isObserver();
      const viewerId = this.auth.currentPlayer().id;
      const otherIds = this.repository.getAll().map(p => p.id);
      untracked(() => {
        if (!isObserver) {
          this.ensureActivityLoaded([viewerId, ...otherIds]);
        }
      });
    });
  }

  toggleLevel(level: string): void {
    this.levelsSelected.update(levels => this.toggleOption(levels, level));
  }

  toggleFormat(format: string): void {
    this.formatsSelected.update(formats => this.toggleOption(formats, format));
  }

  toggleSurface(surface: string): void {
    this.surfacesSelected.update(surfaces => this.toggleOption(surfaces, surface));
  }

  toggleSameCountry(): void {
    this.sameCountryOnly.update(active => !active);
  }

  setSort(sort: PlayerSort): void {
    this.sort.set(sort);
  }

  resetFilters(): void {
    this.query.set('');
    this.levelsSelected.set([]);
    this.formatsSelected.set([]);
    this.surfacesSelected.set([]);
    this.sameCountryOnly.set(false);
  }

  getById(id: string) {
    return this.scoredPlayers().find(p => p.id === id);
  }

  private ensureActivityLoaded(ids: readonly (string | undefined)[]): void {
    const missing = ids.filter((id): id is string => !!id && !this.activityRequested.has(id));
    if (!missing.length) {
      return;
    }
    missing.forEach(id => this.activityRequested.add(id));
    void Promise.all(missing.map(async id => [id, await this.matches.matchActivityFor(id)] as const)).then(
      entries => {
        this.activityById.update(current => {
          const next = new Map(current);
          for (const [id, count] of entries) {
            next.set(id, count);
          }
          return next;
        });
      }
    );
  }

  private toggleOption(options: string[], option: string): string[] {
    return options.includes(option) ? options.filter(value => value !== option) : [...options, option];
  }

  private normalise(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
