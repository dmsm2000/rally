import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { POST_TYPES, PostType } from '../../../../core/models';
import { TopbarMetricsService } from '../../../../core/services/topbar-metrics.service';
import { FeedCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ChipComponent, DialogComponent, EmptyStateComponent, FabComponent, IconComponent } from '../../../../shared/ui';
import { FeedImageCropComponent } from '../../components/feed-image-crop/feed-image-crop.component';
import { FeedScope } from '../../data/posts.repository';
import { FeedService } from '../../feed.service';

const WELCOME_DISMISSED_KEY = 'rally.feed.welcomeDismissed';

// Below this viewport width the tab bar stays put, mirroring the topbar's own auto-hide behaviour
// (see AppShellComponent's MOBILE_BREAKPOINT_PX).
const MOBILE_BREAKPOINT_PX = 1024;
// This tab bar's own height (48px, h-12): the tab bar sits fixed right below the topbar, so it only
// needs to travel past its own height once the topbar has already scrolled fully out of view above
// it — both are driven by the same raw scroll delta, so they move in lockstep. Added to the topbar's
// real (safe-area-inclusive) height from TopbarMetricsService, not a second hardcoded guess at it.
const TABS_BAR_HEIGHT_PX = 48;
// Below this scroll offset, a live-arriving post is pulled straight into the list instead of
// surfacing the "new posts" banner — the viewer is already looking at the top, so there's nothing
// to interrupt.
const NEAR_TOP_THRESHOLD_PX = 24;

// A touch starting within this many px of the left edge is left alone here — that's
// AppShellComponent's own swipe-to-open-the-drawer gesture (mirror this constant there if either
// changes), and the two must never fight over the same drag.
const EDGE_SWIPE_ZONE_PX = 24;
// How far a horizontal drag has to travel, twice as much as it drifts vertically, to count as a
// deliberate "change tab" swipe rather than an incidental wobble during a vertical scroll.
const TAB_SWIPE_MIN_DISTANCE_PX = 60;

@Component({
  selector: 'rally-feed-page',
  imports: [
    RouterLink,
    FormsModule,
    IconComponent,
    ChipComponent,
    DialogComponent,
    EmptyStateComponent,
    FabComponent,
    FeedCardComponent,
    FeedImageCropComponent,
    TranslatePipe
  ],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss'
})
export class FeedPageComponent implements AfterViewInit, OnDestroy {
  protected readonly feed = inject(FeedService);
  protected readonly auth = inject(AuthService);
  private readonly topbarMetrics = inject(TopbarMetricsService);
  // "World" is the main/default tab, kept in the center — city and country flank it. Observers
  // have no own city/country to filter by, so they only ever get the world tab.
  protected readonly scopes = computed<readonly FeedScope[]>(() => (this.auth.isObserver() ? ['world'] : ['city', 'world', 'country']));
  // "Other" stays a valid PostType (existing posts can carry it, see feed.model.ts) — it's just
  // not offered as a composer choice, since it's a meaningless default next to four real ones.
  protected readonly postTypes: readonly PostType[] = POST_TYPES.filter(type => type !== 'other');
  // Pairs each post type with an emoji, matching how feed cards already tag match/trip/venue
  // posts (🎾/🧳/🛡️) — language-neutral, so unlike everything else here it isn't translated.
  protected readonly postTypeEmoji: Record<PostType, string> = {
    outfit: '👕',
    material: '🎒',
    highlight: '⭐',
    spot: '📍',
    other: '✨'
  };
  // Placeholder rows shown in place of the empty state while the first page of a scope is loading —
  // enough to fill a full viewport (media rows are tall) rather than leaving blank space below them.
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  // Dismissal only needs to last for this browser tab session, not forever — reappears next visit.
  protected readonly welcomeDismissed = signal(sessionStorage.getItem(WELCOME_DISMISSED_KEY) === '1');
  protected readonly tabsHideOffset = signal(0);

