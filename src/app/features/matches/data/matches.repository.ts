import { Injectable, inject } from '@angular/core';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { Match } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class MatchesRepository {
  private readonly data = inject(RallyDataService);

  getAll(): Match[] {
    return this.data.matches();
  }

  getById(id: string): Match | undefined {
    return this.data.matchById(id);
  }

  playerById(id: string) {
    return this.data.playerById(id);
  }

  courtById(id: string) {
    return this.data.courtById(id);
  }
}
