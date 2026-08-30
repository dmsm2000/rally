import { Injectable, signal } from '@angular/core';

/** UI-only state for the floating messages widget — kept separate from message data. */
@Injectable({ providedIn: 'root' })
export class MessagesWidgetService {
  private readonly _isOpen = signal(false);
  private readonly _activePlayerId = signal<string | null>(null);

  readonly isOpen = this._isOpen.asReadonly();
  readonly activePlayerId = this._activePlayerId.asReadonly();

  // Set whenever something opens the widget, so the widget's own "click outside closes it" listener
  // doesn't immediately close it again when the opening click (e.g. a "Message" button elsewhere on
  // the page) bubbles up to the document.
  private suppressNextOutsideClose = false;

  toggle(): void {
    this._isOpen.update((value) => !value);
    this.suppressNextOutsideClose = true;
  }

  close(): void {
    this._isOpen.set(false);
  }

  // Opens the widget on the conversation list.
  openList(): void {
    this._activePlayerId.set(null);
    this._isOpen.set(true);
    this.suppressNextOutsideClose = true;
  }

  // Opens the widget straight into a specific conversation, e.g. from a player's "Message" button.
  openThread(playerId: string): void {
    this._activePlayerId.set(playerId);
    this._isOpen.set(true);
    this.suppressNextOutsideClose = true;
  }

  backToList(): void {
    this._activePlayerId.set(null);
  }

  // Consumes the suppression flag — returns true (once) right after an open call.
  consumeOutsideCloseSuppression(): boolean {
    if (!this.suppressNextOutsideClose) {
      return false;
    }
    this.suppressNextOutsideClose = false;
    return true;
  }
}
