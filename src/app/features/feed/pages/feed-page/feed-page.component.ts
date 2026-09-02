import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { POST_TYPES, PostType } from '../../../../core/models';
import { FeedCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AvatarComponent, ChipComponent, EmptyStateComponent, IconComponent, StatComponent } from '../../../../shared/ui';
import { FeedScope } from '../../data/posts.repository';
import { FeedService } from '../../feed.service';

const WELCOME_DISMISSED_KEY = 'rally.feed.welcomeDismissed';

// Below this viewport width the tab bar stays put, mirroring the topbar's own auto-hide behaviour
// (see AppShellComponent's MOBILE_BREAKPOINT_PX).
const MOBILE_BREAKPOINT_PX = 1024;
// Topbar height (64px) + this tab bar's own height (48px, h-12): the tab bar sits fixed right below
// the topbar, so it only needs to travel past its own height once the topbar has already scrolled
// fully out of view above it — both are driven by the same raw scroll delta, so they move in lockstep.
const TABS_TRACK_MAX_PX = 64 + 48;

@Component({
  selector: 'rally-feed-page',
  imports: [
    RouterLink,
    FormsModule,
    StatComponent,
    AvatarComponent,
    IconComponent,
    ChipComponent,
    EmptyStateComponent,
    FeedCardComponent,
    TranslatePipe
  ],
  templateUrl: './feed-page.component.html',
  styleUrl: './feed-page.component.scss'
})
export class FeedPageComponent implements AfterViewInit, OnDestroy {
  protected readonly feed = inject(FeedService);
  protected readonly auth = inject(AuthService);
  // "World" is the main/default tab, kept in the center — city and country flank it. Observers
  // have no own city/country to filter by, so they only ever get the world tab.
  protected readonly scopes = computed<readonly FeedScope[]>(() => (this.auth.isObserver() ? ['world'] : ['city', 'world', 'country']));
  protected readonly postTypes: readonly PostType[] = POST_TYPES;
  // Placeholder rows shown in place of the empty state while the first page of a scope is loading.
  protected readonly skeletonRows = [0, 1, 2];

  // Dismissal only needs to last for this browser tab session, not forever — reappears next visit.
  protected readonly welcomeDismissed = signal(sessionStorage.getItem(WELCOME_DISMISSED_KEY) === '1');
  protected readonly tabsHideOffset = signal(0);

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private mainEl: HTMLElement | null = null;
  private lastScrollTop = 0;

  ngAfterViewInit(): void {
    this.mainEl = this.hostRef.nativeElement.closest('main');
    this.mainEl?.addEventListener('scroll', this.onMainScroll, { passive: true });
  }

  ngOnDestroy(): void {
    this.mainEl?.removeEventListener('scroll', this.onMainScroll);
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
      this.feed.attachMedia(file);
    }
    input.value = '';
  }

  // Mirrors AppShellComponent.onMainScroll so this tab bar hides/reveals in step with the topbar.
  private readonly onMainScroll = (): void => {
    const scrollTop = this.mainEl?.scrollTop ?? 0;
    if (window.innerWidth >= MOBILE_BREAKPOINT_PX || scrollTop <= 0) {
      this.tabsHideOffset.set(0);
    } else {
      const delta = scrollTop - this.lastScrollTop;
      this.tabsHideOffset.set(Math.min(TABS_TRACK_MAX_PX, Math.max(0, this.tabsHideOffset() + delta)));
    }
    this.lastScrollTop = scrollTop;
  };
}
