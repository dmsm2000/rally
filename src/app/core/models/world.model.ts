export interface CommunityStats {
  courtsCaptured: number;
  countriesUnlocked: number;
  activePlayers: number;
  matchesThisWeek: number;
}

export type WorldActivityKind = 'capture' | 'challenge' | 'match' | 'trip';

export interface WorldActivityItem {
  id: string;
  city: string;
  flag: string;
  kind: WorldActivityKind;
  text: string;
  time: string;
  coords: { x: number; y: number };
}

export type TripIntentStatus = 'open' | 'matched';

export interface TripIntent {
  id: string;
  playerId: string;
  destinationId: string;
  fromDate: string;
  toDate: string;
  note: string;
  status: TripIntentStatus;
}
