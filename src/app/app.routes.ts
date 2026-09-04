import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { noObserverGuard } from './core/auth/no-observer.guard';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

export const routes: Routes = [
  // Public, pre-authentication routes render outside the shell (no topbar/bottom-nav).
  { path: 'register', loadChildren: async () => (await import('./features/auth/auth.routes')).AUTH_ROUTES },
  { path: 'login', loadChildren: async () => (await import('./features/auth/auth.routes')).LOGIN_ROUTES },
  {
    path: 'forgot-password',
    loadChildren: async () => (await import('./features/auth/auth.routes')).FORGOT_PASSWORD_ROUTES
  },
  {
    path: 'reset-password',
    loadChildren: async () => (await import('./features/auth/auth.routes')).RESET_PASSWORD_ROUTES
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', loadChildren: async () => (await import('./features/feed/feed.routes')).FEED_ROUTES },
      { path: 'players', loadChildren: async () => (await import('./features/players/players.routes')).PLAYERS_ROUTES },
      { path: 'courts', loadChildren: async () => (await import('./features/courts/courts.routes')).COURTS_ROUTES },
      { path: 'matches', loadChildren: async () => (await import('./features/matches/matches.routes')).MATCHES_ROUTES },
      { path: 'world', loadChildren: async () => (await import('./features/world/world.routes')).WORLD_ROUTES },
      {
        path: 'passport',
        canActivate: [noObserverGuard],
        loadChildren: async () => (await import('./features/passport/passport.routes')).PASSPORT_ROUTES
      },
      {
        path: 'profile',
        canActivate: [noObserverGuard],
        loadChildren: async () => (await import('./features/profile/profile.routes')).PROFILE_ROUTES
      },
      { path: '**', redirectTo: '' }
    ]
  }
];
