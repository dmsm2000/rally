import { Injectable, computed, inject, signal } from '@angular/core';
import { CourtsRepository } from './data/courts.repository';

/** Owns the search/filter state for court discovery. */
@Injectable({ providedIn: 'root' })
export class CourtsService {
  private readonly repository = inject(CourtsRepository);

  readonly surfaces = this.repository.surfaces;

  readonly query = signal('');
  readonly surface = signal<string | null>(null);
  readonly indoor = signal<boolean | null>(null);

  readonly all = computed(() => this.repository.getAll());

  // Community-wide totals, not the current user's — the personal collection lives on the Passport page.
  readonly totalCourts = computed(() => this.all().length);
  readonly countriesWithCourts = computed(() => new Set(this.all().map((c) => c.country)).size);
  readonly averageRating = computed(() => {
    const list = this.all();
    return list.length ? Math.round((list.reduce((sum, c) => sum + c.rating, 0) / list.length) * 10) / 10 : 0;
  });
  readonly averagePlayAgain = computed(() => {
    const list = this.all();
    return list.length ? Math.round(list.reduce((sum, c) => sum + c.playAgain, 0) / list.length) : 0;
  });
  readonly topCountries = computed(() => {
    const byCountry = new Map<string, { country: string; flag: string; n: number }>();
    for (const c of this.all()) {
      const entry = byCountry.get(c.country) ?? { country: c.country, flag: c.flag, n: 0 };
      entry.n += 1;
      byCountry.set(c.country, entry);
    }
    return [...byCountry.values()].sort((a, b) => b.n - a.n).slice(0, 4);
  });

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
