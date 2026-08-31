import { Location } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

// How long the ball keeps hopping before the logo settles in, and how long the whole splash stays up after that.
const FADE_START_MS = 2500;
const REMOVE_MS = 3000;

// Pre-authentication routes render their own screen — the brand intro would only get in the way there.
const HIDDEN_PATHS = ['/login', '/register'];

/**
 * Brand intro: a ball bouncing across clay/hard/grass courts, then the Rally logo.
 * Shown once on a fresh page load (unless that load lands on a pre-authentication route),
 * and again right after the user completes login/register and is routed away from those pages
 * (since the root component never remounts on SPA navigation, we replay it manually here).
 */
@Component({
  selector: 'rally-splash-screen',
  templateUrl: './splash-screen.component.html',
  styleUrl: './splash-screen.component.scss'
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  protected readonly visible = signal(true);
  protected readonly fading = signal(false);

  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  private fadeTimer?: ReturnType<typeof setTimeout>;
  private removeTimer?: ReturnType<typeof setTimeout>;
  private wasOnHiddenRoute = false;

  ngOnInit(): void {
    // Location.path() strips the app's base href (e.g. GitHub Pages' /rally/), unlike window.location.pathname.
    this.wasOnHiddenRoute = HIDDEN_PATHS.some(path => this.location.path().startsWith(path));
    if (this.wasOnHiddenRoute) {
      this.visible.set(false);
    } else {
      this.play();
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        const onHiddenRoute = HIDDEN_PATHS.some(path => event.urlAfterRedirects.startsWith(path));
        if (this.wasOnHiddenRoute && !onHiddenRoute) {
          this.play();
        }
        this.wasOnHiddenRoute = onHiddenRoute;
      });
  }

  ngOnDestroy(): void {
    this.lockBodyScroll(false);
  }

  private play(): void {
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
