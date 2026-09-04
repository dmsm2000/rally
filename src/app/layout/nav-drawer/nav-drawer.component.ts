import { toSignal } from '@angular/core/rxjs-interop';
import { Component, HostListener, computed, inject, input, output } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../shared/components';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AvatarComponent, IconComponent } from '../../shared/ui';
import { NAV_ITEMS, NavItem, isNavItemActive } from '../nav-items';

/**
 * Mobile navigation, off-canvas — tried because a bar pinned to the bottom of the screen ate
 * vertical space permanently and stopped scaling once NAV_ITEMS grew past what five icons can show
 * without crowding.
 *
 * It also carries what used to crowd the topbar's right-hand corner on mobile (language, theme,
 * profile), which is what lets the topbar there be just: hamburger, logo, notifications.
 *
 * Only exists below `lg`: at `lg` the topbar renders every NAV_ITEMS entry inline and keeps its own
 * corner actions.
 */
@Component({
  selector: 'rally-nav-drawer',
  imports: [RouterLink, AvatarComponent, IconComponent, LanguageSwitcherComponent, ThemeToggleComponent, TranslatePipe],
  templateUrl: './nav-drawer.component.html',
  styleUrl: './nav-drawer.component.scss',
})
export class NavDrawerComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly open = input(false);
  readonly closed = output<void>();

  // Observers can't hold a passport, so that item is dropped from the drawer for them — mirrors
  // the topbar's own filtering.
  protected readonly items = computed(() => (this.auth.isObserver() ? NAV_ITEMS.filter(i => i.path !== '/passport') : NAV_ITEMS));

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  protected isActive(item: NavItem): boolean {
    return isNavItemActive(this.currentUrl(), item);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected async exitObserverMode(): Promise<void> {
    this.closed.emit();
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
