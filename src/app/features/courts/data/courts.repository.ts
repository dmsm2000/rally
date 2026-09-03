import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { supabase } from '../../../core/auth/supabase.client';
import {
  CapturedCourt,
  CheckInResult,
  Court,
  CourtPhoto,
  CourtReportReason,
  NearbyVenue,
  RegisterResult,
  Surface,
  Venue,
  VenueAccess,
  VenueCandidate,
  VenueKind,
  VenuePost,
  VenueStatus
} from '../../../core/models';
import { GeoFix } from '../../../core/services/geolocation.service';

interface VenueRow {
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

interface CourtRow {
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

interface NearbyVenueRow extends VenueRow {
  distance_m: number;
  court_count: number;
  captured_count: number;
}

interface CourtPhotoRow {
  id: string;
  court_id: string;
  uploaded_by: string | null;
  url: string;
  created_at: string;
}

export interface RegisterCourtInput {
  fix: GeoFix;
  surface: Surface;
  number?: string;
  indoor: boolean;
  lights: boolean;
  /** Set when attaching a court to a venue that already exists; the venue fields are then ignored. */
  venueId?: string;
  venueName?: string;
  venueKind?: VenueKind;
  city?: string;
  country?: string;
  flag?: string;
  access?: VenueAccess | null;
  hours?: string;
  price?: string;
  facilities?: string[];
  /** Set only after the player has seen the duplicate candidates and said "none of these". */
  force?: boolean;
}

/** Every failure the court RPCs can raise, mapped to a translation key by CourtsService. */
export type CourtActionError =
  | 'notAuthenticated'
  | 'gpsAccuracy'
  | 'dailyLimit'
  | 'venueDetails'
  | 'venueNotFound'
  | 'tooFar'
  | 'alreadyRegistered'
  | 'alreadyCaptured'
  | 'cooldown'
  | 'photoLimit'
  | 'unknown';

export class CourtActionFailure extends Error {
  constructor(readonly reason: CourtActionError) {
    super(reason);
    this.name = 'CourtActionFailure';
  }
}

const VENUE_COLUMNS =
  'id,name,kind,city,country,flag,access,hours,price,facilities,lat,lng,status,confirmations,verified_at,created_by,created_at';
const COURT_COLUMNS = 'id,venue_id,number,surface,indoor,lights,capture_count,created_by,created_at';

/** `||`, not `??`: a venue whose country matched no entry in the country dataset stores an empty
 * string rather than null, which a nullish fallback would happily render as no flag at all. */
const flagOr = (flag: string | null): string => flag || '🎾';
// The venue is embedded on every read: a court without its venue has no location, no access rules
// and no name to show, so there is no useful "court alone" query.
const COURT_WITH_VENUE = `${COURT_COLUMNS},venues!inner(${VENUE_COLUMNS}),court_photos(id,court_id,uploaded_by,url,created_at)`;

/**
 * Data-access boundary for the player-maintained court database
 * (see supabase/migrations/0024_venues_and_courts.sql through 0027_court_reports.sql).
 *
 * Reads go through RLS, which only ever exposes 'live' venues plus the viewer's own drafts. Every
 * write goes through a security-definer RPC — there are no insert/update policies on these tables
 * at all, so nothing here can promote a venue, bump a confirmation count or backdate a check-in.
 */
@Injectable({ providedIn: 'root' })
export class CourtsRepository {
  private readonly auth = inject(AuthService);

  private readonly _catalogue = signal<Court[]>([]);
  private readonly _captured = signal<CapturedCourt[]>([]);
  private readonly _loaded = signal(false);
  private readonly _lastRegisteredCourtId = signal<string | null>(null);
  private loadPromise?: Promise<void>;

  /** Every public court, loaded once per session. */
  readonly catalogue = this._catalogue.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  /** Set on every successful registration, so a caller mid-flow can pick the new court up. */
  readonly lastRegisteredCourtId = this._lastRegisteredCourtId.asReadonly();

  /** The viewer's collection: check-ins in confirmed venues, straight from `my_captured_courts()`. */
  readonly captured = this._captured.asReadonly();
  private readonly _capturedIds = computed(() => new Set(this._captured().map(c => c.courtId)));

  private readonly byId = computed(() => new Map(this._catalogue().map(court => [court.id, court])));

  /**
   * Synchronous lookup into the loaded catalogue — the shape match cards, the world map and the
   * profile page already expect. Returns undefined for a court that is still a draft or simply not
   * loaded yet; every caller falls back to the match's own denormalized city/country.
   */
  courtById(id: string | undefined): Court | undefined {
    return id ? this.byId().get(id) : undefined;
  }

