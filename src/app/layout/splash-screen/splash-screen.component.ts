import { Location } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

// How long the ball keeps hopping before the logo settles in, and how long the whole splash stays up after that.
const FADE_START_MS = 2500;
const REMOVE_MS = 3000;

// Session-scoped, like the feed's welcome post dismissal — plays once per browser tab session,
// then again next time the app is opened fresh.
const SPLASH_SHOWN_KEY = 'rally.splashShown';

// Pre-authentication routes render their own screen — the brand intro would only get in the way there.
const HIDDEN_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

const COURT_PHOTOS = [
  'assets/court-clay.jpg',
  'assets/court-grass.jpg',
  'assets/court-hard.jpg',
  'assets/court-indoor.jpg',
  'assets/court-urban.jpg'
];

/**
 * Brand intro: a ball bouncing across a random court photo to draw the Rally logo.
 * Only shown for an already-authenticated (or observer) session landing outside the
 * pre-authentication routes, or right after login/register completes and routes away
 * from those pages (since the root component never remounts on SPA navigation, we
 * replay it manually here) — and only once per browser tab session either way.
 */
@Component({
  selector: 'rally-splash-screen',
  templateUrl: './splash-screen.component.html',
  styleUrl: './splash-screen.component.scss'
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  protected readonly visible = signal(false);
  protected readonly fading = signal(false);
  protected readonly photoSrc = COURT_PHOTOS[Math.floor(Math.random() * COURT_PHOTOS.length)];

  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  private fadeTimer?: ReturnType<typeof setTimeout>;
  private removeTimer?: ReturnType<typeof setTimeout>;
  private wasOnHiddenRoute = false;

  async ngOnInit(): Promise<void> {
    await this.auth.whenReady();

    // Location.path() strips the app's base href (e.g. GitHub Pages' /rally/), unlike window.location.pathname.
    this.wasOnHiddenRoute = HIDDEN_PATHS.some(path => this.location.path().startsWith(path));
    if (!this.wasOnHiddenRoute && this.auth.isAuthenticated() && this.shouldPlay()) {
      this.play();
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        const onHiddenRoute = HIDDEN_PATHS.some(path => event.urlAfterRedirects.startsWith(path));
        if (this.wasOnHiddenRoute && !onHiddenRoute && this.auth.isAuthenticated() && this.shouldPlay()) {
          this.play();
        }
        this.wasOnHiddenRoute = onHiddenRoute;
      });
  }

  ngOnDestroy(): void {
    this.lockBodyScroll(false);
  }

  private shouldPlay(): boolean {
    return sessionStorage.getItem(SPLASH_SHOWN_KEY) !== '1';
  }

  private play(): void {
    sessionStorage.setItem(SPLASH_SHOWN_KEY, '1');
    clearTimeout(this.fadeTimer);
    clearTimeout(this.removeTimer);
    this.fading.set(false);
    this.visible.set(true);
    this.lockBodyScroll(true);
    this.fadeTimer = setTimeout(() => this.fading.set(true), FADE_START_MS);
    this.removeTimer = setTimeout(() => {
      this.visible.set(false);
      this.lockBodyScroll(false);
    }, REMOVE_MS);
  }

  // Splash is a fixed pointer-events-none overlay, so without this the page underneath can still scroll/show a scrollbar.
  private lockBodyScroll(locked: boolean): void {
    document.body.style.overflowY = locked ? 'hidden' : '';
  }
}
