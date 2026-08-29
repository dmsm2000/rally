import { Routes } from '@angular/router';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';

export const AUTH_ROUTES: Routes = [{ path: '', component: RegisterPageComponent }];

export const LOGIN_ROUTES: Routes = [{ path: '', component: LoginPageComponent }];
