import { Routes } from '@angular/router';
import { PlayerDetailPageComponent } from './pages/player-detail-page/player-detail-page.component';

export const PLAYERS_ROUTES: Routes = [
  { path: '', redirectTo: '/world', pathMatch: 'full' },
  { path: ':playerId', component: PlayerDetailPageComponent },
];
