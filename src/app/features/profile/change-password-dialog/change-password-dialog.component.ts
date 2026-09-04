import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { PasswordToggleComponent } from '../../../shared/ui';

/**
 * Change-password dialog, lifted out of the profile page: nine signals and four methods that
 * shared nothing with the profile drafts around them beyond sitting on the same route.
 *
 * Owns its own reset, so the page never has to remember to clear the fields — closing is the
 * component going away.
 */
@Component({
  selector: 'rally-change-password-dialog',
  imports: [FormsModule, PasswordToggleComponent, TranslatePipe],
  templateUrl: './change-password-dialog.component.html',
  styleUrl: './change-password-dialog.component.scss'
})
export class ChangePasswordDialogComponent {
  private readonly auth = inject(AuthService);
  private readonly translation = inject(TranslationService);
  private readonly toast = inject(ToastService);

  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmNewPassword = signal('');
  /** Set when the server rejects the current password, so the field can be marked without a toast-only hint. */
  protected readonly currentPasswordError = signal(false);
  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmNewPassword = signal(false);

  protected readonly mismatch = computed(
    () => this.confirmNewPassword().length > 0 && this.newPassword() !== this.confirmNewPassword()
  );

  protected readonly tooShort = computed(() => this.newPassword().length > 0 && this.newPassword().length < 6);

  protected readonly canSave = computed(
    () =>
      !this.saving() &&
      this.currentPassword().length > 0 &&
      this.newPassword().length >= 6 &&
      this.newPassword() === this.confirmNewPassword()
  );

  protected setCurrentPassword(value: string): void {
    this.currentPassword.set(value);
    this.currentPasswordError.set(false);
  }

  protected async submit(): Promise<void> {
    if (!this.canSave()) {
      return;
    }
    this.saving.set(true);
    const result = await this.auth.changePassword(this.currentPassword(), this.newPassword());
    this.saving.set(false);
    if (!result.success) {
      this.currentPasswordError.set(true);
      this.toast.error(this.translation.t(result.error ?? 'auth.errorGeneric'));
      return;
    }
    this.toast.success(this.translation.t('profile.passwordUpdated'));
    this.closed.emit();
  }
}
