import { toSignal } from '@angular/core/rxjs-interop';
import { Component, ElementRef, computed, effect, inject, input, output, signal, viewChildren } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AvatarComponent, IconComponent } from '../../shared/ui';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../shared/components';
import { NotificationsBellComponent } from '../../features/notifications/notifications-bell/notifications-bell.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { NAV_ITEMS, NavItem, isNavItemActive } from '../nav-items';

const PRIMARY_PATHS = ['/', '/world'];

@Component({
  selector: 'rally-topbar',
  imports: [RouterLink, AvatarComponent, IconComponent, LanguageSwitcherComponent, ThemeToggleComponent, NotificationsBellComponent, TranslatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  // Pixels (0..header height) the shell wants the bar translated up, tracking scroll on mobile.
  readonly hideOffset = input(0);
  /** Drives the hamburger's icon and label — it closes the drawer as well as opening it. */
  readonly menuOpen = input(false);
  readonly menuToggled = output<void>();

  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  // Home and World render first; observers additionally lose the passport link since they can't hold one.
  protected readonly primary = computed(() => NAV_ITEMS.filter((i) => PRIMARY_PATHS.includes(i.path)));
  protected readonly secondary = computed(() => {
    const rest = NAV_ITEMS.filter((i) => !PRIMARY_PATHS.includes(i.path));
    return this.auth.isObserver() ? rest.filter((i) => i.path !== '/passport') : rest;
  });

  // Router.url isn't itself reactive — this turns route changes into a signal so active-state and
  // indicator position both recompute from one source of truth instead of relying on each
  // routerLink's own (isActiveChange) event, which can't express "also active for /players/*" etc.
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  // Matches DOM order: primary items render before secondary ones, same as NAV_ITEMS itself.
  private readonly navLinks = viewChildren<ElementRef<HTMLAnchorElement>>('navLink');

  protected readonly indicatorLeft = signal(0);
  protected readonly indicatorWidth = signal(0);

  constructor() {
    // Slides the tennis-pill indicator to whichever nav link matches the current route.
    effect(() => {
      const url = this.currentUrl();
      const items = [...this.primary(), ...this.secondary()];
      const index = items.findIndex((item) => isNavItemActive(url, item));
      const el = index >= 0 ? this.navLinks()[index]?.nativeElement : undefined;
      if (!el) {
        this.indicatorWidth.set(0);
        return;
      }
      this.indicatorLeft.set(el.offsetLeft);
      this.indicatorWidth.set(el.offsetWidth);
    });
  }

  protected isActive(item: NavItem): boolean {
    return isNavItemActive(this.currentUrl(), item);
  }

  protected async exitObserverMode(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
