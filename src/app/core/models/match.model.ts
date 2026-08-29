export type MatchStatus = 'upcoming' | 'live' | 'complete' | 'open';
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
  playerB?: string;
  note?: string;
  sets?: [number, number][];
  winner?: string;
  stats?: MatchStat[];
}
