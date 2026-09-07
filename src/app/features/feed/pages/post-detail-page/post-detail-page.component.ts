import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { RallyDataService } from '../../../../core/data/rally-data.service';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { Post, PostReportReason } from '../../../../core/models';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FeedCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent } from '../../../../shared/ui';
import { PlayersService } from '../../../players/players.service';
import { PostsRepository } from '../../data/posts.repository';

/**
 * The public page behind a shared post link. Deliberately outside the app shell (no topbar, no
 * bottom nav) and outside authGuard: the whole point of sharing is reaching someone who doesn't
 * have Rally yet, and posts are readable by the `anon` role already (0011_posts.sql).
 */
@Component({
  selector: 'rally-post-detail-page',
  imports: [RouterLink, FeedCardComponent, IconComponent, TranslatePipe],
  templateUrl: './post-detail-page.component.html',
  host: { class: 'block' }
})
export class PostDetailPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly repository = inject(PostsRepository);
  private readonly players = inject(PlayersService);
  private readonly data = inject(RallyDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly loading = signal(true);
  protected readonly post = signal<Post | null>(null);

  // Discovery excludes the signed-in player, so someone opening their own shared post would find
  // no author at all — same fallback FeedService.playerById() makes for own posts in the feed.
  protected readonly author = computed(() => {
    const authorId = this.post()?.authorId;
    if (!authorId) {
      return undefined;
    }
    const uid = this.auth.currentUserId();
    return !!uid && authorId === uid ? this.data.me() : this.players.getById(authorId);
  });

  constructor() {
    void this.load();
  }

  // Calls the repository directly rather than going through FeedService: that service starts
  // loading the feed the moment it's injected, which is not something this page should trigger for
  // someone who arrived from a shared link.
  protected async report(post: Post, reason: PostReportReason): Promise<void> {
    const result = await this.repository.report(post.id, reason);
    const key = result === 'ok' ? 'feed.reportThanks' : result === 'already' ? 'feed.alreadyReported' : 'feed.reportFailed';
    if (result === 'failed') {
      this.toast.error(this.translation.t(key));
      return;
    }
    this.toast.success(this.translation.t(key));
  }

  // Same confirm-then-delete shape as FeedService.deletePost(), duplicated rather than shared:
  // that method also drops the row out of the feed's own in-memory list, which has no meaning on
  // a page that shows exactly one post and navigates away once it's gone.
  protected async deletePost(post: Post): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: this.translation.t('feed.deletePostConfirmLead'),
      confirmLabel: this.translation.t('feed.deletePostConfirmButton'),
      cancelLabel: this.translation.t('common.cancel'),
      tone: 'destructive'
    });
    if (!confirmed) {
      return;
    }
    const success = await this.repository.deletePost(post.id, post.mediaUrl);
    if (!success) {
      this.toast.error(this.translation.t('feed.deletePostFailed'));
      return;
    }
    void this.router.navigateByUrl('/');
  }

  private async load(): Promise<void> {
    // The snapshot is enough: this page is only ever entered from outside the app, never navigated
    // to from itself, so the parameter can't change under it.
    const postId = this.route.snapshot.paramMap.get('postId');
    if (!postId) {
      this.loading.set(false);
      return;
    }
    this.post.set(await this.repository.getById(postId));
    this.loading.set(false);
  }
}
