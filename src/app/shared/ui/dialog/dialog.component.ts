import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

/**
 * The composer shell shared by the feed, matches, trip and court-registration dialogs: a bottom
 * sheet on mobile, a centred card from `sm` up, with an eyebrow/close header.
 *
 * It deliberately has no `open` input — callers keep their own `@if`, so a closed composer's body
 * is never instantiated. Projected content lives in the caller's view, so an `@if` in here would
 * still build it.
 */
@Component({
  selector: 'ui-dialog',
  imports: [IconComponent, TranslatePipe],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss'
})
export class DialogComponent {
  readonly eyebrow = input('');
  /** Most composer bodies are taller than the viewport; a short one opts out of the scroll cap. */
  readonly scrollable = input(true);
  readonly closed = output<void>();

  protected readonly panelClasses = computed(
    () =>
      'animate-tennis-pop w-full max-w-lg rounded-t-3xl border border-border bg-card p-5 shadow-xl sm:rounded-3xl sm:p-6 ' +
      (this.scrollable() ? 'no-scrollbar max-h-[90vh] overflow-y-auto' : '')
  );

  /**
   * Only the backdrop itself closes — a click on the panel or one of its inputs must not.
   *
   * Deliberately a method rather than an inline template expression: `target === currentTarget &&
   * close()` evaluates to the literal `false` for every click that isn't on the backdrop, and
   * Angular calls event.preventDefault() whenever a bound expression returns exactly `false` —
   * which silently cancelled the feed composer's file input opening its picker.
   */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
