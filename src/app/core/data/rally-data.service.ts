import { Injectable, signal } from '@angular/core';
import {
  Court,
  FeedItem,
  Match,
  MatchFormat,
  Player,
  SessionType,
  Surface,
  TripIntent,
  WorldActivityItem
} from '../models';
import {
  ACHIEVEMENTS,
  COMMUNITY_STATS,
  COUNTRIES,
  COURTS,
  DESTINATIONS,
  FEED,
  HERO_IMAGE,
  LEVELS,
  MATCHES,
  ME,
  NOTIFICATIONS,
  PLAYERS,
  SURFACES,
  TRIP_INTENTS,
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
  private readonly _feed = signal(FEED);
  private readonly _achievements = signal(ACHIEVEMENTS);
  private readonly _countries = signal(COUNTRIES);
  private readonly _destinations = signal(DESTINATIONS);
  private readonly _worldActivity = signal(WORLD_ACTIVITY);
  private readonly _tripIntents = signal(TRIP_INTENTS);
  private readonly _notifications = signal(NOTIFICATIONS);

  readonly me = this._me.asReadonly();
  readonly players = this._players.asReadonly();
  readonly courts = this._courts.asReadonly();
  readonly matches = this._matches.asReadonly();
  readonly feed = this._feed.asReadonly();
  readonly achievements = this._achievements.asReadonly();
  readonly countries = this._countries.asReadonly();
  readonly destinations = this._destinations.asReadonly();
  readonly worldActivity = this._worldActivity.asReadonly();
  readonly tripIntents = this._tripIntents.asReadonly();
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

  // Posting an open match also drops a matching post in the feed, same as a real capture/challenge would.
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

    const location = input.courtId
      ? (this.courtById(input.courtId)?.name ?? '')
      : `${input.city ?? ''} · ±${input.radiusKm ?? 0}km`;
    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'challenge',
      text: input.note,
      detail: `${location} · ${input.date} ${input.time}`,
      time: 'Agora mesmo'
    };
    this._feed.update(list => [feedItem, ...list]);

    return match;
  }

  // A player-authored feed post — a highlight, clip or photo from the moment, no match/court attached.
  createFeedPost(input: { text: string; image?: string; video?: string }): FeedItem {
    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'highlight',
      text: input.text,
      time: 'Agora mesmo',
      image: input.image,
      video: input.video
    };
    this._feed.update(list => [feedItem, ...list]);
    return feedItem;
  }

  // Adding a court to the shared registry also drops a "discovered this court" post in the feed.
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

    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'court',
      text: `${this._me().name} discovered ${court.name}.`,
      detail: `${court.flag} ${court.city}, ${court.country}`,
      time: 'Agora mesmo',
      image: court.image
    };
    this._feed.update(list => [feedItem, ...list]);

    return court;
  }

  // Accepting an open match books it for both players and announces the new game in the feed.
  acceptOpenMatch(matchId: string): void {
    const match = this.matchById(matchId);
    if (!match || match.status !== 'open') {
      return;
    }
    this._matches.update(list =>
      list.map(m => (m.id === matchId ? { ...m, status: 'upcoming', playerB: this._me().id } : m))
    );

    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'match',
      text: `${this._me().name} accepted ${this.playerById(match.playerA)?.name ?? ''}'s open match.`,
      detail: `${this.courtById(match.courtId)?.name ?? ''} · ${match.date} ${match.time}`,
      time: 'Agora mesmo'
    };
    this._feed.update(list => [feedItem, ...list]);
  }

  // Posting a trip intent also drops a live pin on the community map, same as the open-match/feed pairing above.
  createTripIntent(input: { destinationId: string; fromDate: string; toDate: string; note: string }): void {
    const destination = this.destinations().find(d => d.id === input.destinationId);
    if (!destination) {
      return;
    }

    const tripIntent: TripIntent = {
      id: `ti-${Date.now()}`,
      playerId: this._me().id,
      destinationId: input.destinationId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      note: input.note,
      status: 'open'
    };
    this._tripIntents.update(list => [tripIntent, ...list]);

    const activityItem: WorldActivityItem = {
      id: `trip-${Date.now()}`,
      city: destination.city,
      flag: destination.flag,
      kind: 'trip',
      text: input.note,
      time: 'Agora mesmo',
      coords: destination.coords
    };
    this._worldActivity.update(list => [activityItem, ...list]);

    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'trip',
      text: input.note,
      detail: `${destination.flag} ${destination.city} · ${input.fromDate} – ${input.toDate}`,
      time: 'Agora mesmo'
    };
    this._feed.update(list => [feedItem, ...list]);
  }

  // Volunteering to host confirms the trip intent and announces the pairing in the feed.
  volunteerForTrip(tripId: string): void {
    const trip = this._tripIntents().find(t => t.id === tripId);
    if (!trip || trip.status !== 'open') {
      return;
    }
    this._tripIntents.update(list => list.map(t => (t.id === tripId ? { ...t, status: 'matched' } : t)));

    const destination = this.destinations().find(d => d.id === trip.destinationId);
    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'trip',
      text: `${this._me().name} volunteered to show ${this.playerById(trip.playerId)?.name ?? ''} around ${destination?.city ?? ''}.`,
      detail: `${destination?.flag ?? ''} ${destination?.city ?? ''} · ${trip.fromDate} – ${trip.toDate}`,
      time: 'Agora mesmo'
    };
    this._feed.update(list => [feedItem, ...list]);
  }


  markNotificationRead(id: string): void {
    this._notifications.update(list => list.map(n => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllNotificationsRead(): void {
    this._notifications.update(list => list.map(n => ({ ...n, read: true })));
  }
}
