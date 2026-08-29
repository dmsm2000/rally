import { Routes } from '@angular/router';
import { CourtsListPageComponent } from './pages/courts-list-page/courts-list-page.component';
import { CourtDetailPageComponent } from './pages/court-detail-page/court-detail-page.component';

export const COURTS_ROUTES: Routes = [
  { path: '', component: CourtsListPageComponent },
  { path: ':courtId', component: CourtDetailPageComponent },
];
