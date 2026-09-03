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

export interface TripIntent {
  id: string;
  playerId: string;
  destinationCountry: string;
  destinationCity: string;
  /** ISO date (YYYY-MM-DD). */
  fromDate: string;
  toDate: string;
  note: string;
  createdAt: string;
}
