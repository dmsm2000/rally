import { Injectable, signal } from '@angular/core';
import { getAllCitiesOfCountry, getCountries } from '@countrystatecity/countries-browser';

export interface CountryLite {
  name: string;
  iso2: string;
  flag: string;
}

/**
 * Wraps @countrystatecity/countries-browser (CDN-backed, same lazy-loading precedent as the
 * Twemoji CDN dependency) to feed the register/profile "country" + "city" fields. Country list and
 * each country's city list are fetched once and cached for the lifetime of the app.
 */
@Injectable({ providedIn: 'root' })
export class CountryDataService {
  private readonly _countries = signal<CountryLite[]>([]);
  private countriesPromise: Promise<CountryLite[]> | null = null;
  private readonly citiesCache = new Map<string, Promise<string[]>>();

  readonly countries = this._countries.asReadonly();

  /** Loads (and caches) the full country list once, lazily, on first call. */
  async loadCountries(): Promise<CountryLite[]> {
    if (!this.countriesPromise) {
      this.countriesPromise = getCountries().then(list => {
        const mapped = list
          .map(c => ({ name: c.name, iso2: c.iso2, flag: c.emoji }))
          .sort((a, b) => a.name.localeCompare(b.name));
        this._countries.set(mapped);
        return mapped;
      });
    }
    return this.countriesPromise;
  }

  /** Loads (and caches) every distinct city name for a country, lazily per country code. */
  async citiesFor(countryIso2: string): Promise<string[]> {
    if (!countryIso2) {
      return Promise.resolve([]);
    }
    let promise = this.citiesCache.get(countryIso2);
    if (!promise) {
      promise = getAllCitiesOfCountry(countryIso2).then(cities =>
        [...new Set(cities.map(c => c.name))].sort((a, b) => a.localeCompare(b))
      );
      this.citiesCache.set(countryIso2, promise);
    }
    return promise;
  }
}
