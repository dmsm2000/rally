export type MatchKind = 'direct' | 'open';
export type MatchStatus = 'pending' | 'open' | 'upcoming' | 'cancelled' | 'complete';
export type MatchFormat = 'Singles' | 'Doubles';
export type SessionType = 'Training' | 'HittingSession' | 'PracticeMatch' | 'FullMatch';

export interface MatchStat {
  label: string;
  a: string;
  b: string;
}

export interface Match {
  id: string;
  kind: MatchKind;
  status: MatchStatus;
  matchDate: string;
  matchTime: string;
  /** Present only when the time is a flexible window ("anytime between matchTime and this works"). */
  matchTimeEnd?: string;
  courtId?: string;
  /** Always populated — denormalized from the chosen court, or entered directly when no court was picked. */
  city: string;
  country: string;
  radiusKm?: number;
  format: MatchFormat;
  sessionType?: SessionType;
  playerA: string;
  playerB?: string;
  /** Full joined roster, in join order, including playerA. Only populated for format 'Doubles'. */
  participantIds?: string[];
  note?: string;
  durationMinutes?: number;
  sets?: [number, number][];
  winner?: string;
  stats?: MatchStat[];
  cancelledBy?: string;
  confirmedAt?: string;
  createdAt: string;
}
