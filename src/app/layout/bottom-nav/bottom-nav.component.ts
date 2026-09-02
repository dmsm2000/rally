import { toSignal } from '@angular/core/rxjs-interop';
import { Component, ElementRef, computed, effect, inject, signal, viewChildren } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { IconComponent } from '../../shared/ui';
import { NAV_ITEMS, NavItem, isNavItemActive } from '../nav-items';

@Component({
  selector: 'rally-bottom-nav',
  imports: [RouterLink, TranslatePipe, IconComponent],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Observers can't hold a passport, so that tab is dropped from the nav for them.
  protected readonly items = computed(() => (this.auth.isObserver() ? NAV_ITEMS.filter((i) => i.path !== '/passport') : NAV_ITEMS));

  // Router.url isn't itself reactive — this turns route changes into a signal so active-state and
  // indicator position both recompute from one source of truth instead of relying on each
  // routerLink's own (isActiveChange) event, which can't express "also active for /players/*" etc.
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  private readonly iconWraps = viewChildren<ElementRef<HTMLElement>>('iconWrap');

  protected readonly indicatorLeft = signal(0);
  protected readonly indicatorTop = signal(0);
  protected readonly indicatorWidth = signal(0);

  constructor() {
    // Slides the tennis-pill indicator to whichever icon bubble matches the current route.
    effect(() => {
      const url = this.currentUrl();
      const index = this.items().findIndex((item) => isNavItemActive(url, item));
      const el = index >= 0 ? this.iconWraps()[index]?.nativeElement : undefined;
      if (!el) {
        this.indicatorWidth.set(0);
        return;
      }
      this.indicatorLeft.set(el.offsetLeft);
      this.indicatorTop.set(el.offsetTop);
      this.indicatorWidth.set(el.offsetWidth);
    });
  }

  protected isActive(item: NavItem): boolean {
    return isNavItemActive(this.currentUrl(), item);
  }
}
