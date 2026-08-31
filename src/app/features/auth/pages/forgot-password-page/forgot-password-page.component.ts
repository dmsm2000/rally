import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-forgot-password-page',
  imports: [FormsModule, RouterLink, LanguageSwitcherComponent, ThemeToggleComponent, TranslatePipe],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss'
})
export class ForgotPasswordPageComponent {
  private readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly email = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sent = signal(false);

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  protected readonly canSubmit = computed(() => !this.submitting() && this.emailPattern.test(this.email()));

  protected async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const result = await this.auth.requestPasswordReset(this.email());
    this.submitting.set(false);
    if (!result.success) {
      this.error.set(result.error ?? 'auth.errorGeneric');
      return;
    }
    this.sent.set(true);
  }
}
