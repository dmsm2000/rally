import { Injectable, computed, inject, signal } from '@angular/core';
import { RallyDataService } from '../data/rally-data.service';
import { Player } from '../models';

/**
 * Stand-in for Supabase Auth. Exposes the same shape a real session-based
 * service would (currentPlayer/isAuthenticated) so screens never talk to Supabase directly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly data = inject(RallyDataService);
  private readonly _isAuthenticated = signal(true);
  private readonly _isObserver = signal(false);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  /** Observers ("olheiros") can browse the app but can't perform any write action. */
  readonly isObserver = this._isObserver.asReadonly();

  readonly currentPlayer = computed<Player>(() => this.data.me());

  /** Stand-in for a real Supabase sign-up call; just marks the session as authenticated. */
  register(profile?: Partial<Player>): void {
    if (profile) {
      this.data.updateMe(profile);
    }
    this._isObserver.set(false);
    this._isAuthenticated.set(true);
  }

  /** Stand-in for a real Supabase sign-in call; just marks the session as authenticated. */
  login(): void {
    this._isObserver.set(false);
    this._isAuthenticated.set(true);
  }

  /** Read-only guest session — no sign-up required, no write actions allowed. */
  loginAsObserver(): void {
    this._isObserver.set(true);
    this._isAuthenticated.set(true);
  }

  logout(): void {
    this._isAuthenticated.set(false);
    this._isObserver.set(false);
  }
}
