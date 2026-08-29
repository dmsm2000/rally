import { Injectable, signal } from '@angular/core';
import {
  ACHIEVEMENTS,
  BRACKET,
  COUNTRIES,
  COURTS,
  DESTINATIONS,
  FEED,
  HERO_IMAGE,
  LEVELS,
  MATCHES,
  ME,
  PLAYERS,
  RANKINGS,
  SURFACES,
  TOURNAMENTS
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
  private readonly _courts = signal(COURTS);
  private readonly _matches = signal(MATCHES);
  private readonly _tournaments = signal(TOURNAMENTS);
  private readonly _feed = signal(FEED);
  private readonly _achievements = signal(ACHIEVEMENTS);
  private readonly _countries = signal(COUNTRIES);
  private readonly _destinations = signal(DESTINATIONS);
  private readonly _rankings = signal(RANKINGS);

  readonly me = this._me.asReadonly();
  readonly players = this._players.asReadonly();
  readonly courts = this._courts.asReadonly();
  readonly matches = this._matches.asReadonly();
  readonly tournaments = this._tournaments.asReadonly();
  readonly feed = this._feed.asReadonly();
  readonly achievements = this._achievements.asReadonly();
  readonly countries = this._countries.asReadonly();
  readonly destinations = this._destinations.asReadonly();
  readonly rankings = this._rankings.asReadonly();

  readonly bracket = BRACKET;
  readonly levels = LEVELS;
  readonly surfaces = SURFACES;
  readonly heroImage = HERO_IMAGE;

  get allPlayers() {
    return [this._me(), ...this._players()];
  }

  playerById(id: string) {
    return this.allPlayers.find(p => p.id === id);
  }

  courtById(id: string) {
    return this._courts().find(c => c.id === id);
  }

  matchById(id: string) {
    return this._matches().find(m => m.id === id);
  }

  tournamentById(id: string) {
    return this._tournaments().find(t => t.id === id);
  }
}
