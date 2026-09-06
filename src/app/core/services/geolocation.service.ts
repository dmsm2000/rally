import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, type PositionOptions } from '@capacitor/geolocation';

export interface GeoFix {
  lat: number;
  lng: number;
  /** Reported radius of confidence, in metres. The whole court-registration trust model rests on it. */
  accuracyM: number;
}

export type GeoErrorCode = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export class GeoError extends Error {
  constructor(readonly code: GeoErrorCode) {
    super(code);
    this.name = 'GeoError';
  }
}

/**
 * Accuracy (metres) above which a fix can't corroborate anything — mirrors the same threshold in
 * `check_in_court()`/`register_court()`, which are the ones that actually enforce it.
 *
 * Worth knowing why this exists: a phone outdoors reports 5-50 m, but a laptop with no GPS reports
 * the ISP's centroid, which can be 1-5 km out while still looking like a perfectly valid fix. Taking
 * `coords` without reading `coords.accuracy` is what turns "you must be at the court" into a rule
 * that filters nothing.
 */
export const GOOD_FIX_ACCURACY_M = 100;
/** Above this a reading carries no information at all and registration is refused outright. */
export const MAX_FIX_ACCURACY_M = 2000;

const OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };

/**
 * Wraps `@capacitor/geolocation` in something the UI can await and show state for. That plugin
 * ships both a native implementation (real GPS via Android/iOS location services, with its own
 * permission-request flow) and a web one (falls back to `navigator.geolocation` in a plain
 * browser/PWA), so this class works unchanged on native and web.
 */
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly _locating = signal(false);
  readonly locating = this._locating.asReadonly();

  readonly supported = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && 'geolocation' in navigator);

  /** Rejects with a `GeoError` whose `code` the caller maps to a translated message. */
  async locate(): Promise<GeoFix> {
    if (!this.supported) {
      throw new GeoError('unsupported');
    }
    this._locating.set(true);
    try {
      const position = await Geolocation.getCurrentPosition(OPTIONS).catch(error => {
        throw this.toGeoError(error);
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        // Some browsers/devices omit accuracy entirely; treating that as "unknown, therefore
        // unusable" is the safe reading, since every threshold downstream is an upper bound.
        accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : Number.POSITIVE_INFINITY
      };
    } finally {
      this._locating.set(false);
    }
  }

  isGoodFix(fix: GeoFix): boolean {
    return fix.accuracyM <= GOOD_FIX_ACCURACY_M;
  }

  isUsableFix(fix: GeoFix): boolean {
    return fix.accuracyM <= MAX_FIX_ACCURACY_M;
  }

  /**
   * On web this rejects with the browser's own `GeolocationPositionError` (numeric `code` 1-3).
   * On native it rejects with a Capacitor error carrying a string `code` like `OS-PLUG-GLOC-0003`
   * (denied) or `-0010` (timeout) — see `@capacitor/geolocation`'s Android/iOS sources, which
   * share the same numbering. Anything else falls back to 'unavailable', same as before.
   */
  private toGeoError(error: unknown): GeoError {
    const code = (error as { code?: unknown } | undefined)?.code;
    if (code === 1 || code === 'OS-PLUG-GLOC-0003') {
      return new GeoError('denied');
    }
    if (code === 3 || code === 'OS-PLUG-GLOC-0010') {
      return new GeoError('timeout');
    }
    return new GeoError('unavailable');
  }
}
