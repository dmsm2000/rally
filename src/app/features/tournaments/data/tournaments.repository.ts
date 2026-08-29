import { Injectable, inject } from '@angular/core';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { Tournament } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class TournamentsRepository {
  private readonly data = inject(RallyDataService);

  getAll(): Tournament[] {
    return this.data.tournaments();
  }

  getById(id: string): Tournament | undefined {
    return this.data.tournamentById(id);
  }

  get bracket() {
    return this.data.bracket;
  }

  get rankings() {
    return this.data.rankings();
  }
}
