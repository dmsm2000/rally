export type Surface = 'Clay' | 'Hard' | 'Grass' | 'Carpet';
export type Level = 'Beginner' | 'Improver' | 'Intermediate' | 'Advanced' | 'Competitive';
export type Format = 'Singles' | 'Doubles' | 'Both';
export type Accent = 'lime' | 'clay' | 'cobalt' | 'ink';

export interface PlayerStats {
  wins: number;
  matches: number;
  courts: number;
  countries: number;
}

export interface Player {
  id: string;
  name: string;
  initials: string;
  city: string;
  country: string;
  flag: string;
  level: Level;
  years: number;
  frequency: string;
  format: Format;
  surface: Surface;
  availability: string[];
  distanceKm: number;
  matchScore: number;
  matchReason: string;
  bio: string;
  stats: PlayerStats;
  accent: Accent;
  /** DiceBear generation inputs; the same seed + style always renders the same avatar. */
  avatarSeed?: string;
  avatarStyle?: string;
  /** Extra questions collected at registration, editable later from the profile. */
  age?: number;
  dominantHand?: string;
  backhand?: string;
  playStyle?: string;
  courtPref?: string;
  coached?: boolean;
  coachedFrequency?: string;
  timesOfDay?: string[];
  maxDistanceKm?: number;
}

export interface PlayerIntent {
  id: string;
  playerId: string;
  text: string;
  time: string;
}
