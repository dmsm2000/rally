import { Injectable } from '@angular/core';
import twemoji from '@twemoji/api';

// Pinned to the installed @twemoji/api version so the CDN artwork can't drift/break unexpectedly.
const SVG_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/';

/**
 * Renders every emoji character in the DOM as a Twemoji SVG `<img>` — same look on iOS/Android/desktop,
 * instead of each device's own (inconsistent) emoji font. Started once from the root `App` component.
 */
@Injectable({ providedIn: 'root' })
export class TwemojiRendererService {
  private observer?: MutationObserver;
  private renderScheduled = false;

  start(): void {
    if (this.observer) {
      return;
    }
    this.render();
    // Angular re-renders content constantly (route changes, toasts, dialogs) — keep re-parsing new
    // text as it appears. twemoji.parse() is idempotent, so re-running it on already-converted
    // content (including the <img> tags it just inserted) is a cheap no-op.
    this.observer = new MutationObserver(() => this.scheduleRender());
    this.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  private scheduleRender(): void {
    if (this.renderScheduled) {
      return;
    }
    this.renderScheduled = true;
    queueMicrotask(() => {
      this.renderScheduled = false;
      this.render();
    });
  }

  private render(): void {
    twemoji.parse(document.body, { base: SVG_BASE, folder: 'svg', ext: '.svg' });
  }
}
