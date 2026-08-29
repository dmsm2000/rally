import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface NavItem {
  path: string;
  label: string;
  exact?: boolean;
}

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  protected readonly items: NavItem[] = [
    { path: '/', label: 'nav.home', exact: true },
    { path: '/players', label: 'nav.players' },
    { path: '/world', label: 'nav.world' },
    { path: '/tournaments', label: 'nav.tours' },
    { path: '/profile', label: 'nav.profile' },
  ];
}
