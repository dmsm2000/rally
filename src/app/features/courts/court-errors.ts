import { GeoError } from '../../core/services/geolocation.service';
import { CourtActionFailure } from './data/courts.repository';

/**
 * Maps anything a court flow can throw — an RPC's refusal or a failed GPS fix — onto the
 * translation key that explains it. Shared so the catalogue and the composer can't drift apart on
 * how the same failure reads.
 */
export function courtErrorKey(error: unknown): string {
  if (error instanceof CourtActionFailure) {
    return `courts.errors.${error.reason}`;
  }
  if (error instanceof GeoError) {
    return `courts.geo.${error.code}`;
  }
  return 'courts.errors.unknown';
}
