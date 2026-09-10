import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

/**
 * The composer shell shared by the feed, matches, trip and court-registration dialogs: a bottom
 * sheet on mobile, a centred card from `sm` up, with an eyebrow/close header.
 *
 * It deliberately has no `open` input — callers keep their own `@if`, so a closed composer's body
 * is never instantiated. Projected content lives in the caller's view, so an `@if` in here would
 * still build it. Closing still gets an exit animation despite that: `requestClose()` holds the
 * `closed` emit back for CLOSE_ANIMATION_MS so the panel/backdrop can animate out first, then lets
 * the caller's own `@if` do the actual removal — mirrors MessagesWidgetComponent's `closing`
 * signal, just without an `open` input for it to watch.
 *
 * `requestClose()` is public rather than protected: a composer that hides the header close button
 * (`[showClose]="false"`, e.g. one that puts its own "Cancel" button in the projected content
 * instead) still needs a way to trigger the same animated close, and the only route to that from
 * projected content is a template reference variable on the host tag (`#dlg`, then
 * `dlg.requestClose()` on a button inside `<ui-dialog #dlg>...</ui-dialog>`).
 */
@Component({
  selector: 'ui-dialog',
  imports: [IconComponent, TranslatePipe],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss'
})
export class DialogComponent implements OnDestroy {
  // Matches the `animate-tennis-pop-out` keyframe duration (styles.css).
  private static readonly CLOSE_ANIMATION_MS = 180;

  readonly eyebrow = input('');
  /** Most composer bodies are taller than the viewport; a short one opts out of the scroll cap. */
  readonly scrollable = input(true);
  /** The header row (eyebrow + close button) disappears entirely once both are unused. */
  readonly showClose = input(true);
  /** Opts out of the bottom-sheet-on-mobile default for a short, action-list body (e.g. a
   *  post's "..." menu) that reads as a floating card, not a composer, on every screen size. */
  readonly centered = input(false);
  readonly closed = output<void>();

  protected readonly closing = signal(false);
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly backdropClasses = computed(() =>
    this.centered()
      ? 'fixed inset-0 z-[110] flex items-center justify-center bg-ink/60 p-4 transition-opacity duration-[180ms] ease-in'
      : 'fixed inset-0 z-[110] flex items-end justify-center bg-ink/60 transition-opacity duration-[180ms] ease-in sm:items-center sm:p-4'
  );

  // p-5/p-6 decomposed into px/pt/pb rather than left as the shorthand, so pb can add
  // env(safe-area-inset-bottom) on top of the same 1.25rem/1.5rem — mirrors the auth pages' own
  // pt-[calc(2.5rem+env(safe-area-inset-top))] pairing. Missing here is what let a bottom-sheet
  // composer's last row (e.g. the feed composer's Cancelar/Publicar) sit flush against Android's
  // 3-button nav bar — bottom-nav/fab/messages-widget/nav-drawer already had this, this didn't.
  protected readonly panelClasses = computed(
    () =>
      (this.closing() ? 'animate-tennis-pop-out' : 'animate-tennis-pop') +
      (this.centered()
        ? ' w-full max-w-lg rounded-3xl border border-border bg-card px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:px-6 sm:pt-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] '
        : ' w-full max-w-lg rounded-t-3xl border border-border bg-card px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl sm:px-6 sm:pt-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))] ') +
      (this.scrollable() ? 'no-scrollbar max-h-[90vh] overflow-y-auto' : '')
  );

  ngOnDestroy(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }
  }

  /**
   * Only the backdrop itself closes — a click on the panel or one of its inputs must not.
   *
   * Deliberately a method rather than an inline template expression: `target === currentTarget &&
   * requestClose()` evaluates to the literal `false` for every click that isn't on the backdrop,
   * and Angular calls event.preventDefault() whenever a bound expression returns exactly `false` —
   * which silently cancelled the feed composer's file input opening its picker.
   */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  /** Guarded against re-entry so a second tap mid-animation can't restart the exit timer. */
  requestClose(): void {
    if (this.closing()) {
      return;
    }
    this.closing.set(true);
    this.closeTimer = setTimeout(() => this.closed.emit(), DialogComponent.CLOSE_ANIMATION_MS);
  }
}
