import { Injectable, computed, inject, signal } from '@angular/core';
import { CourtsRepository } from './data/courts.repository';

const COLLECTION_BY_COUNTRY = [
  { country: 'Portugal', flag: '🇵🇹', n: 18 },
  { country: 'Spain', flag: '🇪🇸', n: 7 },
  { country: 'France', flag: '🇫🇷', n: 3 },
  { country: 'Italy', flag: '🇮🇹', n: 2 },
];

/** Owns the search/filter state for court discovery. */
@Injectable({ providedIn: 'root' })
export class CourtsService {
  private readonly repository = inject(CourtsRepository);

  readonly surfaces = this.repository.surfaces;
  readonly collectionByCountry = COLLECTION_BY_COUNTRY;

  readonly query = signal('');
  readonly surface = signal<string | null>(null);
  readonly indoor = signal<boolean | null>(null);

  readonly all = computed(() => this.repository.getAll());

  readonly results = computed(() => {
    const query = this.query().toLowerCase();
    const surface = this.surface();
    const indoor = this.indoor();
    return this.all()
      .filter((c) => (query ? `${c.name} ${c.city} ${c.country}`.toLowerCase().includes(query) : true))
      .filter((c) => (surface ? c.surface === surface : true))
      .filter((c) => (indoor === null ? true : c.indoor === indoor));
  });

  toggleSurface(surface: string): void {
    this.surface.set(this.surface() === surface ? null : surface);
  }

  toggleIndoor(value: boolean): void {
    this.indoor.set(this.indoor() === value ? null : value);
  }

  getById(id: string) {
    return this.repository.getById(id);
  }
}
