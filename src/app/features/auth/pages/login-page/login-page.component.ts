import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { IconComponent, PasswordToggleComponent } from '../../../../shared/ui';

@Component({
  selector: 'rally-login-page',
  imports: [
    FormsModule,
    RouterLink,
    LanguageSwitcherComponent,
    ThemeToggleComponent,
    TranslatePipe,
    PasswordToggleComponent,
    IconComponent
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslationService);
  protected readonly theme = inject(ThemeService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly fieldError = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly googleLoading = signal(false);

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  protected readonly canSubmit = computed(
    () => !this.submitting() && this.emailPattern.test(this.email()) && this.password().length > 0
  );

  constructor() {
    // A real session visiting /login directly (back button, bookmark, typed URL) has nothing to do
    // here — send it on to the Feed instead of showing the form again. Observers are exempt: one of
    // them landing here is most likely trying to sign in for real, which the form has to stay for.
    effect(() => {
      if (this.auth.ready() && this.auth.currentUserId()) {
        this.router.navigateByUrl('/');
      }
    });
  }

  protected setEmail(value: string): void {
    this.email.set(value);
    this.fieldError.set(false);
  }

  protected setPassword(value: string): void {
    this.password.set(value);
    this.fieldError.set(false);
  }

  protected async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }
    this.submitting.set(true);
    const result = await this.auth.login(this.email(), this.password());
    this.submitting.set(false);
    if (!result.success) {
      this.fieldError.set(true);
      this.toast.error(this.i18n.t(result.error ?? 'auth.errorGeneric'));
      return;
    }
    this.router.navigateByUrl('/');
  }

  protected enterAsObserver(): void {
    this.auth.loginAsObserver();
    this.router.navigateByUrl('/');
  }

  protected async loginWithGoogle(): Promise<void> {
    this.googleLoading.set(true);
    const result = await this.auth.loginWithGoogle();
    // On success the browser is already navigating away to Google — nothing left to do here.
    if (!result.success) {
      this.googleLoading.set(false);
      this.toast.error(this.i18n.t(result.error ?? 'auth.errorGeneric'));
    }
  }
}
