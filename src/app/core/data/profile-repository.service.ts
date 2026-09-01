import { Injectable } from '@angular/core';
import { supabase } from '../auth/supabase.client';
import {
  AvailabilityOption,
  Backhand,
  CourtPref,
  Frequency,
  Gender,
  Hand,
  PlayStyle,
  TimeOfDay
} from './player-profile-options';
import { AvatarStyleId } from '../services/avatar.service';
import { Format, Level, Player, Surface } from '../models';

/** Row shape of the real `profiles` Supabase table — see supabase/migrations/0001_profiles.sql. */
interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  gender?: Gender | null;
  dominant_hand?: Hand | null;
  backhand?: Backhand | null;
  city?: string | null;
  country?: string | null;
  max_distance_km?: number | null;
  level?: Level | null;
  years?: number | null;
  play_style?: PlayStyle | null;
  format?: Format | null;
  surface?: Surface | null;
  court_pref?: CourtPref | null;
  frequency?: Frequency | null;
  coached?: boolean | null;
  coached_frequency?: Frequency | null;
  times_of_day?: TimeOfDay[] | null;
  availability?: AvailabilityOption[] | null;
  bio?: string | null;
  avatar_seed?: string | null;
  avatar_style?: AvatarStyleId | null;
}

/** Data-access boundary for the real (non-mock) `profiles` Supabase table, written to at registration. */
@Injectable({ providedIn: 'root' })
export class ProfileRepositoryService {
  async insert(
    userId: string,
    profile: Partial<Player> & { firstName: string; lastName: string }
  ): Promise<{ success: boolean; error?: string; memberNumber?: string }> {
    const row: ProfileRow = {
      id: userId,
      first_name: profile.firstName,
      last_name: profile.lastName,
      ...this.toRowFields(profile)
    };
    const { data, error } = await supabase.from('profiles').insert(row).select('member_number').single();
    if (error) {
      return { success: false, error: error.message };
    }
    // Zero-padded to match the mock format already used on the passport/profile hero (e.g. "000482").
    return { success: true, memberNumber: String(data.member_number).padStart(6, '0') };
  }

  /** Updates only the fields present on `profile` — used to save one profile-page section at a time. */
  async update(userId: string, profile: Partial<Player>): Promise<{ success: boolean; error?: string }> {
    const row = this.toRowFields(profile);
    if (Object.keys(row).length === 0) {
      return { success: true };
    }
    const { error } = await supabase.from('profiles').update(row).eq('id', userId);
    return error ? { success: false, error: error.message } : { success: true };
  }

  /** Fetches the signed-in user's real profile row, mapped back into the app's Player shape. */
  async getByUserId(userId: string): Promise<Partial<Player> | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.error('Failed to load profile row:', error.message);
      return null;
    }
    if (!data) {
      return null;
    }
    const row = data as ProfileRow & { member_number: number };
    return {
      name: `${row.first_name} ${row.last_name}`.trim(),
      birthDate: row.birth_date ?? undefined,
      gender: row.gender ?? undefined,
      dominantHand: row.dominant_hand ?? undefined,
      backhand: row.backhand ?? undefined,
      city: row.city ?? undefined,
      country: row.country ?? undefined,
      maxDistanceKm: row.max_distance_km ?? undefined,
      level: row.level ?? undefined,
      years: row.years ?? undefined,
      playStyle: row.play_style ?? undefined,
      format: row.format ?? undefined,
      surface: row.surface ?? undefined,
      courtPref: row.court_pref ?? undefined,
      frequency: row.frequency ?? undefined,
      coached: row.coached ?? undefined,
      coachedFrequency: row.coached_frequency ?? undefined,
      timesOfDay: row.times_of_day ?? undefined,
      availability: row.availability ?? undefined,
      bio: row.bio ?? undefined,
      avatarSeed: row.avatar_seed ?? undefined,
      avatarStyle: row.avatar_style ?? undefined,
      memberNumber: String(row.member_number).padStart(6, '0')
    };
  }

  /** Permanently deletes the signed-in user's auth account (cascades to their profile row too). */
  async deleteOwnAccount(): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.rpc('delete_own_account');
    return error ? { success: false, error: error.message } : { success: true };
  }

  // Player stores these as loose string/boolean (see conventions notes on circular imports) — cast
  // back to the real union types here, since only those exact strings are valid options anyway.
  // Only includes keys actually present on `profile`, so partial updates don't clobber other columns.
  private toRowFields(profile: Partial<Player>): Partial<Omit<ProfileRow, 'id' | 'first_name' | 'last_name'>> {
    const row: Partial<Omit<ProfileRow, 'id' | 'first_name' | 'last_name'>> = {};
    if (profile.birthDate !== undefined) {
      row.birth_date = profile.birthDate;
    }
    if (profile.gender !== undefined) {
      row.gender = profile.gender as Gender;
    }
    if (profile.dominantHand !== undefined) {
      row.dominant_hand = profile.dominantHand as Hand;
    }
    if (profile.backhand !== undefined) {
      row.backhand = profile.backhand as Backhand;
    }
    if (profile.city !== undefined) {
      row.city = profile.city;
    }
    if (profile.country !== undefined) {
      row.country = profile.country;
    }
    if (profile.maxDistanceKm !== undefined) {
      row.max_distance_km = profile.maxDistanceKm;
    }
    if (profile.level !== undefined) {
      row.level = profile.level;
    }
    if (profile.years !== undefined) {
      row.years = profile.years;
    }
    if (profile.playStyle !== undefined) {
      row.play_style = profile.playStyle as PlayStyle;
    }
    if (profile.format !== undefined) {
      row.format = profile.format;
    }
    if (profile.surface !== undefined) {
      row.surface = profile.surface;
    }
    if (profile.courtPref !== undefined) {
      row.court_pref = profile.courtPref as CourtPref;
    }
    if (profile.frequency !== undefined) {
      row.frequency = profile.frequency as Frequency;
    }
    if (profile.coached !== undefined) {
      row.coached = profile.coached;
    }
    if (profile.coachedFrequency !== undefined) {
      row.coached_frequency = profile.coachedFrequency as Frequency;
    }
    if (profile.timesOfDay !== undefined) {
      row.times_of_day = profile.timesOfDay as TimeOfDay[];
    }
    if (profile.availability !== undefined) {
      row.availability = profile.availability as AvailabilityOption[];
    }
    if (profile.bio !== undefined) {
      row.bio = profile.bio;
    }
    if (profile.avatarSeed !== undefined) {
      row.avatar_seed = profile.avatarSeed;
    }
    if (profile.avatarStyle !== undefined) {
      row.avatar_style = profile.avatarStyle as AvatarStyleId;
    }
    return row;
  }
}
