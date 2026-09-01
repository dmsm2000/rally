import { Injectable, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { ProfileRepositoryService } from '../data/profile-repository.service';
import { RallyDataService } from '../data/rally-data.service';
import { Player } from '../models';
import { supabase } from './supabase.client';

export interface AuthResult {
  success: boolean;
  /** Set when signUp succeeded but Supabase requires email confirmation before a session exists. */
  needsEmailConfirmation?: boolean;
  error?: string;
}

type RegisterProfile = Partial<Player> & { firstName: string; lastName: string };

// Written when signUp() returns no session yet (email confirmation pending) — RLS would reject the
// profiles-table insert at that point since there's no authenticated user yet. Flushed once a real
// session shows up (confirmed + logged in), see flushPendingProfile().
const PENDING_PROFILE_KEY = 'rally.pendingProfile';

/**
 * Wraps Supabase Auth (email/password for now). The registration form's answers are written to
 * the real `profiles` table (see ProfileRepositoryService) — but the rest of the app still reads
 * the player it displays from the mock `RallyDataService`, so this is not yet a full data swap.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly data = inject(RallyDataService);
  private readonly profiles = inject(ProfileRepositoryService);

  private readonly _session = signal<Session | null>(null);
  private readonly _isObserver = signal(false);
  private readonly _ready = signal(false);

  /** Resolves once the persisted session (if any) has been restored — guards must await this. */
  private readonly initialLoad: Promise<void> = supabase.auth.getSession().then(async ({ data }) => {
    this._session.set(data.session);
    // Await this (unlike the onAuthStateChange handler below) — guards await whenReady() before
    // letting a page component construct, so the real profile must already be loaded by then, or a
    // hard refresh on a guarded page (e.g. /profile) briefly shows stale/mock data.
    if (data.session) {
      await this.refreshProfile(data.session.user.id);
    }
    this._ready.set(true);
  });

  readonly isAuthenticated = computed(() => this._isObserver() || this._session() !== null);
  /** The signed-in Supabase user's id, or undefined for an observer / logged-out session. */
  readonly currentUserId = computed(() => this._session()?.user.id);
  /** Observers ("olheiros") can browse the app but can't perform any write action. */
  readonly isObserver = this._isObserver.asReadonly();
  readonly ready = this._ready.asReadonly();

  readonly currentPlayer = computed<Player>(() => this.data.me());

  constructor() {
    supabase.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      if (session) {
        this._isObserver.set(false);
        this.flushPendingProfile(session.user.id);
        this.refreshProfile(session.user.id);
      }
    });
  }

  /** Guards should `await` this before reading `isAuthenticated()` on first load. */
  whenReady(): Promise<void> {
    return this.initialLoad;
  }

  /** Checks (via a security-definer RPC) whether an email is already registered, without leaking a session or sending mail. */
  async emailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('email_exists', { email });
    if (error) {
      console.error('Failed to check email existence:', error);
      return false;
    }
    return !!data;
  }

  async register(email: string, password: string, profile?: RegisterProfile): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    if (profile) {
      this.data.updateMe(profile);
      if (data.user) {
        if (data.session) {
          // Already authenticated (email confirmation disabled) — safe to write now.
          await this.saveProfileRow(data.user.id, profile);
        } else {
          // No session yet — stash it and finish writing once the user actually confirms + signs in.
          localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ userId: data.user.id, profile }));
        }
      }
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

  /** Permanently deletes the signed-in user's account (see supabase/migrations/0002_delete_own_account.sql). */
  async deleteAccount(): Promise<AuthResult> {
    const result = await this.profiles.deleteOwnAccount();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    await supabase.auth.signOut();
    return { success: true };
  }

  /** Best-effort: a failed insert (e.g. table/RLS not set up yet) shouldn't block the rest of the app. */
  private async saveProfileRow(userId: string, profile: RegisterProfile): Promise<void> {
    const result = await this.profiles.insert(userId, profile);
    if (!result.success) {
      console.error('Failed to save profile row:', result.error);
    } else if (result.memberNumber) {
      this.data.updateMe({ memberNumber: result.memberNumber });
    }
  }

  /** Loads the real profile row (if one exists yet) so login always shows the actual saved profile. */
  private async refreshProfile(userId: string): Promise<void> {
    const profile = await this.profiles.getByUserId(userId);
    if (profile) {
      this.data.updateMe(profile);
    }
  }

  /** Completes a registration's profile-row write once a real session for that user shows up. */
  private flushPendingProfile(userId: string): void {
    const raw = localStorage.getItem(PENDING_PROFILE_KEY);
    if (!raw) {
      return;
    }
    localStorage.removeItem(PENDING_PROFILE_KEY);
    try {
      const pending: { userId: string; profile: RegisterProfile } = JSON.parse(raw);
      if (pending.userId === userId) {
        void this.saveProfileRow(userId, pending.profile);
      }
    } catch (err) {
      console.error('Failed to parse pending profile:', err);
    }
  }

  /** Sends the "reset your password" email — `redirectTo` must be an allow-listed URL in Supabase Auth settings. */
  async requestPasswordReset(email: string): Promise<AuthResult> {
    const redirectTo = new URL('reset-password', document.baseURI).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  /** Call once the user lands on /reset-password with the recovery link's session already established. */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  /** Profile-page "change password": re-verifies the current password before setting the new one. */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    const email = this._session()?.user.email;
    if (!email) {
      return { success: false, error: 'auth.errorGeneric' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    return this.updatePassword(newPassword);
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
