import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { noObserverGuard } from './core/auth/no-observer.guard';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

export const routes: Routes = [
  // Public, pre-authentication routes render outside the shell (no topbar/bottom-nav).
  { path: 'register', loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES) },
  { path: 'login', loadChildren: () => import('./features/auth/auth.routes').then(m => m.LOGIN_ROUTES) },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', loadChildren: () => import('./features/feed/feed.routes').then(m => m.FEED_ROUTES) },
      { path: 'players', loadChildren: () => import('./features/players/players.routes').then(m => m.PLAYERS_ROUTES) },
      { path: 'courts', loadChildren: () => import('./features/courts/courts.routes').then(m => m.COURTS_ROUTES) },
      { path: 'matches', loadChildren: () => import('./features/matches/matches.routes').then(m => m.MATCHES_ROUTES) },
      { path: 'world', loadChildren: () => import('./features/world/world.routes').then(m => m.WORLD_ROUTES) },
      {
        path: 'passport',
        canActivate: [noObserverGuard],
        loadChildren: () => import('./features/passport/passport.routes').then(m => m.PASSPORT_ROUTES)
      },
      { path: 'achievements', redirectTo: '/passport' },
      {
        path: 'profile',
        canActivate: [noObserverGuard],
        loadChildren: () => import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES)
      },
      { path: '**', redirectTo: '' }
    ]
  }
];
