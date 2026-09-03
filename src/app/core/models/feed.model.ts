export const POST_TYPES = ['outfit', 'material', 'highlight', 'spot', 'other'] as const;
export type PostType = (typeof POST_TYPES)[number];

/** Present only on the automatic post a trip intent gets — see TripsRepository.publish(). */
export interface TripPost {
  intentId: string;
  destinationCountry: string;
  destinationCity: string;
  /** ISO date (YYYY-MM-DD). */
  fromDate: string;
  /** ISO date (YYYY-MM-DD). */
  toDate: string;
  note: string;
  volunteeredByMe: boolean;
}

/** Present only on the automatic post an open match gets — see MatchesRepository.createOpenMatch(). */
export interface MatchPost {
  matchId: string;
  status: 'open' | 'upcoming' | 'cancelled' | 'complete';
  format: string;
  sessionType?: string;
  city: string;
  country: string;
  radiusKm?: number;
  courtId?: string;
  /** ISO date (YYYY-MM-DD). */
  matchDate: string;
  matchTime: string;
  matchTimeEnd?: string;
  durationMinutes?: number;
  note?: string;
  playerB?: string;
  /** True if the viewer is player_b (Singles) or already on the roster (Doubles). */
  joinedByMe: boolean;
  /** Roster size out of 4, format 'Doubles' only — see PostsRepository's post-hydration mapping. */
  participantCount?: number;
  /** Full joined roster, in join order, format 'Doubles' only — powers the feed card's join/leave button and avatar row. */
  participantIds?: string[];
}

/**
 * Present only on the announcement a venue gets when it is verified — written by check_in_court()
 * itself (see 0025_posts_venue_link.sql), never by a client, because the person who triggers it is
 * the confirmer while the author is the discoverer.
 */
export interface VenuePost {
  venueId: string;
  /** A court inside the venue, so the card has somewhere real to link to. */
  courtId?: string;
  name: string;
  kind: string;
  city: string;
  country: string;
  flag: string;
  courtCount: number;
  capturedByMe: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  text: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  type: PostType | null;
  trip: TripPost | null;
  match: MatchPost | null;
  venue: VenuePost | null;
  /** ISO timestamp. */
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
}
