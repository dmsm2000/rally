import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES) },
	{ path: 'players', loadChildren: () => import('./features/players/players.routes').then((m) => m.PLAYERS_ROUTES) },
	{ path: 'courts', loadChildren: () => import('./features/courts/courts.routes').then((m) => m.COURTS_ROUTES) },
	{ path: 'matches', loadChildren: () => import('./features/matches/matches.routes').then((m) => m.MATCHES_ROUTES) },
	{ path: 'tournaments', loadChildren: () => import('./features/tournaments/tournaments.routes').then((m) => m.TOURNAMENTS_ROUTES) },
	{ path: 'world', loadChildren: () => import('./features/world/world.routes').then((m) => m.WORLD_ROUTES) },
	{ path: 'feed', loadChildren: () => import('./features/feed/feed.routes').then((m) => m.FEED_ROUTES) },
	{ path: 'passport', loadChildren: () => import('./features/passport/passport.routes').then((m) => m.PASSPORT_ROUTES) },
	{ path: 'achievements', loadChildren: () => import('./features/achievements/achievements.routes').then((m) => m.ACHIEVEMENTS_ROUTES) },
	{ path: 'profile', loadChildren: () => import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES) },
	{ path: '**', redirectTo: '' },
];
