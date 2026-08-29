import { Component, inject } from '@angular/core';
import { TranslationService } from '../../../core/i18n/translation.service';
import { LOCALE_LABELS } from '../../../core/i18n/locale';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  protected readonly i18n = inject(TranslationService);
  protected readonly labels = LOCALE_LABELS;
}
