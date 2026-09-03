import { Injectable, signal } from '@angular/core';

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

/** Wraps the browser geolocation API in something the UI can await and show state for. */
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private readonly _locating = signal(false);
  readonly locating = this._locating.asReadonly();

  readonly supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  /** Rejects with a `GeoError` whose `code` the caller maps to a translated message. */
  async locate(): Promise<GeoFix> {
    if (!this.supported) {
      throw new GeoError('unsupported');
    }
    this._locating.set(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, error => reject(this.toGeoError(error)), OPTIONS);
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        // Some browsers omit accuracy entirely; treating that as "unknown, therefore unusable" is
        // the safe reading, since every threshold downstream is an upper bound.
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

  private toGeoError(error: GeolocationPositionError): GeoError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new GeoError('denied');
      case error.TIMEOUT:
        return new GeoError('timeout');
      default:
        return new GeoError('unavailable');
    }
  }
}
