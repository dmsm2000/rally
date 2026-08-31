import { Routes } from '@angular/router';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { ForgotPasswordPageComponent } from './pages/forgot-password-page/forgot-password-page.component';
import { ResetPasswordPageComponent } from './pages/reset-password-page/reset-password-page.component';

export const AUTH_ROUTES: Routes = [{ path: '', component: RegisterPageComponent }];

export const LOGIN_ROUTES: Routes = [{ path: '', component: LoginPageComponent }];

export const FORGOT_PASSWORD_ROUTES: Routes = [{ path: '', component: ForgotPasswordPageComponent }];

export const RESET_PASSWORD_ROUTES: Routes = [{ path: '', component: ResetPasswordPageComponent }];
