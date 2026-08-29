import { Injectable } from '@angular/core';
import { Avatar, Style } from '@dicebear/core';
import lorelei from '@dicebear/styles/lorelei.json';
import notionists from '@dicebear/styles/notionists.json';
import openPeeps from '@dicebear/styles/open-peeps.json';
import thumbs from '@dicebear/styles/thumbs.json';

// All four styles are CC0 1.0 (public domain, no attribution required) — safe for a commercial app.
export type AvatarStyleId = 'lorelei' | 'notionists' | 'open-peeps' | 'thumbs';

export const AVATAR_STYLES: AvatarStyleId[] = ['lorelei', 'notionists', 'open-peeps', 'thumbs'];

// Grass / clay / hard-court tones — every avatar sits on a "court" instead of a generic pastel background.
const COURT_BACKGROUND_COLORS = ['b6e388', 'e2926b', '7fa8d9'];

const STYLE_DEFINITIONS: Record<AvatarStyleId, unknown> = {
  lorelei,
  notionists,
  'open-peeps': openPeeps,
  thumbs,
};

// Style instances are validated once and reused across every avatar render.
const styleInstances = new Map<AvatarStyleId, Style<unknown>>();

function resolveStyle(style: AvatarStyleId): Style<unknown> {
  let instance = styleInstances.get(style);
  if (!instance) {
    instance = new Style(STYLE_DEFINITIONS[style]);
    styleInstances.set(style, instance);
  }
  return instance;
}

/** Renders deterministic DiceBear avatars entirely client-side — same seed + style always produce the same image. */
@Injectable({ providedIn: 'root' })
export class AvatarService {
  readonly styles = AVATAR_STYLES;

  private readonly cache = new Map<string, string>();

  isKnownStyle(style: string | undefined): style is AvatarStyleId {
    return !!style && (AVATAR_STYLES as string[]).includes(style);
  }

  dataUri(seed: string, style: AvatarStyleId, size = 128): string {
    const key = `${style}:${seed}:${size}`;
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }
    const uri = new Avatar(resolveStyle(style), { seed, size, backgroundColor: COURT_BACKGROUND_COLORS }).toDataUri();
    this.cache.set(key, uri);
    return uri;
  }
}
