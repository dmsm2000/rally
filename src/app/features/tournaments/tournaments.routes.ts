import { Routes } from '@angular/router';
import { TournamentsListPageComponent } from './pages/tournaments-list-page/tournaments-list-page.component';
import { TournamentDetailPageComponent } from './pages/tournament-detail-page/tournament-detail-page.component';

export const TOURNAMENTS_ROUTES: Routes = [
  { path: '', component: TournamentsListPageComponent },
  { path: ':tournamentId', component: TournamentDetailPageComponent },
];
