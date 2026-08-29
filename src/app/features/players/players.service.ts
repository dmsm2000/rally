import { Injectable, computed, inject, signal } from '@angular/core';
import { PlayersRepository } from './data/players.repository';
import { MapMarker } from '../../shared/components';

export const PLAYER_FORMATS = ['Singles', 'Doubles', 'Both'] as const;

const JITTER = [
  { dx: 0, dy: 0 },
  { dx: 1.6, dy: -1.1 },
  { dx: -1.6, dy: 1.1 },
  { dx: 1.1, dy: 1.6 },
  { dx: -1.1, dy: -1.6 },
];

/** Owns the search/filter state for player discovery and derives the result list. */
@Injectable({ providedIn: 'root' })
export class PlayersService {
  private readonly repository = inject(PlayersRepository);

  readonly levels = this.repository.levels;
  readonly surfaces = this.repository.surfaces;
  readonly formats = PLAYER_FORMATS;

  readonly query = signal('');
  readonly level = signal<string | null>(null);
  readonly format = signal<string | null>(null);
  readonly surface = signal<string | null>(null);
  readonly nearOnly = signal(false);

  readonly markers = computed<MapMarker[]>(() => {
    const seenPerCountry = new Map<string, number>();
    return this.repository
      .getAll()
      .map((p): MapMarker | null => {
        const base = this.repository.countryCoords(p.country);
        if (!base) {
          return null;
        }
        const seen = seenPerCountry.get(p.country) ?? 0;
        seenPerCountry.set(p.country, seen + 1);
        const jitter = JITTER[seen % JITTER.length];
        return { id: p.id, x: base.x + jitter.dx, y: base.y + jitter.dy, kind: 'player', label: p.name };
      })
      .filter((m): m is MapMarker => m !== null);
  });

  readonly countriesRepresented = computed(() => new Set(this.repository.getAll().map((p) => p.country)).size);
  readonly nearbyCount = computed(() => this.repository.getAll().filter((p) => p.distanceKm < 300).length);

  readonly results = computed(() => {
    const query = this.query().toLowerCase();
    const level = this.level();
    const format = this.format();
    const surface = this.surface();
    const nearOnly = this.nearOnly();

    return this.repository
      .getAll()
      .filter((p) => (query ? `${p.name} ${p.city} ${p.country}`.toLowerCase().includes(query) : true))
      .filter((p) => (level ? p.level === level : true))
      .filter((p) => (format ? p.format === format || p.format === 'Both' : true))
      .filter((p) => (surface ? p.surface === surface : true))
      .filter((p) => (nearOnly ? p.distanceKm < 300 : true))
      .sort((a, b) => b.matchScore - a.matchScore);
  });

  toggleLevel(level: string): void {
    this.level.set(this.level() === level ? null : level);
  }

  toggleFormat(format: string): void {
    this.format.set(this.format() === format ? null : format);
  }

  toggleSurface(surface: string): void {
    this.surface.set(this.surface() === surface ? null : surface);
  }

  resetFilters(): void {
    this.query.set('');
    this.level.set(null);
    this.format.set(null);
    this.surface.set(null);
    this.nearOnly.set(false);
  }

  getById(id: string) {
    return this.repository.getById(id);
  }
}
