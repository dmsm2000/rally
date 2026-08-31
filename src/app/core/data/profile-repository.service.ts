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
  age: number | null;
  gender: Gender | null;
  dominant_hand: Hand | null;
  backhand: Backhand | null;
  city: string | null;
  country: string | null;
  max_distance_km: number | null;
  level: Level | null;
  years: number | null;
  play_style: PlayStyle | null;
  format: Format | null;
  surface: Surface | null;
  court_pref: CourtPref | null;
  frequency: Frequency | null;
  coached: boolean | null;
  coached_frequency: Frequency | null;
  times_of_day: TimeOfDay[] | null;
  availability: AvailabilityOption[] | null;
  bio: string | null;
  avatar_seed: string | null;
  avatar_style: AvatarStyleId | null;
}

/** Data-access boundary for the real (non-mock) `profiles` Supabase table, written to at registration. */
@Injectable({ providedIn: 'root' })
export class ProfileRepositoryService {
  async insert(
    userId: string,
    profile: Partial<Player> & { firstName: string; lastName: string }
  ): Promise<{ success: boolean; error?: string; memberNumber?: string }> {
    // Player stores these as loose string/boolean (see conventions notes on circular imports) — cast
    // back to the real union types here, since the DB enum columns will reject anything else anyway.
    const row: ProfileRow = {
      id: userId,
      first_name: profile.firstName,
      last_name: profile.lastName,
      age: profile.age ?? null,
      gender: (profile.gender as Gender) ?? null,
      dominant_hand: (profile.dominantHand as Hand) ?? null,
      backhand: (profile.backhand as Backhand) ?? null,
      city: profile.city ?? null,
      country: profile.country ?? null,
      max_distance_km: profile.maxDistanceKm ?? null,
      level: profile.level ?? null,
      years: profile.years ?? null,
      play_style: (profile.playStyle as PlayStyle) ?? null,
      format: profile.format ?? null,
      surface: profile.surface ?? null,
      court_pref: (profile.courtPref as CourtPref) ?? null,
      frequency: (profile.frequency as Frequency) ?? null,
      coached: profile.coached ?? null,
      coached_frequency: (profile.coachedFrequency as Frequency) ?? null,
      times_of_day: (profile.timesOfDay as TimeOfDay[]) ?? null,
      availability: (profile.availability as AvailabilityOption[]) ?? null,
      bio: profile.bio ?? null,
      avatar_seed: profile.avatarSeed ?? null,
      avatar_style: (profile.avatarStyle as AvatarStyleId) ?? null
    };
    const { data, error } = await supabase.from('profiles').insert(row).select('member_number').single();
    if (error) {
      return { success: false, error: error.message };
    }
    // Zero-padded to match the mock format already used on the passport/profile hero (e.g. "000482").
    return { success: true, memberNumber: String(data.member_number).padStart(6, '0') };
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
      age: row.age ?? undefined,
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
}
