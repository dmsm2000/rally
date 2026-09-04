import { Location } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Powers "back" affordances (the topbar arrow on mobile, `ui-back-link` on desktop) so a detail
 * page — a player, a court, a match — can return the viewer to wherever they came from instead of
 * forcing a trip through the sidebar/hamburger.
 *
 * Real browser history is preferred (it lands exactly where the viewer was, scroll position and
 * all), but a direct or shared link to a detail page has no in-app history to unwind — calling
 * `Location.back()` there would leave Rally entirely rather than do anything useful. `navigationCount`
 * tracks whether at least one in-app navigation has happened yet; once it has, real history is used
 * for the rest of the session.
 */
@Injectable({ providedIn: 'root' })
export class BackNavigationService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  private readonly navigationCount = signal(0);

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      this.navigationCount.update((count) => count + 1);
    });
  }

  back(fallback: string): void {
    if (this.navigationCount() > 1) {
      this.location.back();
    } else {
      void this.router.navigateByUrl(fallback);
    }
  }
}
