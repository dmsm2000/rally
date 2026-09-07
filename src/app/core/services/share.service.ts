import { Injectable, inject } from '@angular/core';
import { TranslationService } from '../i18n/translation.service';
import { ToastService } from './toast.service';

/**
 * Sharing a link to somewhere in the app: the native share sheet where the platform has one
 * (phones, which is where sharing actually happens), the clipboard everywhere else.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);

  /**
   * Absolute URL for an in-app path. Resolved against `document.baseURI` rather than
   * `location.origin` so it stays correct under the GitHub Pages sub-path deploy, where the app
   * is not served from the domain root.
   */
  urlFor(path: string): string {
    return new URL(path.replace(/^\/+/, ''), document.baseURI).href;
  }

  async share(path: string, title: string): Promise<void> {
    const url = this.urlFor(path);
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Deliberately falls through to the clipboard on *any* rejection, including AbortError.
        // That name is supposed to mean "the user dismissed the sheet", but some browser/OS
        // combinations also reject with it when there's simply no registered share target — with
        // nothing else to distinguish the two, treating every AbortError as "leave it alone" made
        // the button silently do nothing on those, with no console error to explain why. Copying
        // the link after a genuine cancel is mildly redundant; never producing any feedback at all
        // is worse.
      }
    }
    await this.copyToClipboard(url);
  }

  /** Copy without offering the native sheet first — the explicit "copy link" menu action. */
  async copyLink(path: string): Promise<void> {
    await this.copyToClipboard(this.urlFor(path));
  }

  /**
   * The inverse of `urlFor('posts/:id')` — recognizes a DM whose body IS (only) a link to a post,
   * so the messages widget can render it as a distinct shared-post bubble instead of a raw URL.
   * Deliberately exact: a caption typed alongside a pasted link is a normal message, not a share.
   */
  postIdFromShareLink(text: string): string | null {
    try {
      const url = new URL(text.trim());
      const match = /\/posts\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(url.pathname);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  private async copyToClipboard(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success(this.translation.t('common.linkCopied'));
    } catch {
      // The Clipboard API needs a secure context and permission; there's nothing left to try.
      this.toast.error(this.translation.t('common.shareFailed'));
    }
  }
}
