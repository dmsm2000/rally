import { Injectable, inject } from '@angular/core';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { Player } from '../../../core/models';

/** Data-access boundary for the players feature. Talks to RallyDataService today, Supabase later. */
@Injectable({ providedIn: 'root' })
export class PlayersRepository {
  private readonly data = inject(RallyDataService);

  getAll(): Player[] {
    return this.data.players();
  }

  getById(id: string): Player | undefined {
    return this.data.playerById(id);
  }

  get levels(): readonly string[] {
    return this.data.levels;
  }

  get surfaces(): readonly string[] {
    return this.data.surfaces;
  }
}
