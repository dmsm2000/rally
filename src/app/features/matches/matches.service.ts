import { Injectable, computed, inject } from '@angular/core';
import { MatchesRepository } from './data/matches.repository';

@Injectable({ providedIn: 'root' })
export class MatchesService {
  private readonly repository = inject(MatchesRepository);

  readonly all = computed(() => this.repository.getAll());
  readonly upcoming = computed(() => this.all().filter((m) => m.status === 'upcoming'));
  readonly completed = computed(() => this.all().filter((m) => m.status === 'complete'));

  getById(id: string) {
    return this.repository.getById(id);
  }

  playerById(id: string) {
    return this.repository.playerById(id);
  }

  courtById(id: string) {
    return this.repository.courtById(id);
  }
}
