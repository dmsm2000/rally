import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../core/theme/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'rally-theme-toggle',
  imports: [TranslatePipe],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
}
