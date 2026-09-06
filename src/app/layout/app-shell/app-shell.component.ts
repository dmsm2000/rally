import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TopbarMetricsService } from '../../core/services/topbar-metrics.service';
import { MessagesWidgetComponent } from '../../features/messages/messages-widget/messages-widget.component';
import { NavDrawerComponent } from '../nav-drawer/nav-drawer.component';
import { TopbarComponent } from '../topbar/topbar.component';

// Below this viewport width the topbar auto-hides on scroll (mobile-only behaviour).
const MOBILE_BREAKPOINT_PX = 1024;
// A touch starting within this many px of the left edge, dragged at least this far right, opens
// the drawer — mirrored by feed-page.component.ts's own tab-swipe gesture, which explicitly
// ignores touches starting inside this same zone so the two never fight over the same drag.
const EDGE_SWIPE_ZONE_PX = 24;
const EDGE_SWIPE_OPEN_DISTANCE_PX = 60;

@Component({
  selector: 'rally-shell',
  imports: [RouterOutlet, TopbarComponent, NavDrawerComponent, MessagesWidgetComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly topbarHideOffset = signal(0);
  protected readonly drawerOpen = signal(false);

  private readonly topbarMetrics = inject(TopbarMetricsService);
  private lastScrollTop = 0;
  private edgeSwipeStartX = 0;
  private edgeSwipeStartY = 0;
  private trackingEdgeSwipe = false;

  protected toggleDrawer(): void {
    // The drawer hangs below the topbar, so the topbar has to be back on screen for the hamburger
    // that closes it to be reachable.
    this.topbarHideOffset.set(0);
    this.drawerOpen.update(open => !open);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  // Tracks the topbar 1:1 with scroll delta so it slides off/on screen with the gesture (mobile only).
  protected onMainScroll(event: Event): void {
    const scrollTop = (event.target as HTMLElement).scrollTop;
    if (window.innerWidth >= MOBILE_BREAKPOINT_PX || scrollTop <= 0) {
      this.topbarHideOffset.set(0);
    } else {
      const delta = scrollTop - this.lastScrollTop;
      this.topbarHideOffset.set(Math.min(this.topbarMetrics.heightPx(), Math.max(0, this.topbarHideOffset() + delta)));
    }
    this.lastScrollTop = scrollTop;
  }

  // Swipe-to-open, Gmail/Twitter-style — only armed below the breakpoint where the drawer itself
  // exists (it's `lg:hidden`), and only for a touch starting right at the edge.
  protected onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.trackingEdgeSwipe =
      !!touch && touch.clientX <= EDGE_SWIPE_ZONE_PX && window.innerWidth < MOBILE_BREAKPOINT_PX && !this.drawerOpen();
    if (this.trackingEdgeSwipe) {
      this.edgeSwipeStartX = touch.clientX;
      this.edgeSwipeStartY = touch.clientY;
    }
  }

  protected onTouchEnd(event: TouchEvent): void {
    if (!this.trackingEdgeSwipe) {
      return;
    }
    this.trackingEdgeSwipe = false;
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    const deltaX = touch.clientX - this.edgeSwipeStartX;
    const deltaY = touch.clientY - this.edgeSwipeStartY;
    if (deltaX > EDGE_SWIPE_OPEN_DISTANCE_PX && deltaX > Math.abs(deltaY)) {
      this.topbarHideOffset.set(0);
      this.drawerOpen.set(true);
    }
  }
}
