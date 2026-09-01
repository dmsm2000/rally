import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { TranslationService } from '../../../core/i18n/translation.service';
import { TwemojiRendererService } from '../../../core/services/twemoji-renderer.service';
import { Locale, LOCALE_FLAGS, LOCALE_LABELS } from '../../../core/i18n/locale';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../../ui';

@Component({
  selector: 'rally-language-switcher',
  imports: [TranslatePipe, IconComponent],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly i18n = inject(TranslationService);
  protected readonly twemoji = inject(TwemojiRendererService);
  protected readonly labels = LOCALE_LABELS;
  protected readonly flags = LOCALE_FLAGS;
  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected select(locale: Locale): void {
    this.i18n.setLocale(locale);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
