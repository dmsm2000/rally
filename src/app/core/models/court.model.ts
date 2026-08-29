import { Surface } from './player.model';

export interface Court {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  surface: Surface;
  indoor: boolean;
  courts: number;
  rating: number;
  reviews: number;
  price: string;
  hours: string;
  image: string;
  distanceKm: number;
  facilities: string[];
  playAgain: number;
  coords: { x: number; y: number };
  visited?: boolean;
}

export interface CourtReview {
  name: string;
  initials: string;
  accent: string;
  rating: number;
  text: string;
}
