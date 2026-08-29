import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AvatarComponent } from '../../shared/ui';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../shared/components';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
}

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, RouterLinkActive, AvatarComponent, LanguageSwitcherComponent, ThemeToggleComponent, TranslatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  protected readonly auth = inject(AuthService);

  protected readonly primary: NavItem[] = [
    { path: '/', label: 'nav.home', exact: true },
    { path: '/players', label: 'nav.players' },
    { path: '/world', label: 'nav.world' },
    { path: '/tournaments', label: 'nav.tournaments' },
    { path: '/profile', label: 'nav.profile' },
  ];

  protected readonly secondary: NavItem[] = [
    { path: '/feed', label: 'nav.feed' },
    { path: '/courts', label: 'nav.courts' },
    { path: '/matches', label: 'nav.matches' },
    { path: '/passport', label: 'nav.passport' },
    { path: '/achievements', label: 'nav.achievements' },
  ];
}
