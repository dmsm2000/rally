import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { TranslationService } from '../i18n/translation.service';
import { ToastService } from './toast.service';

/**
 * Real, publicly-reachable web origin for links shared out of the app. Never `document.baseURI` on
 * native: that resolves to the WebView's own internal origin (`capacitor://localhost` on iOS,
 * `https://localhost` on Android — see `capacitor.config.ts`'s `androidScheme`), which means
 * nothing outside the device a copied/shared link is opened on. Confirmed 2026-09-11 from a live
 * bug report: every link copied from the native apps read as `.../localhost/posts/...` and failed
 * everywhere it was opened. Matches this project's actual GitHub Pages deploy (the `--base-href
 * /rally/` in the Pages workflow, and the Supabase Site URL configured to the same origin) — same
 * fix shape as `NATIVE_OAUTH_REDIRECT_URL` in AuthService.
 */
const PRODUCTION_WEB_ORIGIN = 'https://dmsm2000.github.io/rally/';

/**
 * Sharing a link to somewhere in the app: the native share sheet where the platform has one
 * (phones, which is where sharing actually happens), the clipboard everywhere else.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);

  /**
   * Absolute URL for an in-app path. Resolved against `document.baseURI` on web — which stays
   * correct under the GitHub Pages sub-path deploy, since the app there genuinely is served from
   * that origin — but against `PRODUCTION_WEB_ORIGIN` on native, where `document.baseURI` would
   * otherwise leak the WebView's own local origin into a link meant to be opened elsewhere.
   */
  urlFor(path: string): string {
    const base = Capacitor.isNativePlatform() ? PRODUCTION_WEB_ORIGIN : document.baseURI;
    return new URL(path.replace(/^\/+/, ''), base).href;
  }

  /**
   * Native (iOS/Android): `navigator.share()` is a Web Share API call, and Capacitor's WebView
   * doesn't reliably implement it — confirmed 2026-09-11, "Mais opções" silently did nothing on a
   * real device. `@capacitor/share`'s `Share.share()` bridges to the real native share sheet
   * (`UIActivityViewController`/`Intent.ACTION_SEND`) instead, the same fix shape as
   * `@capacitor/browser` replacing a raw `window.location` redirect for Google sign-in.
   */
  async share(path: string, title: string): Promise<void> {
    const url = this.urlFor(path);
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title, url });
      } else if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        throw new Error('No share target available');
      }
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
