import { Injectable, computed, inject, signal } from '@angular/core';
import { TournamentsRepository } from './data/tournaments.repository';

export const TOURNAMENT_FILTERS = [
  'tournaments.filters.allLevels',
  'enums.level.Intermediate',
  'enums.level.Advanced',
  'enums.format.Singles',
  'enums.format.Doubles',
  'tournaments.filters.thisMonth',
  'tournaments.filters.abroad',
] as const;

@Injectable({ providedIn: 'root' })
export class TournamentsService {
  private readonly repository = inject(TournamentsRepository);

  readonly filters = TOURNAMENT_FILTERS;
  readonly activeFilter = signal<string | null>(null);
  readonly all = computed(() => this.repository.getAll());
  readonly rankings = computed(() => this.repository.rankings);
  readonly bracket = this.repository.bracket;

  toggleFilter(filter: string): void {
    this.activeFilter.set(this.activeFilter() === filter ? null : filter);
  }

  getById(id: string) {
    return this.repository.getById(id);
  }
}
