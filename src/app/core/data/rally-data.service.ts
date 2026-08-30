import { Injectable, signal } from '@angular/core';
import { AppNotification, ChatMessage, Conversation, FeedItem, Match, MatchFormat, Player, TripIntent, WorldActivityItem } from '../models';
import {
  ACHIEVEMENTS,
  CANNED_REPLIES,
  COMMUNITY_STATS,
  CONVERSATIONS,
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
  private readonly _conversations = signal(CONVERSATIONS);
  private readonly _notifications = signal(NOTIFICATIONS);
  private readonly _typingPlayerId = signal<string | null>(null);

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
  readonly conversations = this._conversations.asReadonly();
  readonly notifications = this._notifications.asReadonly();
  /** The player currently "typing" a reply — only ever set while the canned auto-reply is pending. */
  readonly typingPlayerId = this._typingPlayerId.asReadonly();


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
    this._me.update((player) => ({ ...player, ...partial }));
  }

  courtById(id: string) {
    return this._courts().find(c => c.id === id);
  }

  matchById(id: string) {
    return this._matches().find(m => m.id === id);
  }

  // Posting an open match also drops a matching post in the feed, same as a real capture/challenge would.
  createOpenMatch(input: { courtId: string; date: string; time: string; format: MatchFormat; note: string }): Match {
    const match: Match = {
      id: `open-${Date.now()}`,
      status: 'open',
      date: input.date,
      time: input.time,
      courtId: input.courtId,
      format: input.format,
      playerA: this._me().id,
      note: input.note,
    };
    this._matches.update((list) => [match, ...list]);

    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'challenge',
      text: input.note,
      detail: `${this.courtById(input.courtId)?.name ?? ''} · ${input.date} ${input.time}`,
      time: 'Agora mesmo',
    };
    this._feed.update((list) => [feedItem, ...list]);

    return match;
  }

  // Accepting an open match books it for both players and announces the new game in the feed.
  acceptOpenMatch(matchId: string): void {
    const match = this.matchById(matchId);
    if (!match || match.status !== 'open') {
      return;
    }
    this._matches.update((list) => list.map((m) => (m.id === matchId ? { ...m, status: 'upcoming', playerB: this._me().id } : m)));

    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'match',
      text: `${this._me().name} accepted ${this.playerById(match.playerA)?.name ?? ''}'s open match.`,
      detail: `${this.courtById(match.courtId)?.name ?? ''} · ${match.date} ${match.time}`,
      time: 'Agora mesmo',
    };
    this._feed.update((list) => [feedItem, ...list]);
  }

  // Posting a trip intent also drops a live pin on the community map, same as the open-match/feed pairing above.
  createTripIntent(input: { destinationId: string; fromDate: string; toDate: string; note: string }): void {
    const destination = this.destinations().find((d) => d.id === input.destinationId);
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
      status: 'open',
    };
    this._tripIntents.update((list) => [tripIntent, ...list]);

    const activityItem: WorldActivityItem = {
      id: `trip-${Date.now()}`,
      city: destination.city,
      flag: destination.flag,
      kind: 'trip',
      text: input.note,
      time: 'Agora mesmo',
      coords: destination.coords,
    };
    this._worldActivity.update((list) => [activityItem, ...list]);

    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'trip',
      text: input.note,
      detail: `${destination.flag} ${destination.city} · ${input.fromDate} – ${input.toDate}`,
      time: 'Agora mesmo',
    };
    this._feed.update((list) => [feedItem, ...list]);
  }

  // Volunteering to host confirms the trip intent and announces the pairing in the feed.
  volunteerForTrip(tripId: string): void {
    const trip = this._tripIntents().find((t) => t.id === tripId);
    if (!trip || trip.status !== 'open') {
      return;
    }
    this._tripIntents.update((list) => list.map((t) => (t.id === tripId ? { ...t, status: 'matched' } : t)));

    const destination = this.destinations().find((d) => d.id === trip.destinationId);
    const feedItem: FeedItem = {
      id: `feed-${Date.now()}`,
      playerId: this._me().id,
      kind: 'trip',
      text: `${this._me().name} volunteered to show ${this.playerById(trip.playerId)?.name ?? ''} around ${destination?.city ?? ''}.`,
      detail: `${destination?.flag ?? ''} ${destination?.city ?? ''} · ${trip.fromDate} – ${trip.toDate}`,
      time: 'Agora mesmo',
    };
    this._feed.update((list) => [feedItem, ...list]);
  }

  conversationByPlayer(playerId: string) {
    return this._conversations().find((c) => c.playerId === playerId);
  }

  conversationById(id: string) {
    return this._conversations().find((c) => c.id === id);
  }

  // Finds (or lazily starts) the conversation with a player, e.g. from their "Message" button.
  ensureConversation(playerId: string): string {
    const existing = this.conversationByPlayer(playerId);
    if (existing) {
      return existing.id;
    }
    const conversation: Conversation = { id: `conv-${playerId}`, playerId, messages: [], unread: 0 };
    this._conversations.update((list) => [conversation, ...list]);
    return conversation.id;
  }

  // No-op (keeps the same array reference) when already read, so it never triggers a spurious signal change.
  markConversationRead(conversationId: string): void {
    this._conversations.update((list) => {
      const conversation = list.find((c) => c.id === conversationId);
      if (!conversation || conversation.unread === 0) {
        return list;
      }
      return list.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c));
    });
  }

  // Sends my message, then simulates the other player "typing" and replying shortly after, and raises a notification for it.
  sendMessage(conversationId: string, text: string): void {
    const message: ChatMessage = { id: `msg-${Date.now()}`, senderId: this._me().id, text, sentAt: 'Agora mesmo' };
    this._conversations.update((list) => list.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c)));

    const conversation = this.conversationById(conversationId);
    if (!conversation) {
      return;
    }
    const replyDelayMs = 1800;
    this._typingPlayerId.set(conversation.playerId);
    setTimeout(() => {
      const replyText = CANNED_REPLIES[conversation.messages.length % CANNED_REPLIES.length];
      const reply: ChatMessage = { id: `msg-${Date.now()}-r`, senderId: conversation.playerId, text: replyText, sentAt: 'Agora mesmo' };
      this._conversations.update((list) => list.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, reply], unread: c.unread + 1 } : c)));
      this._typingPlayerId.update((current) => (current === conversation.playerId ? null : current));

      const notification: AppNotification = {
        id: `notif-${Date.now()}`,
        kind: 'message',
        text: `${this.playerById(conversation.playerId)?.name ?? ''} sent you a message`,
        detail: replyText,
        time: 'Just now',
        read: false,
        link: `/messages/${conversation.playerId}`,
        playerId: conversation.playerId,
      };
      this._notifications.update((list) => [notification, ...list]);
    }, replyDelayMs);
  }

  markNotificationRead(id: string): void {
    this._notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  markAllNotificationsRead(): void {
    this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }
}
