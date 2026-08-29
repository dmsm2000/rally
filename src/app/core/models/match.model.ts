export type MatchStatus = 'upcoming' | 'live' | 'complete';
export type MatchFormat = 'Singles' | 'Doubles';

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
  playerB: string;
  sets?: [number, number][];
  winner?: string;
  stats?: MatchStat[];
}
