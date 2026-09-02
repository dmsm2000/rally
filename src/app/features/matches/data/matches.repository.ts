import { Injectable, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { supabase } from '../../../core/auth/supabase.client';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { CommunityStats, Court, Match, MatchFormat, MatchKind, MatchStatus, SessionType } from '../../../core/models';
import { NotificationsService } from '../../notifications/notifications.service';
import { PlayersRepository } from '../../players/data/players.repository';

interface MatchRow {
  id: string;
  kind: MatchKind;
  status: MatchStatus;
  player_a: string;
  player_b: string | null;
  format: MatchFormat;
  session_type: SessionType | null;
  court_id: string | null;
  city: string;
  country: string;
  radius_km: number | null;
  match_date: string;
  match_time: string;
  match_time_end: string | null;
  duration_minutes: number | null;
  note: string | null;
  winner: string | null;
  sets: [number, number][] | null;
  cancelled_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface CreateMatchInput {
  format: MatchFormat;
  sessionType?: SessionType;
  courtId?: string;
  city: string;
  country: string;
  radiusKm?: number;
  matchDate: string;
  matchTime: string;
  matchTimeEnd?: string;
  durationMinutes?: number;
  note?: string;
}

const SELECT_COLUMNS =
  'id,kind,status,player_a,player_b,format,session_type,court_id,city,country,radius_km,match_date,match_time,match_time_end,duration_minutes,note,winner,sets,cancelled_by,confirmed_at,created_at';

/** Data-access boundary for real matches (see supabase/migrations/0018_matches.sql). */
@Injectable({ providedIn: 'root' })
export class MatchesRepository {
  private readonly auth = inject(AuthService);
  private readonly data = inject(RallyDataService);
  private readonly notifications = inject(NotificationsService);
  private readonly players = inject(PlayersRepository);

  private matchesChannel?: RealtimeChannel;

  /** Live inserts/updates/deletes on any match the caller's RLS lets them see (their own matches,
   * plus every open match globally — see 0018_matches.sql's select policy) — callers filter
   * further for relevance (see MatchesService.handleRealtimeMatch()). */
  subscribeToMatchEvents(onChange: (match: Match) => void): void {
    this.unsubscribeFromMatchEvents();
    this.matchesChannel = supabase
      .channel('matches-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, payload => {
        const row = (payload.new ?? payload.old) as MatchRow;
        onChange(this.toMatch(row));
      })
      .subscribe();
  }

  unsubscribeFromMatchEvents(): void {
    if (this.matchesChannel) {
      void supabase.removeChannel(this.matchesChannel);
      this.matchesChannel = undefined;
    }
  }

  courts(): Court[] {
    return this.data.courts();
  }

  courtById(id: string | undefined): Court | undefined {
    return id ? this.data.courtById(id) : undefined;
  }

  communityStats(): CommunityStats {
    return this.data.communityStats;
  }

  // Discovery excludes the signed-in player (see PlayersRepository), so a match where I'm
  // playerA/playerB would otherwise resolve to no player at all — fall back to the mock-bridged
  // "me" object the same way FeedService.playerById() does.
  playerById(id: string | undefined) {
    if (!id) {
      return undefined;
    }
    if (id === this.auth.currentUserId()) {
      return this.data.me();
    }
    return this.players.getById(id);
  }

  /** Every match the signed-in player is (or was) part of, any kind/status. */
  async myMatches(): Promise<Match[]> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return [];
    }
    const { data, error } = await supabase
      .from('matches')
      .select(SELECT_COLUMNS)
      .or(`player_a.eq.${uid},player_b.eq.${uid}`)
      .order('match_date', { ascending: true });
    if (error || !data) {
      console.error('Failed to load matches:', error?.message);
      return [];
    }
    return (data as MatchRow[]).map(row => this.toMatch(row));
  }

  /** Open matches still waiting for a taker, near this location. */
  async openMatchesNear(country: string, city?: string): Promise<Match[]> {
    let query = supabase.from('matches').select(SELECT_COLUMNS).eq('kind', 'open').eq('status', 'open').eq('country', country);
    if (city) {
      query = query.eq('city', city);
    }
    const { data, error } = await query.order('match_date', { ascending: true });
    if (error || !data) {
      console.error('Failed to load open matches:', error?.message);
      return [];
    }
    return (data as MatchRow[]).map(row => this.toMatch(row));
  }

  /** Every open match still waiting for a taker, anywhere — the "In the world" browse scope. */
  async allOpenMatches(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('matches')
      .select(SELECT_COLUMNS)
      .eq('kind', 'open')
      .eq('status', 'open')
      .order('match_date', { ascending: true });
    if (error || !data) {
      console.error('Failed to load open matches:', error?.message);
      return [];
    }
    return (data as MatchRow[]).map(row => this.toMatch(row));
  }

  async getById(id: string): Promise<Match | null> {
    const { data, error } = await supabase.from('matches').select(SELECT_COLUMNS).eq('id', id).maybeSingle();
    if (error || !data) {
      if (error) {
        console.error('Failed to load match:', error.message);
      }
      return null;
    }
    return this.toMatch(data as MatchRow);
  }

  /** Batch fetch for feed hydration — mirrors TripsRepository.getByIds(). */
  async getByIds(ids: string[]): Promise<Match[]> {
    if (ids.length === 0) {
      return [];
    }
    const { data, error } = await supabase.from('matches').select(SELECT_COLUMNS).in('id', ids);
    if (error || !data) {
      console.error('Failed to load matches by id:', error?.message);
      return [];
    }
    return (data as MatchRow[]).map(row => this.toMatch(row));
  }

  /** Open match ids at this location — powers the feed's location-based visibility (see PostsRepository.list()). */
  async idsForLocation(country: string, city?: string): Promise<string[]> {
    let query = supabase.from('matches').select('id').eq('kind', 'open').eq('country', country);
    if (city) {
      query = query.eq('city', city);
    }
    const { data, error } = await query;
    if (error || !data) {
      console.error('Failed to load open match ids:', error?.message);
      return [];
    }
    return data.map(row => row.id as string);
  }

  /** Returns the new match's id, or null on failure. Notifies the invitee in real time. */
  async createDirectInvite(playerBId: string, input: CreateMatchInput): Promise<string | null> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return null;
    }
    const { data, error } = await supabase
      .from('matches')
      .insert({
        kind: 'direct',
        status: 'pending',
        player_a: uid,
        player_b: playerBId,
        format: input.format,
        session_type: input.sessionType ?? null,
        court_id: input.courtId ?? null,
        city: input.city,
        country: input.country,
        match_date: input.matchDate,
        match_time: input.matchTime,
        match_time_end: input.matchTimeEnd ?? null,
        duration_minutes: input.durationMinutes ?? null,
        note: input.note ?? null
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error('Failed to create match invite:', error?.message);
      return null;
    }
    const matchId = data.id as string;
    try {
      await this.notifications.notify(playerBId, 'match_invite_received', {
        matchId,
        city: input.city,
        matchDate: input.matchDate,
        matchTime: input.matchTime
      });
    } catch (err) {
      console.error('Failed to notify invitee:', err);
    }
    return matchId;
  }

  /** Returns the new match's id, or null on failure. Fans a "match near you" notification out to same-city players. */
  async createOpenMatch(input: CreateMatchInput): Promise<string | null> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return null;
    }
    const { data, error } = await supabase
      .from('matches')
      .insert({
        kind: 'open',
        status: 'open',
        player_a: uid,
        format: input.format,
        session_type: input.sessionType ?? null,
        court_id: input.courtId ?? null,
        city: input.city,
        country: input.country,
        radius_km: input.radiusKm ?? null,
        match_date: input.matchDate,
        match_time: input.matchTime,
        match_time_end: input.matchTimeEnd ?? null,
        duration_minutes: input.durationMinutes ?? null,
        note: input.note ?? null
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error('Failed to publish open match:', error?.message);
      return null;
    }
    const matchId = data.id as string;
    try {
      const nearbyIds = this.players
        .getAll()
        .filter(p => p.city === input.city && p.id !== uid)
        .map(p => p.id);
      await this.notifications.notifyMany(nearbyIds, 'match_open_nearby', {
        matchId,
        city: input.city,
        matchDate: input.matchDate,
        matchTime: input.matchTime
      });
    } catch (err) {
      console.error('Failed to notify nearby players:', err);
    }
    return matchId;
  }

  /** Accept or decline a pending direct invite. Notifies the inviter in real time. */
  async respondToInvite(matchId: string, accept: boolean): Promise<Match | null> {
    const { data, error } = await supabase.rpc('respond_to_match_invite', { p_match_id: matchId, p_accept: accept });
    if (error || !data) {
      console.error('Failed to respond to match invite:', error?.message);
      return null;
    }
    const row = data as MatchRow;
    try {
      await this.notifications.notify(row.player_a, accept ? 'match_invite_accepted' : 'match_invite_declined', {
        matchId: row.id,
        city: row.city,
        matchDate: row.match_date,
        matchTime: row.match_time
      });
    } catch (err) {
      console.error('Failed to notify inviter:', err);
    }
    return this.toMatch(row);
  }

  /** Joins an open match. Null means it's no longer available (already taken/withdrawn) or the request failed. */
  async acceptOpenMatch(matchId: string): Promise<Match | null> {
    const { data, error } = await supabase.rpc('accept_open_match', { p_match_id: matchId });
    if (error || !data) {
      console.error('Failed to join open match:', error?.message);
      return null;
    }
    const row = data as MatchRow;
    try {
      await this.notifications.notify(row.player_a, 'match_joined', {
        matchId: row.id,
        city: row.city,
        matchDate: row.match_date,
        matchTime: row.match_time
      });
    } catch (err) {
      console.error('Failed to notify the match poster:', err);
    }
    return this.toMatch(row);
  }

  /** Withdraws a pending/open match (creator only) or cancels a confirmed one (either participant). */
  async cancelMatch(matchId: string): Promise<Match | null> {
    const uid = this.auth.currentUserId();
    const { data, error } = await supabase.rpc('cancel_match', { p_match_id: matchId });
    if (error || !data) {
      console.error('Failed to cancel match:', error?.message);
      return null;
    }
    const row = data as MatchRow;
    const otherPlayerId = row.player_a === uid ? row.player_b : row.player_a;
    if (otherPlayerId) {
      try {
        await this.notifications.notify(otherPlayerId, 'match_cancelled', {
          matchId: row.id,
          city: row.city,
          matchDate: row.match_date,
          matchTime: row.match_time
        });
      } catch (err) {
        console.error('Failed to notify the other player:', err);
      }
    }
    return this.toMatch(row);
  }

  async completeMatch(matchId: string, winnerId: string, sets?: [number, number][]): Promise<Match | null> {
    const { data, error } = await supabase.rpc('complete_match', { p_match_id: matchId, p_winner: winnerId, p_sets: sets ?? null });
    if (error || !data) {
      console.error('Failed to complete match:', error?.message);
      return null;
    }
    return this.toMatch(data as MatchRow);
  }

  async deleteMatch(matchId: string): Promise<boolean> {
    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) {
      console.error('Failed to delete match:', error.message);
      return false;
    }
    return true;
  }

  private toMatch(row: MatchRow): Match {
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      matchDate: row.match_date,
      matchTime: row.match_time,
      matchTimeEnd: row.match_time_end ?? undefined,
      courtId: row.court_id ?? undefined,
      city: row.city,
      country: row.country,
      radiusKm: row.radius_km ?? undefined,
      format: row.format,
      sessionType: row.session_type ?? undefined,
      playerA: row.player_a,
      playerB: row.player_b ?? undefined,
      note: row.note ?? undefined,
      durationMinutes: row.duration_minutes ?? undefined,
      sets: row.sets ?? undefined,
      winner: row.winner ?? undefined,
      cancelledBy: row.cancelled_by ?? undefined,
      confirmedAt: row.confirmed_at ?? undefined,
      createdAt: row.created_at
    };
  }
}