  // The welcome card is this scope's empty state, not a permanent header: it only stands in when
  // the scope has nothing of its own to show, which is also why the plain ui-empty-state defers to
  // it (see the template's @empty branch). Observers never get it — they can't post anyway.
  protected readonly showWelcomeHero = computed(
    () => !this.auth.isObserver() && !this.welcomeDismissed() && !this.feed.loading() && this.feed.posts().length === 0
  );

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private mainEl: HTMLElement | null = null;
  private lastScrollTop = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private trackingTabSwipe = false;

  ngAfterViewInit(): void {
    this.mainEl = this.hostRef.nativeElement.closest('main');
    this.mainEl?.addEventListener('scroll', this.onMainScroll, { passive: true });
    this.mainEl?.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.mainEl?.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  ngOnDestroy(): void {
    this.mainEl?.removeEventListener('scroll', this.onMainScroll);
    this.mainEl?.removeEventListener('touchstart', this.onTouchStart);
    this.mainEl?.removeEventListener('touchend', this.onTouchEnd);
  }

  protected dismissWelcome(): void {
    this.welcomeDismissed.set(true);
    sessionStorage.setItem(WELCOME_DISMISSED_KEY, '1');
  }

  protected showNewPosts(): void {
    this.refreshFeed();
  }

  // Switching scope already reloads via FeedService's own effect; re-tapping the already-active
  // tab wouldn't otherwise do anything (setting a signal to its current value is a no-op), so
  // handle that case explicitly with a scroll-to-top + refresh, like re-tapping a home tab.
  protected onScopeClick(s: FeedScope): void {
    if (this.feed.scope() === s) {
      this.refreshFeed();
      return;
    }
    this.feed.setScope(s);
  }

  private refreshFeed(): void {
    this.feed.refreshFeed();
    this.mainEl?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.feed.selectMedia(file);
    }
    input.value = '';
  }

  // Mirrors AppShellComponent.onMainScroll so this tab bar hides/reveals in step with the topbar.
  private readonly onMainScroll = (): void => {
    const scrollTop = this.mainEl?.scrollTop ?? 0;
    this.feed.isNearTop.set(scrollTop <= NEAR_TOP_THRESHOLD_PX);
    if (window.innerWidth >= MOBILE_BREAKPOINT_PX || scrollTop <= 0) {
      this.tabsHideOffset.set(0);
    } else {
      const delta = scrollTop - this.lastScrollTop;
      const tabsTrackMaxPx = this.topbarMetrics.heightPx() + TABS_BAR_HEIGHT_PX;
      this.tabsHideOffset.set(Math.min(tabsTrackMaxPx, Math.max(0, this.tabsHideOffset() + delta)));
    }
    this.lastScrollTop = scrollTop;
  };

  // Swiping over the feed switches scope tab, Twitter-style — but a touch starting near the left
  // edge is left untouched (see EDGE_SWIPE_ZONE_PX) so it can open the nav drawer instead, and the
  // composer sheet gets the same pass so a swipe inside it can't reach through to the tabs behind it.
  private readonly onTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0];
    this.trackingTabSwipe = !!touch && touch.clientX > EDGE_SWIPE_ZONE_PX && !this.feed.composerOpen();
    if (this.trackingTabSwipe) {
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
    }
  };

  private readonly onTouchEnd = (event: TouchEvent): void => {
    if (!this.trackingTabSwipe) {
      return;
    }
    this.trackingTabSwipe = false;
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    if (Math.abs(deltaX) < TAB_SWIPE_MIN_DISTANCE_PX || Math.abs(deltaX) < Math.abs(deltaY) * 2) {
      return;
    }
    const list = this.scopes();
    const nextIndex = list.indexOf(this.feed.scope()) + (deltaX < 0 ? 1 : -1);
    if (nextIndex >= 0 && nextIndex < list.length) {
      this.onScopeClick(list[nextIndex]);
    }
  };
}
