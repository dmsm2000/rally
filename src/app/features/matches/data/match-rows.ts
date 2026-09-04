import { Match, MatchFormat, MatchKind, MatchStatus, SessionType } from '../../../core/models';

/**
 * The shape `matches` comes back in, and the mapping from it to the `Match` model — split out of
 * MatchesRepository for the same reason court-rows.ts was: the queries read better without the
 * snake_case row type and its field-by-field translation in the middle of them.
 */
export interface MatchRow {
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
  match_participants?: { player_id: string }[] | null;
}

export const SELECT_COLUMNS =
  'id,kind,status,player_a,player_b,format,session_type,court_id,city,country,radius_km,match_date,match_time,match_time_end,duration_minutes,note,winner,sets,cancelled_by,confirmed_at,created_at';
// Embeds the doubles roster (see 0021_doubles_matches.sql) — Supabase follows the FK
// automatically and enforces match_participants' own RLS on the embedded rows.
export const SELECT_COLUMNS_WITH_PARTICIPANTS = `${SELECT_COLUMNS},match_participants(player_id)`;

export function toMatch(row: MatchRow): Match {
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
    participantIds: row.format === 'Doubles' ? (row.match_participants ?? []).map(p => p.player_id) : undefined,
    note: row.note ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    sets: row.sets ?? undefined,
    winner: row.winner ?? undefined,
    cancelledBy: row.cancelled_by ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    createdAt: row.created_at
  };
}