  /** Idempotent: concurrent callers share one request, and later calls are no-ops. */
  async ensureCatalogue(): Promise<void> {
    if (this._loaded()) {
      return;
    }
    this.loadPromise ??= this.loadCatalogue();
    return this.loadPromise;
  }

  /** Forces a fresh read — used after registering or capturing, which change what's public. */
  async reload(): Promise<void> {
    this.loadPromise = this.loadCatalogue();
    return this.loadPromise;
  }

  private async loadCatalogue(): Promise<void> {
    const [{ data, error }, captured] = await Promise.all([
      supabase.from('courts').select(COURT_WITH_VENUE).order('created_at', { ascending: false }),
      this.myCapturedCourts()
    ]);
    this._captured.set(captured);
    const capturedIds = new Set(captured.map(c => c.courtId));
    if (error || !data) {
      console.error('Failed to load courts:', error?.message);
      this._catalogue.set([]);
    } else {
      this._catalogue.set((data as unknown as CourtRow[]).map(row => this.toCourt(row, capturedIds)));
    }
    this._loaded.set(true);
  }

  async getCourt(id: string): Promise<Court | null> {
    const { data, error } = await supabase.from('courts').select(COURT_WITH_VENUE).eq('id', id).maybeSingle();
    if (error || !data) {
      if (error) {
        console.error('Failed to load court:', error.message);
      }
      return null;
    }
    return this.toCourt(data as unknown as CourtRow, this._capturedIds());
  }

  /** Every court inside one venue, for the venue's own detail view. */
  async courtsForVenue(venueId: string): Promise<Court[]> {
    const { data, error } = await supabase
      .from('courts')
      .select(COURT_WITH_VENUE)
      .eq('venue_id', venueId)
      .order('created_at', { ascending: true });
    if (error || !data) {
      console.error('Failed to load venue courts:', error?.message);
      return [];
    }
    const captured = this._capturedIds();
    return (data as unknown as CourtRow[]).map(row => this.toCourt(row, captured));
  }

  /**
   * The proximity funnel. Returns live venues *and* drafts (flagged by `status`) around a fix —
   * the only route by which a draft is ever visible to anyone but its author, and therefore the
   * only way one can ever be confirmed. Doubles as the duplicate check before registering.
   */
  async nearbyVenues(fix: GeoFix, radiusM = 3000): Promise<NearbyVenue[]> {
    const { data, error } = await supabase.rpc('nearby_venues', {
      p_lat: fix.lat,
      p_lng: fix.lng,
      p_radius_m: radiusM
    });
    if (error || !data) {
      console.error('Failed to load nearby venues:', error?.message);
      return [];
    }
    return (data as NearbyVenueRow[]).map(row => ({
      ...this.toVenue(row),
      distanceM: row.distance_m,
      courtCount: row.court_count,
      capturedCount: row.captured_count
    }));
  }

  /**
   * Either reports possible duplicates (the caller must show them and ask before retrying with
   * `force`) or creates the court. Search-before-create is enforced server side, not here.
   */
  async registerCourt(input: RegisterCourtInput): Promise<RegisterResult> {
    const { data, error } = await supabase.rpc('register_court', {
      p_lat: input.fix.lat,
      p_lng: input.fix.lng,
      p_accuracy_m: Number.isFinite(input.fix.accuracyM) ? input.fix.accuracyM : null,
      p_surface: input.surface,
      p_venue_id: input.venueId ?? null,
      p_venue_name: input.venueName ?? null,
      p_venue_kind: input.venueKind ?? 'club',
      p_city: input.city ?? null,
      p_country: input.country ?? null,
      p_flag: input.flag ?? null,
      p_access: input.access ?? null,
      p_hours: input.hours ?? null,
      p_price: input.price ?? null,
      p_facilities: input.facilities ?? [],
      p_number: input.number ?? null,
      p_indoor: input.indoor,
      p_lights: input.lights,
      p_force: input.force ?? false
    });
    if (error) {
      throw new CourtActionFailure(this.toFailure(error.message));
    }
    const payload = data as {
      status: 'candidates' | 'created';
      candidates?: { id: string; name: string; city: string; country: string; status: VenueStatus; distance_m: number }[];
      venue_id?: string;
      court_id?: string;
      venue_status?: VenueStatus;
      confirmations?: number;
    };
    if (payload.status === 'candidates') {
      const candidates: VenueCandidate[] = (payload.candidates ?? []).map(c => ({
        id: c.id,
        name: c.name,
        city: c.city,
        country: c.country,
        status: c.status,
        distanceM: c.distance_m
      }));
      return { status: 'candidates', candidates };
    }
    this._lastRegisteredCourtId.set(payload.court_id!);
    return {
      status: 'created',
      venueId: payload.venue_id!,
      courtId: payload.court_id!,
      venueStatus: payload.venue_status ?? 'draft',
      confirmations: payload.confirmations ?? 0
    };
  }

