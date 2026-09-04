import { Injectable } from '@angular/core';

export interface ReverseGeocodeResult {
  /** ISO 3166-1 alpha-2, uppercase — matched against `CountryDataService`'s own `iso2`. */
  countryCode: string;
  city?: string;
}

/**
 * Best-effort reverse geocoding via Nominatim (OpenStreetMap) — free, no API key, no account. Used
 * only to prefill registration's country/city fields once the player grants location access; a
 * failed or unmatched lookup never blocks the form, since both fields stay manually editable.
 */
@Injectable({ providedIn: 'root' })
export class ReverseGeocodeService {
  async lookup(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      const address = response.ok ? (await response.json())?.address : null;
      const countryCode = typeof address?.country_code === 'string' ? address.country_code.toUpperCase() : '';
      if (!countryCode) {
        return null;
      }
      const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;
      return { countryCode, city: typeof city === 'string' ? city : undefined };
    } catch {
      return null;
    }
  }
}
