import { Injectable, signal } from '@angular/core';
import {
  Court,
  Match,
  MatchFormat,
  Player,
  SessionType,
  Surface
} from '../models';
import {
  ACHIEVEMENTS,
  COMMUNITY_STATS,
  COUNTRIES,
  COURTS,
  DESTINATIONS,
  HERO_IMAGE,
  LEVELS,
  MATCHES,
  ME,
  NOTIFICATIONS,
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
  private readonly _matches = signal(MATCHES);
  private readonly _achievements = signal(ACHIEVEMENTS);
  private readonly _countries = signal(COUNTRIES);
  private readonly _destinations = signal(DESTINATIONS);
  private readonly _worldActivity = signal(WORLD_ACTIVITY);
  private readonly _notifications = signal(NOTIFICATIONS);

  readonly me = this._me.asReadonly();
  readonly players = this._players.asReadonly();
  readonly courts = this._courts.asReadonly();
  readonly matches = this._matches.asReadonly();
  readonly achievements = this._achievements.asReadonly();
  readonly countries = this._countries.asReadonly();
  readonly destinations = this._destinations.asReadonly();
  readonly worldActivity = this._worldActivity.asReadonly();
  readonly notifications = this._notifications.asReadonly();

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

  matchById(id: string) {
    return this._matches().find(m => m.id === id);
  }

  // There's no manual "follow" — you're connected to (and "follow") anyone you've shared a court with.
  playersMetBy(playerId: string): string[] {
    const ids = new Set<string>();
    for (const m of this._matches()) {
      if (m.playerA === playerId && m.playerB) {
        ids.add(m.playerB);
      } else if (m.playerB === playerId) {
        ids.add(m.playerA);
      }
    }
    return [...ids];
  }

  createOpenMatch(input: {
    courtId: string;
    city?: string;
    radiusKm?: number;
    date: string;
    time: string;
    format: MatchFormat;
    sessionType: SessionType;
    durationMinutes?: number;
    note: string;
  }): Match {
    const match: Match = {
      id: `open-${Date.now()}`,
      status: 'open',
      date: input.date,
      time: input.time,
      courtId: input.courtId,
      city: input.courtId ? undefined : input.city,
      radiusKm: input.courtId ? undefined : input.radiusKm,
      format: input.format,
      playerA: this._me().id,
      note: input.note,
      sessionType: input.sessionType,
      durationMinutes: input.durationMinutes
    };
    this._matches.update(list => [match, ...list]);

    return match;
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

  // Accepting an open match books it for both players.
  acceptOpenMatch(matchId: string): void {
    const match = this.matchById(matchId);
    if (!match || match.status !== 'open') {
      return;
    }
    this._matches.update(list =>
      list.map(m => (m.id === matchId ? { ...m, status: 'upcoming', playerB: this._me().id } : m))
    );
  }

  markNotificationRead(id: string): void {
    this._notifications.update(list => list.map(n => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllNotificationsRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
  }
}
