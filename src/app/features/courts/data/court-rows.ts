import { Court, CourtPhoto, Surface, Venue, VenueAccess, VenueKind, VenueStatus } from '../../../core/models';

/**
 * The shape the court tables actually come back in, and the mapping from it to the domain models.
 *
 * Split out of CourtsRepository so the queries there read as queries: the snake_case row types and
 * the field-by-field translation are the noisiest part of the file and the part least likely to
 * change when a query does.
 */
export interface VenueRow {
  id: string;
  name: string;
  kind: VenueKind;
  city: string;
  country: string;
  flag: string | null;
  access: VenueAccess | null;
  hours: string | null;
  price: string | null;
  facilities: string[] | null;
  lat: number;
  lng: number;
  status: VenueStatus;
  confirmations: number;
  verified_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CourtRow {
  id: string;
  venue_id: string;
  number: string | null;
  surface: Surface;
  indoor: boolean;
  lights: boolean;
  capture_count: number;
  created_by: string | null;
  created_at: string;
  venues: VenueRow;
  court_photos?: CourtPhotoRow[] | null;
}

export interface NearbyVenueRow extends VenueRow {
  distance_m: number;
  court_count: number;
  captured_count: number;
}

export interface CourtPhotoRow {
  id: string;
  court_id: string;
  uploaded_by: string | null;
  url: string;
  created_at: string;
}

export const VENUE_COLUMNS =
  'id,name,kind,city,country,flag,access,hours,price,facilities,lat,lng,status,confirmations,verified_at,created_by,created_at';
export const COURT_COLUMNS = 'id,venue_id,number,surface,indoor,lights,capture_count,created_by,created_at';
// The venue is embedded on every read: a court without its venue has no location, no access rules
// and no name to show, so there is no useful "court alone" query.
export const COURT_WITH_VENUE = `${COURT_COLUMNS},venues!inner(${VENUE_COLUMNS}),court_photos(id,court_id,uploaded_by,url,created_at)`;

/** `||`, not `??`: a venue whose country matched no entry in the country dataset stores an empty
 * string rather than null, which a nullish fallback would happily render as no flag at all. */
export const flagOr = (flag: string | null): string => flag || '🎾';

export function toVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    city: row.city,
    country: row.country,
    flag: flagOr(row.flag),
    access: row.access ?? undefined,
    hours: row.hours ?? undefined,
    price: row.price ?? undefined,
    facilities: row.facilities ?? [],
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    confirmations: row.confirmations,
    verifiedAt: row.verified_at ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at
  };
}

export function toPhoto(row: CourtPhotoRow): CourtPhoto {
  return {
    id: row.id,
    courtId: row.court_id,
    uploadedBy: row.uploaded_by ?? undefined,
    url: row.url,
    createdAt: row.created_at
  };
}

export function toCourt(row: CourtRow, captured: Set<string>): Court {
  return {
    id: row.id,
    venueId: row.venue_id,
    number: row.number ?? undefined,
    surface: row.surface,
    indoor: row.indoor,
    lights: row.lights,
    captureCount: row.capture_count,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    venue: toVenue(row.venues),
    capturedByMe: captured.has(row.id),
    photos: (row.court_photos ?? []).map(toPhoto).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  };
}
