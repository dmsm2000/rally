import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Blocks the main app shell for anyone without a session (real or observer) — sends them to
 * /login. Also catches a real session that has no `profiles` row behind it (an interrupted
 * registration, a write that failed after signUp() already succeeded — see register()'s own
 * comment) and routes it into the same profile-completion flow a first-time Google sign-in uses
 * (AuthCallbackPageComponent), rather than opening the shell against a player that doesn't exist.
 *
 * The `!auth.isObserver()` check exists because loginAsObserver() clears any lingering real
 * session, but shouldn't be this guard's only line of defence against the same "truthy uid means
 * it's safe to act on" trap documented at length in CLAUDE.md — an observer's explicit choice must
 * win over any leftover session state, from this or a future code path.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (!auth.isAuthenticated()) {
    return router.parseUrl('/login');
  }
  const uid = auth.currentUserId();
  if (!auth.isObserver() && uid && !(await auth.hasProfile(uid))) {
    // A UrlTree return can't carry navigation state, so redirect imperatively instead.
    await router.navigateByUrl('/register', { state: { completeProfile: true } });
    return false;
  }
  return true;
};
