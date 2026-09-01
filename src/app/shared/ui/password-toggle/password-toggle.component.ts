import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

/** Show/hide toggle for password inputs — swaps to a 🎾 while the password is revealed (ball's in play). */
@Component({
  selector: 'ui-password-toggle',
  imports: [IconComponent, TranslatePipe],
  templateUrl: './password-toggle.component.html'
})
export class PasswordToggleComponent {
  readonly visible = input(false);
  readonly toggled = output<void>();
}
