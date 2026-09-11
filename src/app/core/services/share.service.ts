import { Injectable, inject } from '@angular/core';
import { TranslationService } from '../i18n/translation.service';
import { ToastService } from './toast.service';

/**
 * Sharing a link to somewhere in the app: the browser's own share sheet where it has one (mobile
 * browsers, which is where sharing actually happens), the clipboard everywhere else.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);

  /**
   * Absolute URL for an in-app path. Resolved against `document.baseURI`, not `location.origin`:
   * the GitHub Pages deploy is served from a sub-path (`--base-href /rally/`), so dropping the
   * base would produce a link to a route that doesn't exist at the domain root.
   */
  urlFor(path: string): string {
    return new URL(path.replace(/^\/+/, ''), document.baseURI).href;
  }

  /**
   * Offers the Web Share API where the browser has it (mobile Safari/Chrome hand this to the OS
   * share sheet), and falls back to the clipboard everywhere else — including desktop browsers,
   * which mostly don't implement it at all.
   */
  async share(path: string, title: string): Promise<void> {
    const url = this.urlFor(path);
    try {
      if (!navigator.share) {
        throw new Error('No share target available');
      }
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
    await this.copyToClipboard(url);
  }

  /** Copy without offering the share sheet first — the explicit "copy link" menu action. */
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
