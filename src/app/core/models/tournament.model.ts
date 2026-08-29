import { Surface } from './player.model';

export type TournamentStatus = 'Open' | 'Filling fast' | 'Closed' | 'Waitlist';

export interface Tournament {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  dates: string;
  level: string;
  format: string;
  participants: number;
  capacity: number;
  fee: string;
  status: TournamentStatus;
  organizer: string;
  image: string;
  surface: Surface;
}

export interface BracketMatch {
  a: string;
  b: string;
  scoreA?: string;
  scoreB?: string;
  winner?: 'a' | 'b';
}

export interface BracketRound {
  round: string;
  matches: BracketMatch[];
}