  /** Captures a court, and corroborates its venue when the fix is accurate and it's a first visit. */
  async checkIn(courtId: string, fix: GeoFix): Promise<CheckInResult> {
    const { data, error } = await supabase.rpc('check_in_court', {
      p_court_id: courtId,
      p_lat: fix.lat,
      p_lng: fix.lng,
      p_accuracy_m: Number.isFinite(fix.accuracyM) ? fix.accuracyM : null
    });
    if (error) {
      throw new CourtActionFailure(this.toFailure(error.message));
    }
    const payload = data as {
      venue_id: string;
      venue_status: VenueStatus;
      confirmations: number;
      just_verified: boolean;
      discovered_by: string | null;
      venue_name: string;
      city: string;
      country: string;
    };
    return {
      venueId: payload.venue_id,
      venueStatus: payload.venue_status,
      confirmations: payload.confirmations,
      justVerified: payload.just_verified,
      discoveredBy: payload.discovered_by ?? undefined,
      venueName: payload.venue_name,
      city: payload.city,
      country: payload.country
    };
  }

  async updateVenue(
    venueId: string,
    input: { name: string; kind: VenueKind; access?: VenueAccess | null; hours?: string; price?: string; facilities: string[] }
  ): Promise<boolean> {
    const { error } = await supabase.rpc('update_venue', {
      p_venue_id: venueId,
      p_name: input.name,
      p_kind: input.kind,
      p_access: input.access ?? null,
      p_hours: input.hours ?? null,
      p_price: input.price ?? null,
      p_facilities: input.facilities
    });
    if (error) {
      console.error('Failed to update venue:', error.message);
      return false;
    }
    return true;
  }

  async updateCourt(
    courtId: string,
    input: { number?: string; surface: Surface; indoor: boolean; lights: boolean }
  ): Promise<boolean> {
    const { error } = await supabase.rpc('update_court', {
      p_court_id: courtId,
      p_number: input.number ?? null,
      p_surface: input.surface,
      p_indoor: input.indoor,
      p_lights: input.lights
    });
    if (error) {
      console.error('Failed to update court:', error.message);
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Photos (max 3 per court, capped by a trigger — see 0026_court_photos.sql)
  // ---------------------------------------------------------------------------

  async photosFor(courtId: string): Promise<CourtPhoto[]> {
    const { data, error } = await supabase
      .from('court_photos')
      .select('id,court_id,uploaded_by,url,created_at')
      .eq('court_id', courtId)
      .order('created_at', { ascending: true });
    if (error || !data) {
      console.error('Failed to load court photos:', error?.message);
      return [];
    }
    return (data as CourtPhotoRow[]).map(row => this.toPhoto(row));
  }

  /** Uploads to the `court-photos` bucket first, then inserts the row — mirrors PostsRepository.create(). */
  async addPhoto(courtId: string, file: File): Promise<CourtPhoto | null> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return null;
    }
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('court-photos').upload(path, file);
    if (uploadError) {
      console.error('Failed to upload court photo:', uploadError.message);
      return null;
    }
    const url = supabase.storage.from('court-photos').getPublicUrl(path).data.publicUrl;
    const { data, error } = await supabase
      .from('court_photos')
      .insert({ court_id: courtId, uploaded_by: uid, url })
      .select('id,court_id,uploaded_by,url,created_at')
      .single();
    if (error || !data) {
      // The row was rejected (most likely the 3-photo cap), so don't leave the object orphaned.
      await supabase.storage.from('court-photos').remove([path]);
      throw new CourtActionFailure(this.toFailure(error?.message ?? ''));
    }
    return this.toPhoto(data as CourtPhotoRow);
  }

  async removePhoto(photo: CourtPhoto): Promise<boolean> {
    const { error } = await supabase.from('court_photos').delete().eq('id', photo.id);
    if (error) {
      console.error('Failed to remove court photo:', error.message);
      return false;
    }
    const path = this.extractStoragePath(photo.url);
    if (path) {
      await supabase.storage.from('court-photos').remove([path]);
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Reports and captures
  // ---------------------------------------------------------------------------

  async report(courtId: string, reason: CourtReportReason, note?: string): Promise<boolean> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return false;
    }
    const { error } = await supabase
      .from('court_reports')
      .insert({ court_id: courtId, reporter_id: uid, reason, note: note?.trim() || null });
    if (error) {
      console.error('Failed to report court:', error.message);
      return false;
    }
    return true;
  }

