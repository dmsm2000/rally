export const POST_TYPES = ['outfit', 'material', 'highlight', 'spot', 'other'] as const;
export type PostType = (typeof POST_TYPES)[number];

export interface Post {
  id: string;
  authorId: string;
  text: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  type: PostType | null;
  /** ISO timestamp. */
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
}
