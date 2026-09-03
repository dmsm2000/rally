import { Injectable, signal } from '@angular/core';
import { Player } from '../models';
import {
  ACHIEVEMENTS,
  COUNTRIES,
  DESTINATIONS,
  HERO_IMAGE,
  LEVELS,
  ME,
  MOCK_MATCH_PAIRINGS,
  PLAYERS,
  SURFACES,
  WORLD_ACTIVITY
} from './rally-dataset';

/**
 * Data-access boundary standing in for Supabase. Feature repositories depend on this
 * service only — swapping it for a real Supabase-backed implementation later should not
 * require any change in feature services, repositories or components.
 */
@Injectable({ providedIn: 'root' })
export class RallyDataService {
  private readonly _me = signal(ME);
  private readonly _players = signal(PLAYERS);
  private readonly _achievements = signal(ACHIEVEMENTS);
  private readonly _countries = signal(COUNTRIES);
  private readonly _destinations = signal(DESTINATIONS);
  private readonly _worldActivity = signal(WORLD_ACTIVITY);

  readonly me = this._me.asReadonly();
  readonly players = this._players.asReadonly();
  readonly achievements = this._achievements.asReadonly();
  readonly countries = this._countries.asReadonly();
  readonly destinations = this._destinations.asReadonly();
  readonly worldActivity = this._worldActivity.asReadonly();

  readonly levels = LEVELS;
  readonly surfaces = SURFACES;
  readonly heroImage = HERO_IMAGE;

  get allPlayers() {
    return [this._me(), ...this._players()];
  }

  playerById(id: string | undefined) {
    return id ? this.allPlayers.find(p => p.id === id) : undefined;
  }

  updateMe(partial: Partial<Player>): void {
    this._me.update(player => ({ ...player, ...partial }));
  }

  // There's no manual "follow" — you're connected to (and "follow") anyone you've shared a court with.
  playersMetBy(playerId: string): string[] {
    const ids = new Set<string>();
    for (const [a, b] of MOCK_MATCH_PAIRINGS) {
      if (a === playerId) {
        ids.add(b);
      } else if (b === playerId) {
        ids.add(a);
      }
    }
    return [...ids];
  }

}
