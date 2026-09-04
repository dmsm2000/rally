import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/**
 * Where Supabase sends the browser back after `AuthService.loginWithGoogle()`'s redirect to Google
 * completes. Its only job is to decide where the new session goes next — `/` for a returning
 * member, `/register` in profile-completion mode for a first-time sign-in with no `profiles` row
 * yet — since neither of those pages can tell those two cases apart on their own.
 */
@Component({
  selector: 'rally-auth-callback-page',
  imports: [TranslatePipe],
  templateUrl: './auth-callback-page.component.html',
  styleUrl: './auth-callback-page.component.scss'
})
export class AuthCallbackPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslationService);

  constructor() {
    void this.resolve();
  }

  private async resolve(): Promise<void> {
    // The provider (or Supabase itself) reports a failed attempt via query params, not a thrown error.
    const oauthError =
      this.route.snapshot.queryParamMap.get('error_description') ?? this.route.snapshot.queryParamMap.get('error');
    if (oauthError) {
      this.toast.error(oauthError);
      await this.router.navigateByUrl('/login');
      return;
    }

    await this.auth.whenReady();
    const userId = this.auth.currentUserId();
    if (!userId) {
      this.toast.error(this.i18n.t('auth.errorGeneric'));
      await this.router.navigateByUrl('/login');
      return;
    }

    const hasProfile = await this.auth.hasProfile(userId);
    await this.router.navigateByUrl(hasProfile ? '/' : '/register', {
      state: hasProfile ? undefined : { completeGoogleProfile: true }
    });
  }
}
