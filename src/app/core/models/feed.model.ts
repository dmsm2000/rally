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

export interface Post {
  id: string;
  authorId: string;
  text: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  type: PostType | null;
  trip: TripPost | null;
  /** ISO timestamp. */
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
}
