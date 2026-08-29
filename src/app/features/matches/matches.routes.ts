import { Routes } from '@angular/router';
import { MatchesListPageComponent } from './pages/matches-list-page/matches-list-page.component';
import { MatchDetailPageComponent } from './pages/match-detail-page/match-detail-page.component';

export const MATCHES_ROUTES: Routes = [
  { path: '', component: MatchesListPageComponent },
  { path: ':matchId', component: MatchDetailPageComponent },
];
