import { Injectable, signal } from '@angular/core';

export interface LightboxMedia {
  url: string;
  type: 'image' | 'video';
}

/** Imperative full-screen media viewer — mounted once via `ui-media-lightbox` in app.html. */
@Injectable({ providedIn: 'root' })
export class MediaLightboxService {
  private readonly _active = signal<LightboxMedia | null>(null);

  readonly active = this._active.asReadonly();

  open(media: LightboxMedia): void {
    this._active.set(media);
  }

  close(): void {
    this._active.set(null);
  }
}
