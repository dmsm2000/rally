import { Injectable, inject } from '@angular/core';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { CommunityStats, Court, Match, MatchFormat, Player } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class MatchesRepository {
  private readonly data = inject(RallyDataService);

  getAll(): Match[] {
    return this.data.matches();
  }

  communityStats(): CommunityStats {
    return this.data.communityStats;
  }

  me(): Player {
    return this.data.me();
  }

  getById(id: string): Match | undefined {
    return this.data.matchById(id);
  }

  playerById(id: string | undefined) {
    return this.data.playerById(id);
  }

  courtById(id: string) {
    return this.data.courtById(id);
  }

  courts(): Court[] {
    return this.data.courts();
  }

  createOpenMatch(input: { courtId: string; date: string; time: string; format: MatchFormat; note: string }): Match {
    return this.data.createOpenMatch(input);
  }

  acceptOpenMatch(matchId: string): void {
    this.data.acceptOpenMatch(matchId);
  }
}
