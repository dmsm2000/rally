import { Surface } from './player.model';

/**
 * A place with courts: a club, a municipal complex, a park, a hotel, a condo. Geography lives here
 * rather than on the court because no GPS fix distinguishes court 3 from court 4 — and because the
 * duplicate check only makes sense at this level (see supabase/migrations/0024_venues_and_courts.sql).
 */
export type VenueKind = 'club' | 'public' | 'hotel' | 'condo' | 'other';
export type VenueAccess = 'free' | 'paid' | 'members' | 'guest';
/** 'draft' until two distinct players have confirmed it on the spot; only 'live' venues are public. */
export type VenueStatus = 'draft' | 'live';

export const VENUE_KINDS: VenueKind[] = ['club', 'public', 'hotel', 'condo', 'other'];
export const VENUE_ACCESS_OPTIONS: VenueAccess[] = ['free', 'paid', 'members', 'guest'];
/** Fixed list rather than free text, so facilities stay filterable. */
export const COURT_FACILITIES = ['showers', 'lights', 'parking', 'bar', 'rackets', 'shop', 'wheelchair'] as const;
export type CourtFacility = (typeof COURT_FACILITIES)[number];

export interface Venue {
  id: string;
  name: string;
  kind: VenueKind;
  city: string;
  country: string;
  flag: string;
  access?: VenueAccess;
  hours?: string;
  price?: string;
  facilities: string[];
  lat: number;
  lng: number;
  status: VenueStatus;
  /** Distinct players who confirmed this venue on site; 2 promotes it to 'live'. */
  confirmations: number;
  verifiedAt?: string;
  createdBy?: string;
  createdAt: string;
}

/** A venue as returned by the proximity RPC — the only route by which a draft is ever visible. */
export interface NearbyVenue extends Venue {
  distanceM: number;
  courtCount: number;
  /** How many of this venue's courts the viewer has already captured. */
  capturedCount: number;
}

/** A single playing surface inside a venue. Always loaded with its venue joined. */
export interface Court {
  id: string;
  venueId: string;
  /** Free text — "3", "Central" and "Court B" are all real court names. */
  number?: string;
  surface: Surface;
  indoor: boolean;
  lights: boolean;
  /** Distinct players who have captured it. */
  captureCount: number;
  createdBy?: string;
  createdAt: string;
  venue: Venue;
  capturedByMe?: boolean;
  photos?: CourtPhoto[];
}

export interface CourtPhoto {
  id: string;
  courtId: string;
  uploadedBy?: string;
  url: string;
  createdAt: string;
}

/** One entry of the viewer's collection — see the my_captured_courts() RPC. */
export interface CapturedCourt {
  courtId: string;
  venueId: string;
  venueName: string;
  city: string;
  country: string;
  flag: string;
  number?: string;
  surface: Surface;
  indoor: boolean;
  capturedAt: string;
}

/** A possible duplicate the register RPC found before inserting anything. */
export interface VenueCandidate {
  id: string;
  name: string;
  city: string;
  country: string;
  status: VenueStatus;
  distanceM: number;
}

export type RegisterResult =
  | { status: 'candidates'; candidates: VenueCandidate[] }
  | { status: 'created'; venueId: string; courtId: string; venueStatus: VenueStatus; confirmations: number };

export interface CheckInResult {
  venueId: string;
  venueStatus: VenueStatus;
  confirmations: number;
  /** True on the check-in that promoted the venue to 'live' — what the feed post and notifications key off. */
  justVerified: boolean;
  discoveredBy?: string;
  venueName: string;
  city: string;
  country: string;
}

export const COURT_REPORT_REASONS = ['no_longer_exists', 'duplicate', 'wrong_details', 'not_a_court', 'other'] as const;
export type CourtReportReason = (typeof COURT_REPORT_REASONS)[number];

/**
 * Projects real coordinates onto the stylised world map's 0-100 percentage grid (equirectangular).
 * The map stays an abstract silhouette — it just stops inventing where things are.
 */
export function mapCoordsFor(lat: number, lng: number): { x: number; y: number } {
  return { x: ((lng + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 };
}

/** Human label for a court inside its venue: "Clube do Porto · Campo 3". */
export function courtLabel(court: Court): string {
  return court.number ? `${court.venue.name} · ${court.number}` : court.venue.name;
}
