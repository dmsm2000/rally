import { Injectable, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { RallyDataService } from '../data/rally-data.service';
import { Player } from '../models';
import { supabase } from './supabase.client';

export interface AuthResult {
  success: boolean;
  /** Set when signUp succeeded but Supabase requires email confirmation before a session exists. */
  needsEmailConfirmation?: boolean;
  error?: string;
}

/**
 * Wraps Supabase Auth (email/password for now). Player *profile* data (name, level, city...)
 * still lives in the mock `RallyDataService` — only the session/identity is real.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly data = inject(RallyDataService);

  private readonly _session = signal<Session | null>(null);
  private readonly _isObserver = signal(false);
  private readonly _ready = signal(false);

  /** Resolves once the persisted session (if any) has been restored — guards must await this. */
  private readonly initialLoad: Promise<void> = supabase.auth.getSession().then(({ data }) => {
    this._session.set(data.session);
    this._ready.set(true);
  });

  readonly isAuthenticated = computed(() => this._isObserver() || this._session() !== null);
  /** Observers ("olheiros") can browse the app but can't perform any write action. */
  readonly isObserver = this._isObserver.asReadonly();
  readonly ready = this._ready.asReadonly();

  readonly currentPlayer = computed<Player>(() => this.data.me());

  constructor() {
    supabase.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      if (session) {
        this._isObserver.set(false);
      }
    });
  }

  /** Guards should `await` this before reading `isAuthenticated()` on first load. */
  whenReady(): Promise<void> {
    return this.initialLoad;
  }

  async register(email: string, password: string, profile?: Partial<Player>): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    if (profile) {
      this.data.updateMe(profile);
    }
    this._isObserver.set(false);
    // With email confirmation enabled (Supabase default), signUp succeeds but returns no session yet.
    return { success: true, needsEmailConfirmation: !data.session };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    this._isObserver.set(false);
    return { success: true };
  }

  /** Read-only guest session — no sign-up required, no write actions allowed. */
  loginAsObserver(): void {
    this._isObserver.set(true);
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    this._isObserver.set(false);
  }
}
