import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { LanguageSwitcherComponent, ThemeToggleComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-login-page',
  imports: [FormsModule, RouterLink, LanguageSwitcherComponent, ThemeToggleComponent, TranslatePipe],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly email = signal('');
  protected readonly password = signal('');

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  protected readonly canSubmit = computed(() => this.emailPattern.test(this.email()) && this.password().length > 0);

  protected onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.auth.login();
    this.router.navigateByUrl('/');
  }

  protected enterAsObserver(): void {
    this.auth.loginAsObserver();
    this.router.navigateByUrl('/');
  }
}
