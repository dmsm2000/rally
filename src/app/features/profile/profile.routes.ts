import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';
import { ProfilePageComponent } from './pages/profile-page/profile-page.component';

export const PROFILE_ROUTES: Routes = [
  { path: '', component: ProfilePageComponent, canDeactivate: [unsavedChangesGuard] }
];
