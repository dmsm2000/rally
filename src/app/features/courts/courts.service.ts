import { Injectable, computed, inject, signal } from '@angular/core';
import { Surface } from '../../core/models';
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

  readonly results = computed(() => {
    const query = this.query().toLowerCase();
    const surface = this.surface();
    const indoor = this.indoor();
    return this.all()
      .filter(c => (query ? `${c.name} ${c.city} ${c.country}`.toLowerCase().includes(query) : true))
      .filter(c => (surface ? c.surface === surface : true))
      .filter(c => (indoor === null ? true : c.indoor === indoor));
  });

  // Community-wide totals for the hero banner — the stats row below (after the filters) reacts to search/filters instead.
  readonly totalCourts = computed(() => this.all().length);
  readonly topCountries = computed(() => {
    const byCountry = new Map<string, { country: string; flag: string; n: number }>();
    for (const c of this.all()) {
      const entry = byCountry.get(c.country) ?? { country: c.country, flag: c.flag, n: 0 };
      entry.n += 1;
      byCountry.set(c.country, entry);
    }
    return [...byCountry.values()].sort((a, b) => b.n - a.n).slice(0, 4);
  });

  // These react to the active search/filters, since they sit right below them and describe the current results.
  readonly countriesWithCourts = computed(() => new Set(this.results().map(c => c.country)).size);
  readonly averageRating = computed(() => {
    const list = this.results();
    return list.length ? Math.round((list.reduce((sum, c) => sum + c.rating, 0) / list.length) * 10) / 10 : 0;
  });
  readonly averagePlayAgain = computed(() => {
    const list = this.results();
    return list.length ? Math.round(list.reduce((sum, c) => sum + c.playAgain, 0) / list.length) : 0;
  });

  toggleSurface(surface: string): void {
    this.surface.set(this.surface() === surface ? null : surface);
  }

  toggleIndoor(value: boolean): void {
    this.indoor.set(this.indoor() === value ? null : value);
  }

  readonly composerName = signal('');
  readonly composerCity = signal('');
  readonly composerCountry = signal('');
  readonly composerFlag = signal('');
  readonly composerSurface = signal<Surface>('Hard');
  readonly composerIndoor = signal(false);
  readonly composerCourts = signal(1);
  readonly composerPrice = signal('');
  readonly composerHours = signal('');
  readonly composerPhotoUrl = signal<string | null>(null);

  readonly canPublishCourt = computed(
    () => this.composerName().trim().length > 0 && this.composerCity().trim().length > 0
  );

  // Reads the picked photo locally (no upload backend yet) and previews it as a data URL.
  attachPhoto(file: File): void {
    const reader = new FileReader();
    reader.onload = () => this.composerPhotoUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearPhoto(): void {
    this.composerPhotoUrl.set(null);
  }

  publishCourt(): void {
    if (!this.canPublishCourt()) {
      return;
    }
    this.repository.createCourt({
      name: this.composerName().trim(),
      city: this.composerCity().trim(),
      country: this.composerCountry().trim(),
      flag: this.composerFlag().trim(),
      surface: this.composerSurface(),
      indoor: this.composerIndoor(),
      courts: this.composerCourts(),
      price: this.composerPrice().trim(),
      hours: this.composerHours().trim(),
      image: this.composerPhotoUrl() ?? undefined
    });
    this.composerName.set('');
    this.composerCity.set('');
    this.composerCountry.set('');
    this.composerFlag.set('');
    this.composerSurface.set('Hard');
    this.composerIndoor.set(false);
    this.composerCourts.set(1);
    this.composerPrice.set('');
    this.composerHours.set('');
    this.clearPhoto();
  }

  getById(id: string) {
    return this.repository.getById(id);
  }
}
