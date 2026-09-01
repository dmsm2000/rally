import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PlayersRepository } from './data/players.repository';

export const PLAYER_FORMATS = ['Singles', 'Doubles', 'Both'] as const;
export type PlayerSort = 'newest' | 'name' | 'city';

/** Owns the search/filter state for player discovery and derives the result list. */
@Injectable({ providedIn: 'root' })
export class PlayersService {
  private readonly repository = inject(PlayersRepository);
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

  readonly countriesRepresented = computed(() => new Set(this.repository.getAll().map((p) => p.country)).size);
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

    const results = this.repository
      .getAll()
      .filter((p) => (query ? this.normalise(`${p.name} ${p.city} ${p.country}`).includes(query) : true))
      .filter((p) => (levels.length ? levels.includes(p.level) : true))
      .filter((p) => (formats.length ? formats.includes(p.format) : true))
      .filter((p) => (surfaces.length ? surfaces.includes(p.surface) : true))
      .filter((p) => (sameCountryOnly ? p.country === ownCountry : true));
    if (this.sort() === 'name') {
      return [...results].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (this.sort() === 'city') {
      return [...results].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
    }
    return results;
  });

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
    return this.repository.getById(id);
  }

  private toggleOption(options: string[], option: string): string[] {
    return options.includes(option) ? options.filter(value => value !== option) : [...options, option];
  }

  private normalise(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }
}
