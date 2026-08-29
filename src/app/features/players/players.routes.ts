import { Routes } from '@angular/router';
import { PlayersListPageComponent } from './pages/players-list-page/players-list-page.component';
import { PlayerDetailPageComponent } from './pages/player-detail-page/player-detail-page.component';

export const PLAYERS_ROUTES: Routes = [
  { path: '', component: PlayersListPageComponent },
  { path: ':playerId', component: PlayerDetailPageComponent },
];
