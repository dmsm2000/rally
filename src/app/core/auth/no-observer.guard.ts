import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Blocks observer ("olheiro") sessions from routes that assume a real player identity. */
export const noObserverGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isObserver() ? inject(Router).parseUrl('/') : true;
};
