import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AvatarComponent } from '../../shared/ui';
import { LanguageSwitcherComponent, ThemeToggleComponent, NotificationsBellComponent } from '../../shared/components';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
}

@Component({
  selector: 'rally-topbar',
  imports: [RouterLink, RouterLinkActive, AvatarComponent, LanguageSwitcherComponent, ThemeToggleComponent, NotificationsBellComponent, TranslatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  // Pixels (0..header height) the shell wants the bar translated up, tracking scroll on mobile.
  readonly hideOffset = input(0);

  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  // Observers can't hold a passport, so that link is dropped from the nav for them.
  protected readonly primary = computed(() => this.primaryItems);
  protected readonly secondary = computed(() => (this.auth.isObserver() ? this.secondaryItems.filter((i) => i.path !== '/passport') : this.secondaryItems));

  protected readonly indicatorLeft = signal(0);
  protected readonly indicatorWidth = signal(0);

  private readonly router = inject(Router);

  private readonly primaryItems: NavItem[] = [
    { path: '/', label: 'nav.home', exact: true },
    { path: '/world', label: 'nav.world' },
  ];

  private readonly secondaryItems: NavItem[] = [
    { path: '/courts', label: 'nav.courts' },
    { path: '/matches', label: 'nav.matches' },
    { path: '/passport', label: 'nav.passport' },
  ];

  // Slides the tennis-pill indicator to whichever nav link becomes active.
  protected onActiveChange(isActive: boolean, link: HTMLAnchorElement): void {
    if (!isActive) {
      return;
    }
    this.indicatorLeft.set(link.offsetLeft);
    this.indicatorWidth.set(link.offsetWidth);
  }

  protected async exitObserverMode(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