  async reportedCourtIds(): Promise<Set<string>> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return new Set();
    }
    const { data, error } = await supabase.from('court_reports').select('court_id').eq('reporter_id', uid);
    if (error || !data) {
      return new Set();
    }
    return new Set(data.map(row => row.court_id as string));
  }

  /** The viewer's collection — derived from check-ins, and only counting verified venues. */
  async myCapturedCourts(): Promise<CapturedCourt[]> {
    if (!this.auth.currentUserId()) {
      return [];
    }
    const { data, error } = await supabase.rpc('my_captured_courts');
    if (error || !data) {
      console.error('Failed to load captured courts:', error?.message);
      return [];
    }
    return (
      data as {
        court_id: string;
        venue_id: string;
        venue_name: string;
        city: string;
        country: string;
        flag: string | null;
        number: string | null;
        surface: Surface;
        indoor: boolean;
        captured_at: string;
      }[]
    ).map(row => ({
      courtId: row.court_id,
      venueId: row.venue_id,
      venueName: row.venue_name,
      city: row.city,
      country: row.country,
      flag: flagOr(row.flag),
      number: row.number ?? undefined,
      surface: row.surface,
      indoor: row.indoor,
      capturedAt: row.captured_at
    }));
  }

  // ---------------------------------------------------------------------------
  // Feed hydration
  // ---------------------------------------------------------------------------

  /** Live venue ids at a location — powers the feed's location-based visibility, like trips/matches. */
  async venueIdsForLocation(country: string, city?: string): Promise<string[]> {
    let query = supabase.from('venues').select('id').eq('country', country).eq('status', 'live');
    if (city) {
      query = query.eq('city', city);
    }
    const { data, error } = await query;
    if (error || !data) {
      console.error('Failed to load venue ids:', error?.message);
      return [];
    }
    return data.map(row => row.id as string);
  }

  /** Batch fetch for feed hydration — mirrors TripsRepository.getByIds()/MatchesRepository.getByIds(). */
  async venueSummaries(ids: string[]): Promise<VenuePost[]> {
    if (ids.length === 0) {
      return [];
    }
    const { data, error } = await supabase.from('venues').select(`${VENUE_COLUMNS},courts(id)`).in('id', ids);
    if (error || !data) {
      console.error('Failed to load venues by id:', error?.message);
      return [];
    }
    const captured = this._capturedIds();
    return (data as unknown as (VenueRow & { courts: { id: string }[] | null })[]).map(row => {
      const courts = row.courts ?? [];
      return {
        venueId: row.id,
        // Any court in the venue works as the card's destination — the detail page renders the
        // whole place anyway, and a venue has no route of its own.
        courtId: courts[0]?.id,
        name: row.name,
        kind: row.kind,
        city: row.city,
        country: row.country,
        flag: flagOr(row.flag),
        courtCount: courts.length,
        capturedByMe: courts.some(court => captured.has(court.id))
      };
    });
  }

  // ---------------------------------------------------------------------------

  private toVenue(row: VenueRow): Venue {
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

  private toPhoto(row: CourtPhotoRow): CourtPhoto {
    return {
      id: row.id,
      courtId: row.court_id,
      uploadedBy: row.uploaded_by ?? undefined,
      url: row.url,
      createdAt: row.created_at
    };
  }

  private toCourt(row: CourtRow, captured: Set<string>): Court {
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
      venue: this.toVenue(row.venues),
      capturedByMe: captured.has(row.id),
      photos: (row.court_photos ?? [])
        .map(photo => this.toPhoto(photo))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    };
  }

  /** The RPCs raise plain-text exceptions; this is the single place that turns them into a reason. */
  private toFailure(message: string): CourtActionError {
    if (message.includes('not authenticated')) return 'notAuthenticated';
    if (message.includes('gps accuracy too low') || message.includes('location required')) return 'gpsAccuracy';
    if (message.includes('daily limit reached')) return 'dailyLimit';
    if (message.includes('venue details required')) return 'venueDetails';
    if (message.includes('venue not found') || message.includes('court not found')) return 'venueNotFound';
    if (message.includes('too far')) return 'tooFar';
    if (message.includes('court already registered')) return 'alreadyRegistered';
    if (message.includes('already captured')) return 'alreadyCaptured';
    if (message.includes('venue cooldown')) return 'cooldown';
    if (message.includes('court photo limit reached')) return 'photoLimit';
    return 'unknown';
  }

  private extractStoragePath(url: string): string | null {
    const marker = '/court-photos/';
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  }
}
