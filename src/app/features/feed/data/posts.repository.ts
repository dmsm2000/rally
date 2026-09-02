import { Injectable, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth/auth.service';
import { supabase } from '../../../core/auth/supabase.client';
import { Post, PostType } from '../../../core/models';
import { PlayersRepository } from '../../players/data/players.repository';

export type FeedScope = 'city' | 'country' | 'world';

const PAGE_SIZE = 20;
const UNIQUE_VIOLATION = '23505';

interface PostRow {
  id: string;
  author_id: string;
  text: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  type: PostType | null;
  created_at: string;
}

interface PostLikeRow {
  post_id: string;
  user_id: string;
}

export interface PostEventHandlers {
  /** Another player published a post that matches the current viewer's scope. */
  onNewPost: () => void;
  onLikeAdded: (postId: string, userId: string) => void;
  onLikeRemoved: (postId: string, userId: string) => void;
  onPostDeleted: (postId: string) => void;
}

/** Data-access boundary for real feed posts (see supabase/migrations/0010_posts.sql). */
@Injectable({ providedIn: 'root' })
export class PostsRepository {
  private readonly auth = inject(AuthService);
  private readonly players = inject(PlayersRepository);

  private realtimeChannel?: RealtimeChannel;

  /**
   * Keeps the feed live: new posts (scope-matched, see `matchesScope`), likes/unlikes, and
   * deletions from other viewers. Requires `public.posts` and `public.post_likes` in the
   * `supabase_realtime` publication — see migrations 0013 and 0014. Replaces any previous
   * subscription, so callers can call this again on every scope change without tearing down
   * manually.
   */
  subscribeToPostEvents(scope: FeedScope, handlers: PostEventHandlers): void {
    this.unsubscribeFromPostEvents();
    const uid = this.auth.currentUserId();
    this.realtimeChannel = supabase
      .channel('posts-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        const row = payload.new as PostRow;
        if (row.author_id !== uid && this.matchesScope(scope, row.author_id)) {
          handlers.onNewPost();
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, payload => {
        handlers.onPostDeleted((payload.old as { id: string }).id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_likes' }, payload => {
        const row = payload.new as PostLikeRow;
        handlers.onLikeAdded(row.post_id, row.user_id);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'post_likes' }, payload => {
        const row = payload.old as PostLikeRow;
        handlers.onLikeRemoved(row.post_id, row.user_id);
      })
      .subscribe();
  }

  unsubscribeFromPostEvents(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
    }
  }

  async list(scope: FeedScope, page: number): Promise<{ posts: Post[]; hasMore: boolean }> {
    const uid = this.auth.currentUserId();
    let query = supabase
      .from('posts')
      .select('id,author_id,text,media_url,media_type,type,created_at')
      .order('created_at', { ascending: false });

    if (scope !== 'world') {
      const me = this.auth.currentPlayer();
      const authorIds = this.authorIdsInScope(scope, me.country, me.city, uid);
      if (authorIds.length === 0) {
        return { posts: [], hasMore: false };
      }
      query = query.in('author_id', authorIds);
    }

    const from = page * PAGE_SIZE;
    // Fetch one extra row so we know whether another page exists without a separate count query.
    const { data, error } = await query.range(from, from + PAGE_SIZE);
    if (error || !data) {
      console.error('Failed to load posts:', error?.message);
      return { posts: [], hasMore: false };
    }
    const hasMore = data.length > PAGE_SIZE;
    const posts = await this.hydrate((data as PostRow[]).slice(0, PAGE_SIZE), uid);
    return { posts, hasMore };
  }

  /** Uploads the optional file to the `feed-media` bucket first, then inserts the post row. */
  async create(input: { text: string; file?: File; type?: PostType | null }): Promise<boolean> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return false;
    }
    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'video' | null = null;
    if (input.file) {
      mediaType = input.file.type.startsWith('video/') ? 'video' : 'image';
      const ext = input.file.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('feed-media').upload(path, input.file);
      if (uploadError) {
        console.error('Failed to upload media:', uploadError.message);
        return false;
      }
      mediaUrl = supabase.storage.from('feed-media').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase
      .from('posts')
      .insert({ author_id: uid, text: input.text, media_url: mediaUrl, media_type: mediaType, type: input.type ?? null });
    if (error) {
      console.error('Failed to publish post:', error.message);
      return false;
    }
    return true;
  }

  async toggleLike(postId: string, liked: boolean): Promise<boolean> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return false;
    }
    if (liked) {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: uid });
      if (error && error.code !== UNIQUE_VIOLATION) {
        console.error('Failed to like post:', error.message);
        return false;
      }
      return true;
    }
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', uid);
    if (error) {
      console.error('Failed to unlike post:', error.message);
      return false;
    }
    return true;
  }

  /** Also removes the uploaded file from Storage so media doesn't orphan in the bucket. */
  async deletePost(postId: string, mediaUrl: string | null): Promise<boolean> {
    if (mediaUrl) {
      const path = this.extractStoragePath(mediaUrl);
      if (path) {
        const { error } = await supabase.storage.from('feed-media').remove([path]);
        if (error) {
          console.error('Failed to remove post media:', error.message);
        }
      }
    }
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) {
      console.error('Failed to delete post:', error.message);
      return false;
    }
    return true;
  }

  private matchesScope(scope: FeedScope, authorId: string): boolean {
    if (scope === 'world') {
      return true;
    }
    const me = this.auth.currentPlayer();
    return this.players
      .getAll()
      .some(p => p.id === authorId && (scope === 'country' ? p.country === me.country : p.country === me.country && p.city === me.city));
  }

  private authorIdsInScope(scope: FeedScope, country: string | undefined, city: string | undefined, uid: string | undefined): string[] {
    const others = this.players
      .getAll()
      .filter(p => (scope === 'country' ? p.country === country : p.country === country && p.city === city));
    const ids = others.map(p => p.id);
    if (uid) {
      ids.push(uid);
    }
    return ids;
  }

  private async hydrate(rows: PostRow[], uid: string | undefined): Promise<Post[]> {
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map(r => r.id);
    const { data: likeRows, error } = await supabase.from('post_likes').select('post_id,user_id').in('post_id', ids);
    if (error) {
      console.error('Failed to load post likes:', error.message);
    }
    const countByPost = new Map<string, number>();
    const likedByMe = new Set<string>();
    for (const row of likeRows ?? []) {
      countByPost.set(row.post_id, (countByPost.get(row.post_id) ?? 0) + 1);
      if (uid && row.user_id === uid) {
        likedByMe.add(row.post_id);
      }
    }
    return rows.map(row => ({
      id: row.id,
      authorId: row.author_id,
      text: row.text,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      type: row.type,
      createdAt: row.created_at,
      likeCount: countByPost.get(row.id) ?? 0,
      likedByMe: likedByMe.has(row.id)
    }));
  }

  private extractStoragePath(url: string): string | null {
    const marker = '/feed-media/';
    const idx = url.indexOf(marker);
    return idx === -1 ? null : url.slice(idx + marker.length);
  }
}
