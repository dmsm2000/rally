import { Injectable, signal } from '@angular/core';
import { Court, Player, Surface } from '../models';
import {
  ACHIEVEMENTS,
  COMMUNITY_STATS,
  COUNTRIES,
  COURTS,
  DESTINATIONS,
  HERO_IMAGE,
  LEVELS,
  ME,
  MOCK_MATCH_PAIRINGS,
  PLAYERS,
  SURFACES,
  WORLD_ACTIVITY
} from './rally-dataset';

// Fallback cover photo for a newly added court, picked by surface when the player doesn't attach one.
const SURFACE_IMAGE: Record<Surface, string> = {
  Clay: 'assets/court-clay.jpg',
  Hard: 'assets/court-hard.jpg',
  Grass: 'assets/court-grass.jpg',
  Carpet: 'assets/court-indoor.jpg'
};

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
  private readonly _achievements = signal(ACHIEVEMENTS);
  private readonly _countries = signal(COUNTRIES);
  private readonly _destinations = signal(DESTINATIONS);
  private readonly _worldActivity = signal(WORLD_ACTIVITY);

  readonly me = this._me.asReadonly();
  readonly players = this._players.asReadonly();
  readonly courts = this._courts.asReadonly();
  readonly achievements = this._achievements.asReadonly();
  readonly countries = this._countries.asReadonly();
  readonly destinations = this._destinations.asReadonly();
  readonly worldActivity = this._worldActivity.asReadonly();

  readonly levels = LEVELS;
  readonly surfaces = SURFACES;
  readonly heroImage = HERO_IMAGE;
  readonly communityStats = COMMUNITY_STATS;

  get allPlayers() {
    return [this._me(), ...this._players()];
  }

  playerById(id: string | undefined) {
    return id ? this.allPlayers.find(p => p.id === id) : undefined;
  }

  updateMe(partial: Partial<Player>): void {
    this._me.update(player => ({ ...player, ...partial }));
  }

  courtById(id: string) {
    return this._courts().find(c => c.id === id);
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

  createCourt(input: {
    name: string;
    city: string;
    country: string;
    flag: string;
    surface: Surface;
    indoor: boolean;
    courts: number;
    price: string;
    hours: string;
    image?: string;
  }): Court {
    const court: Court = {
      id: `court-${Date.now()}`,
      name: input.name,
      city: input.city,
      country: input.country,
      flag: input.flag || '🎾',
      surface: input.surface,
      indoor: input.indoor,
      courts: input.courts || 1,
      rating: 0,
      reviews: 0,
      price: input.price || '—',
      hours: input.hours || '—',
      image: input.image || SURFACE_IMAGE[input.surface],
      distanceKm: 0,
      facilities: [],
      playAgain: 0,
      coords: { x: 50, y: 50 }
    };
    this._courts.update(list => [court, ...list]);

    return court;
  }
}
