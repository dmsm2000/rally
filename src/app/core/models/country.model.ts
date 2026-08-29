export interface CountryEntry {
  name: string;
  flag: string;
  courts: number;
  visited: boolean;
  firstPlayed?: string;
  coords: { x: number; y: number };
}

export interface Destination {
  id: string;
  city: string;
  country: string;
  flag: string;
  players: number;
  courts: number;
  tournaments: number;
  image: string;
  coords: { x: number; y: number };
  note: string;
}

export interface RankingEntry {
  rank: number;
  player: string;
  points: number;
  trend: string;
}
