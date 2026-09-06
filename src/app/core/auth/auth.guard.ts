import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Blocks the main app shell for anyone without a session (real or observer) — sends them to
 * /login. Also catches a real session that has no `profiles` row behind it (an interrupted
 * registration, a write that failed after signUp() already succeeded — see register()'s own
 * comment) and routes it into the same profile-completion flow a first-time Google sign-in uses
 * (AuthCallbackPageComponent), rather than opening the shell against a player that doesn't exist.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (!auth.isAuthenticated()) {
    return router.parseUrl('/login');
  }
  const uid = auth.currentUserId();
  if (uid && !(await auth.hasProfile(uid))) {
    // A UrlTree return can't carry navigation state, so redirect imperatively instead.
    await router.navigateByUrl('/register', { state: { completeProfile: true } });
    return false;
  }
  return true;
};
