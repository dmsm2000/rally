import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MessagesWidgetComponent } from '../../features/messages/messages-widget/messages-widget.component';
import { NavDrawerComponent } from '../nav-drawer/nav-drawer.component';
import { TopbarComponent } from '../topbar/topbar.component';

// Below this viewport width the topbar auto-hides on scroll (mobile-only behaviour).
const MOBILE_BREAKPOINT_PX = 1024;
// Matches the topbar's h-16 height — the max distance it can slide out of view.
const TOPBAR_HEIGHT_PX = 64;

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

  private lastScrollTop = 0;

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
      this.topbarHideOffset.set(Math.min(TOPBAR_HEIGHT_PX, Math.max(0, this.topbarHideOffset() + delta)));
    }
    this.lastScrollTop = scrollTop;
  }
}
