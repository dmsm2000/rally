import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type NavIcon = 'home' | 'world' | 'courts' | 'matches' | 'passport';

interface NavItem {
  path: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
}

@Component({
  selector: 'rally-bottom-nav',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  private readonly auth = inject(AuthService);

  private readonly allItems: NavItem[] = [
    { path: '/', label: 'nav.home', icon: 'home', exact: true },
    { path: '/world', label: 'nav.world', icon: 'world' },
    { path: '/courts', label: 'nav.courts', icon: 'courts' },
    { path: '/matches', label: 'nav.matches', icon: 'matches' },
    { path: '/passport', label: 'nav.passport', icon: 'passport' },
  ];

  // Observers can't hold a passport, so that tab is dropped from the nav for them.
  protected readonly items = computed(() => (this.auth.isObserver() ? this.allItems.filter((i) => i.path !== '/passport') : this.allItems));

  protected readonly indicatorLeft = signal(0);
  protected readonly indicatorTop = signal(0);
  protected readonly indicatorWidth = signal(0);

  // Slides the tennis-pill indicator to whichever icon bubble becomes active.
  protected onActiveChange(isActive: boolean, iconWrap: HTMLElement): void {
    if (!isActive) {
      return;
    }
    this.indicatorLeft.set(iconWrap.offsetLeft);
    this.indicatorTop.set(iconWrap.offsetTop);
    this.indicatorWidth.set(iconWrap.offsetWidth);
  }
}
