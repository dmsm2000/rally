import { Injectable } from '@angular/core';

/**
 * Sharing a link to somewhere in the app — currently just "copy it to the clipboard", which is the
 * one thing that reliably works everywhere. An earlier version also offered the Web Share API
 * (handing off to the OS's own share sheet) and an in-app "send to a contact" list; both were
 * pulled after round-tripping through enough platform-specific bugs (a macOS share popover left
 * floating detached from anything, a dialog that closed itself on a plain cancel) to not be worth
 * the complexity — see this file's git history if that's ever worth revisiting.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  /**
   * Absolute URL for an in-app path. Resolved against `document.baseURI`, not `location.origin`:
   * the GitHub Pages deploy is served from a sub-path (`--base-href /rally/`), so dropping the
   * base would produce a link to a route that doesn't exist at the domain root.
   */
  urlFor(path: string): string {
    return new URL(path.replace(/^\/+/, ''), document.baseURI).href;
  }

  /**
   * Copies the absolute URL for `path` to the clipboard. Returns whether it actually worked, so
   * the caller can show accurate success/failure feedback instead of assuming one or the other.
   */
  async copyLink(path: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.urlFor(path));
      return true;
    } catch {
      // The Clipboard API needs a secure context and permission; there's nothing left to try.
      return false;
    }
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
}
