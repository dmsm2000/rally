import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AvatarComponent } from '../../shared/ui';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../shared/components';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
}

@Component({
  selector: 'rally-topbar',
  imports: [RouterLink, RouterLinkActive, AvatarComponent, LanguageSwitcherComponent, ThemeToggleComponent, TranslatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly primary: NavItem[] = [
    { path: '/', label: 'nav.home', exact: true },
    { path: '/world', label: 'nav.world' },
  ];

  protected readonly secondary: NavItem[] = [
    { path: '/courts', label: 'nav.courts' },
    { path: '/matches', label: 'nav.matches' },
    { path: '/passport', label: 'nav.passport' },
  ];

  protected readonly indicatorLeft = signal(0);
  protected readonly indicatorWidth = signal(0);

  // Slides the tennis-pill indicator to whichever nav link becomes active.
  protected onActiveChange(isActive: boolean, link: HTMLAnchorElement): void {
    if (!isActive) {
      return;
    }
    this.indicatorLeft.set(link.offsetLeft);
    this.indicatorWidth.set(link.offsetWidth);
  }
}
