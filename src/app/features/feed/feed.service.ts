import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { RallyDataService } from '../../core/data/rally-data.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { Post, PostType } from '../../core/models';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { PlayersService } from '../players/players.service';
import { FeedScope, PostsRepository } from './data/posts.repository';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly auth = inject(AuthService);
  private readonly repository = inject(PostsRepository);
  private readonly players = inject(PlayersService);
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly data = inject(RallyDataService);

  readonly meId = this.auth.currentUserId;
  // Hero chrome (name/avatar/city/stats) still rides the mock-bridged "me" object — see
  // RallyDataService's high-value gotcha note on why `.id` specifically must not be trusted.
  readonly me = this.data.me;
  readonly heroImage = this.data.heroImage;

  readonly scope = signal<FeedScope>('world');
  private readonly _posts = signal<Post[]>([]);
  readonly posts = this._posts.asReadonly();
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly hasNewPosts = signal(false);
  private page = 0;

  readonly composerOpen = signal(false);
  readonly composerText = signal('');
  readonly composerFile = signal<File | null>(null);
  readonly composerPreviewUrl = signal<string | null>(null);
  readonly composerMediaType = signal<'image' | 'video' | null>(null);
  readonly composerType = signal<PostType | null>(null);
  readonly publishing = signal(false);
  readonly canPublish = computed(() => this.composerText().trim().length > 0 || this.composerFile() !== null);

  private readonly deletingPostIds = signal<Set<string>>(new Set());

  // Re-derives only when city/country actually change value — reloads once real profile data
  // (rather than the mock bridge's defaults) is available, same pattern as WorldService.
  private readonly myLocationKey = computed(() => {
    const me = this.auth.currentPlayer();
    return `${me.country ?? ''}::${me.city ?? ''}`;
  });

  constructor() {
    effect(() => {
      const scope = this.scope();
      this.myLocationKey();
      untracked(() => {
        void this.reload();
        this.hasNewPosts.set(false);
        this.repository.subscribeToPostEvents(scope, {
          onNewPost: () => this.hasNewPosts.set(true),
          onLikeAdded: (postId, userId) => this.applyRemoteLike(postId, userId, true),
          onLikeRemoved: (postId, userId) => this.applyRemoteLike(postId, userId, false),
          onPostDeleted: postId => this._posts.update(list => list.filter(p => p.id !== postId))
        });
      });
    });
  }

  setScope(scope: FeedScope): void {
    this.scope.set(scope);
  }

  /** Pulls the latest page back in and clears the "new posts" flag — the banner and re-tapping the active tab both use this. */
  refreshFeed(): void {
    this.hasNewPosts.set(false);
    void this.reload();
  }

  playerById(id: string) {
    // Discovery excludes the signed-in player (see PlayersRepository), so own posts
    // would otherwise resolve to no player at all — fall back to the mock-bridged "me".
    if (id === this.meId()) {
      return this.me();
    }
    return this.players.getById(id);
  }

  isDeleting(postId: string): boolean {
    return this.deletingPostIds().has(postId);
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.loading()) {
      return;
    }
    this.loading.set(true);
    this.page += 1;
    const { posts, hasMore } = await this.repository.list(this.scope(), this.page);
    this._posts.update(list => [...list, ...posts]);
    this.hasMore.set(hasMore);
    this.loading.set(false);
  }

  openComposer(): void {
    this.composerOpen.set(true);
  }

  closeComposer(): void {
    this.composerOpen.set(false);
    this.composerText.set('');
    this.composerType.set(null);
    this.clearMedia();
  }

  setComposerType(type: PostType): void {
    this.composerType.update(current => (current === type ? null : type));
  }

  attachMedia(file: File): void {
    const isVideo = file.type.startsWith('video/');
    const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > max) {
      this.toast.error(this.translation.t(isVideo ? 'feed.videoTooLarge' : 'feed.imageTooLarge'));
      return;
    }
    this.clearMedia();
    this.composerFile.set(file);
    this.composerMediaType.set(isVideo ? 'video' : 'image');
    this.composerPreviewUrl.set(URL.createObjectURL(file));
  }

  clearMedia(): void {
    const url = this.composerPreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.composerFile.set(null);
    this.composerMediaType.set(null);
    this.composerPreviewUrl.set(null);
  }

  async publishPost(): Promise<void> {
    if (!this.canPublish()) {
      return;
    }
    this.publishing.set(true);
    const success = await this.repository.create({
      text: this.composerText().trim(),
      file: this.composerFile() ?? undefined,
      type: this.composerType()
    });
    this.publishing.set(false);
    if (!success) {
      this.toast.error(this.translation.t('feed.postFailed'));
      return;
    }
    this.closeComposer();
    this.toast.success(this.translation.t('feed.postPublished'));
    void this.reload();
  }

  async toggleLike(post: Post): Promise<void> {
    const nextLiked = !post.likedByMe;
    this.applyLike(post.id, nextLiked);
    const success = await this.repository.toggleLike(post.id, nextLiked);
    if (!success) {
      this.applyLike(post.id, post.likedByMe);
    }
  }

  async deletePost(post: Post): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: this.translation.t('feed.deletePostConfirmLead'),
      confirmLabel: this.translation.t('feed.deletePostConfirmButton'),
      cancelLabel: this.translation.t('feed.cancel'),
      tone: 'destructive'
    });
    if (!confirmed) {
      return;
    }
    this.deletingPostIds.update(ids => new Set(ids).add(post.id));
    const success = await this.repository.deletePost(post.id, post.mediaUrl);
    this.deletingPostIds.update(ids => {
      const next = new Set(ids);
      next.delete(post.id);
      return next;
    });
    if (success) {
      this._posts.update(list => list.filter(p => p.id !== post.id));
    }
  }

  private applyLike(postId: string, liked: boolean): void {
    this._posts.update(list =>
      list.map(p => {
        if (p.id !== postId || p.likedByMe === liked) {
          return p;
        }
        return { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) };
      })
    );
  }

  /** Realtime echo of a like/unlike from any viewer, including our own — see `toggleLike`. */
  private applyRemoteLike(postId: string, userId: string, liked: boolean): void {
    if (userId === this.meId()) {
      // Our own action already applied optimistically by toggleLike(); applyLike()'s
      // likedByMe === liked guard skips this echo so it isn't double-counted.
      this.applyLike(postId, liked);
      return;
    }
    this._posts.update(list =>
      list.map(p => (p.id === postId ? { ...p, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) } : p))
    );
  }

  private async reload(): Promise<void> {
    this.page = 0;
    this.loading.set(true);
    // Clear the previous scope's posts up front so the empty-state skeleton actually shows
    // during the fetch, instead of leaving stale posts on screen until the new ones arrive.
    this._posts.set([]);
    const { posts, hasMore } = await this.repository.list(this.scope(), 0);
    this._posts.set(posts);
    this.hasMore.set(hasMore);
    this.loading.set(false);
  }
}
