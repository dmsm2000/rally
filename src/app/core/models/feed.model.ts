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
  joinedByMe: boolean;
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
  /** ISO timestamp. */
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
}
