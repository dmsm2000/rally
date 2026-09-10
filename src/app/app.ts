import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { SplashScreenComponent } from './layout/splash-screen/splash-screen.component';
import { AuthService } from './core/auth/auth.service';
import { TranslationService } from './core/i18n/translation.service';
import { ToastService } from './core/services/toast.service';
import { TwemojiRendererService } from './core/services/twemoji-renderer.service';
import { ConfirmDialogComponent, MediaLightboxComponent, ToastContainerComponent } from './shared/ui';

@Component({
  selector: 'rally-root',
  imports: [RouterOutlet, SplashScreenComponent, ToastContainerComponent, ConfirmDialogComponent, MediaLightboxComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private readonly twemoji = inject(TwemojiRendererService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);

  // `@capacitor/app` is known to fire `appUrlOpen` more than once for the same deep link on some
  // Android versions (once via onNewIntent, once replaying the launch intent) — an OAuth
  // authorization code can only be exchanged once, so an un-deduped second fire surfaces as a
  // spurious error toast even though the first, correct exchange already succeeded.
  private lastOAuthRedirectUrl: string | null = null;

  ngOnInit(): void {
    this.twemoji.start();
    if (Capacitor.isNativePlatform()) {
      // Google sign-in on native opens the system browser (see AuthService.loginWithGoogle()) —
      // this is where its `rally://auth/callback` reply comes back in. Registered here, not inside
      // a route component, because it can fire while the user isn't on any particular screen (the
      // system browser owns the foreground until this event).
      void App.addListener('appUrlOpen', ({ url }) => {
        void this.handleNativeOAuthRedirect(url);
      });
    }
  }

  private async handleNativeOAuthRedirect(url: string): Promise<void> {
    if (!url.includes('auth/callback') || url === this.lastOAuthRedirectUrl) {
      return;
    }
    this.lastOAuthRedirectUrl = url;
    // Dismiss the system browser tab first — leaving it up while the app navigates behind it reads
    // as the sign-in having silently failed.
    await Browser.close().catch(() => undefined);
    const result = await this.auth.completeNativeOAuthRedirect(url);
    if (!result.success) {
      this.toast.error(result.error === 'auth.errorGeneric' ? this.translation.t(result.error) : (result.error ?? ''));
      await this.router.navigateByUrl('/login');
      return;
    }
    // Mirrors AuthCallbackPageComponent's own decision — see that component for why it exists.
    const hasProfile = !!result.userId && (await this.auth.hasProfile(result.userId));
    await this.router.navigateByUrl(hasProfile ? '/' : '/register', {
      state: hasProfile ? undefined : { completeProfile: true }
    });
  }
}
