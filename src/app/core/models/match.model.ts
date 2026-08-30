export type MatchStatus = 'upcoming' | 'live' | 'complete' | 'open';
export type MatchFormat = 'Singles' | 'Doubles';
export type SessionType = 'Training' | 'HittingSession' | 'PracticeMatch' | 'FullMatch';

export interface MatchStat {
  label: string;
  a: string;
  b: string;
}

export interface Match {
  id: string;
  status: MatchStatus;
  date: string;
  time: string;
  courtId: string;
  format: MatchFormat;
  playerA: string;
  playerB?: string;
  note?: string;
  sets?: [number, number][];
  winner?: string;
  stats?: MatchStat[];
  sessionType?: SessionType;
  durationMinutes?: number;
  /** Set instead of courtId when the poster only wants to say "somewhere near this city", not a specific court. */
  city?: string;
  radiusKm?: number;
}
