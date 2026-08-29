import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', loadChildren: () => import('./features/feed/feed.routes').then((m) => m.FEED_ROUTES) },
	{ path: 'players', loadChildren: () => import('./features/players/players.routes').then((m) => m.PLAYERS_ROUTES) },
	{ path: 'courts', loadChildren: () => import('./features/courts/courts.routes').then((m) => m.COURTS_ROUTES) },
	{ path: 'matches', loadChildren: () => import('./features/matches/matches.routes').then((m) => m.MATCHES_ROUTES) },
	{ path: 'world', loadChildren: () => import('./features/world/world.routes').then((m) => m.WORLD_ROUTES) },
	{ path: 'passport', loadChildren: () => import('./features/passport/passport.routes').then((m) => m.PASSPORT_ROUTES) },
	{ path: 'achievements', redirectTo: '/passport' },
	{ path: 'profile', loadChildren: () => import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES) },
	{ path: '**', redirectTo: '' },
];
