import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { PasswordToggleComponent } from '../../../../shared/ui';

@Component({
  selector: 'rally-reset-password-page',
  imports: [
    FormsModule,
    RouterLink,
    LanguageSwitcherComponent,
    ThemeToggleComponent,
    TranslatePipe,
    PasswordToggleComponent
  ],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss'
})
export class ResetPasswordPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslationService);
  protected readonly theme = inject(ThemeService);

  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly submitting = signal(false);
  protected readonly done = signal(false);
  protected readonly fieldError = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected readonly passwordsMismatch = computed(
    () => this.confirmPassword().length > 0 && this.password() !== this.confirmPassword()
  );

  protected readonly passwordTooShort = computed(() => this.password().length > 0 && this.password().length < 6);

  protected readonly canSubmit = computed(
    () => !this.submitting() && this.password().length >= 6 && this.password() === this.confirmPassword()
  );

  protected setPassword(value: string): void {
    this.password.set(value);
    this.fieldError.set(false);
  }

  protected setConfirmPassword(value: string): void {
    this.confirmPassword.set(value);
    this.fieldError.set(false);
  }

  protected async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }
    this.submitting.set(true);
    const result = await this.auth.updatePassword(this.password());
    if (!result.success) {
      this.submitting.set(false);
      this.fieldError.set(true);
      this.toast.error(this.i18n.t(result.error ?? 'auth.errorGeneric'));
      return;
    }
    // Recovery link leaves a real session behind — sign it out so the user re-enters with the new password.
    await this.auth.logout();
    this.submitting.set(false);
    this.done.set(true);
  }

  protected goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
