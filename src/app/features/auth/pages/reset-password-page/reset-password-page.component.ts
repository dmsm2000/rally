import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-reset-password-page',
  imports: [FormsModule, RouterLink, LanguageSwitcherComponent, ThemeToggleComponent, TranslatePipe],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss'
})
export class ResetPasswordPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);

  protected readonly passwordsMismatch = computed(
    () => this.confirmPassword().length > 0 && this.password() !== this.confirmPassword()
  );

  protected readonly canSubmit = computed(
    () => !this.submitting() && this.password().length >= 6 && this.password() === this.confirmPassword()
  );

  protected async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const result = await this.auth.updatePassword(this.password());
    if (!result.success) {
      this.submitting.set(false);
      this.error.set(result.error ?? 'auth.errorGeneric');
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
