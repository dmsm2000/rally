import { Injectable, computed, inject, signal } from '@angular/core';
import { CountryDataService } from '../../../core/data/country-data.service';
import { DiscoverableProfile, ProfileRepositoryService } from '../../../core/data/profile-repository.service';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { Accent, Format, Level, Player, Surface } from '../../../core/models';

/** Data-access boundary for player discovery. Real profiles come from the limited discovery RPC. */
@Injectable({ providedIn: 'root' })
export class PlayersRepository {
  private readonly data = inject(RallyDataService);
  private readonly profiles = inject(ProfileRepositoryService);
  private readonly countryData = inject(CountryDataService);
  private readonly discoverable = signal<DiscoverableProfile[]>([]);
  private readonly loaded = signal(false);

  private readonly realPlayers = computed(() => {
    const flags = new Map(this.countryData.countries().map(country => [country.name, country.flag]));
    return this.discoverable().map(profile => this.toPlayer(profile, flags.get(profile.country ?? '') ?? ''));
  });

  constructor() {
    this.countryData.loadCountries();
    void this.loadDiscoverable();
  }

  getAll(): Player[] {
    return this.realPlayers();
  }

  getById(id: string): Player | undefined {
    return this.realPlayers().find(player => player.id === id);
  }

  get levels(): readonly string[] {
    return this.data.levels;
  }

  get surfaces(): readonly string[] {
    return this.data.surfaces;
  }

  countryCoords(country: string): { x: number; y: number } | undefined {
    return this.data.countries().find(c => c.name === country)?.coords;
  }

  private async loadDiscoverable(): Promise<void> {
    if (this.loaded()) {
      return;
    }
    this.loaded.set(true);
    const result = await this.profiles.listDiscoverable();
    if (result.error) {
      console.error('Failed to load discoverable profiles:', result.error);
      return;
    }
    this.discoverable.set(result.profiles);
  }

  private toPlayer(profile: DiscoverableProfile, flag: string): Player {
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    return {
      id: profile.id,
      name,
      initials: name
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      city: profile.city ?? '',
      country: profile.country ?? '',
      flag,
      level: profile.level ?? ('Beginner' as Level),
      years: profile.years ?? 0,
      frequency: profile.frequency ?? '',
      format: profile.format ?? ('Both' as Format),
      surface: profile.surface ?? ('Hard' as Surface),
      availability: profile.availability ?? [],
      distanceKm: undefined,
      matchScore: 0,
      matchReason: profile.bio ?? '',
      bio: profile.bio ?? '',
      stats: { wins: 0, matches: 0, courts: 0, countries: 0 },
      accent: 'lime' as Accent,
      memberNumber: profile.memberNumber ?? undefined,
      gender: profile.gender ?? undefined,
      dominantHand: profile.dominantHand ?? undefined,
      backhand: profile.backhand ?? undefined,
      playStyle: profile.playStyle ?? undefined,
      courtPref: profile.courtPref ?? undefined,
      coached: profile.coached ?? undefined,
      coachedFrequency: profile.coachedFrequency ?? undefined,
      timesOfDay: profile.timesOfDay ?? undefined,
      avatarSeed: profile.avatarSeed ?? profile.id,
      avatarStyle: profile.avatarStyle ?? undefined
    };
  }
}
