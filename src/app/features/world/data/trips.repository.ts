import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { supabase } from '../../../core/auth/supabase.client';
import { TranslationService } from '../../../core/i18n/translation.service';
import { TripIntent } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { MessagesService } from '../../messages/messages.service';

interface TripIntentRow {
  id: string;
  player_id: string;
  destination_country: string;
  destination_city: string;
  from_date: string;
  to_date: string;
  note: string;
  created_at: string;
}

const UNIQUE_VIOLATION = '23505';

/** Data-access boundary for "show me around" trip intents (see supabase/migrations/0011_trip_intents.sql). */
@Injectable({ providedIn: 'root' })
export class TripsRepository {
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessagesService);
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);

  /** Any open trip to this country — not just the viewer's exact city, since a fellow local
   * elsewhere in the same country may still be well placed (or willing) to host. */
  async hostRequestsForCountry(country: string): Promise<TripIntent[]> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('trip_intents')
      .select('id,player_id,destination_country,destination_city,from_date,to_date,note,created_at')
      .eq('destination_country', country)
      .gte('to_date', today)
      .order('from_date', { ascending: true });
    if (error || !data) {
      console.error('Failed to load trip intents:', error?.message);
      return [];
    }
    return (data as TripIntentRow[]).map(row => this.toTripIntent(row));
  }

  /** The signed-in user's own published trips, most recently posted first. */
  async myTrips(): Promise<TripIntent[]> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return [];
    }
    const { data, error } = await supabase
      .from('trip_intents')
      .select('id,player_id,destination_country,destination_city,from_date,to_date,note,created_at')
      .eq('player_id', uid)
      .order('created_at', { ascending: false });
    if (error || !data) {
      console.error('Failed to load my trips:', error?.message);
      return [];
    }
    return (data as TripIntentRow[]).map(row => this.toTripIntent(row));
  }

  /** Deletes one of the signed-in user's own trips (cascades to trip_hosts — see migration 0012). */
  async deleteTrip(tripId: string): Promise<boolean> {
    const { error } = await supabase.from('trip_intents').delete().eq('id', tripId);
    if (error) {
      console.error('Failed to delete trip intent:', error.message);
      this.toast.error(this.translation.t('profile.deleteTripFailed'));
      return false;
    }
    return true;
  }

  /** Which of these trips the signed-in user has already volunteered to host. */
  async myVolunteeredTripIds(tripIds: string[]): Promise<Set<string>> {
    const uid = this.auth.currentUserId();
    if (!uid || tripIds.length === 0) {
      return new Set();
    }
    const { data, error } = await supabase.from('trip_hosts').select('trip_intent_id').eq('host_id', uid).in('trip_intent_id', tripIds);
    if (error || !data) {
      console.error('Failed to load volunteered trips:', error?.message);
      return new Set();
    }
    return new Set(data.map(row => row.trip_intent_id as string));
  }

  /** Returns the new trip's id (used to link its announcement post — see WorldService.publishTripIntent), or null on failure. */
  async publish(input: { destinationCountry: string; destinationCity: string; fromDate: string; toDate: string; note: string }): Promise<string | null> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return null;
    }
    const { data, error } = await supabase
      .from('trip_intents')
      .insert({
        player_id: uid,
        destination_country: input.destinationCountry,
        destination_city: input.destinationCity,
        from_date: input.fromDate,
        to_date: input.toDate,
        note: input.note
      })
      .select('id')
      .single();
    if (error || !data) {
      console.error('Failed to publish trip intent:', error?.message);
      this.toast.error(this.translation.t('world.tripPublishFailed'));
      return null;
    }
    return data.id as string;
  }

  /** Trip intents by id, for hydrating the feed's trip-announcement posts — see PostsRepository.hydrate(). */
  async getByIds(ids: string[]): Promise<TripIntent[]> {
    if (ids.length === 0) {
      return [];
    }
    const { data, error } = await supabase
      .from('trip_intents')
      .select('id,player_id,destination_country,destination_city,from_date,to_date,note,created_at')
      .in('id', ids);
    if (error || !data) {
      console.error('Failed to load trip intents by id:', error?.message);
      return [];
    }
    return (data as TripIntentRow[]).map(row => this.toTripIntent(row));
  }

  /** Trip intent ids whose destination matches this scope — powers the feed's destination-based visibility (see PostsRepository.list()). */
  async idsForDestination(destinationCountry: string, destinationCity?: string): Promise<string[]> {
    let query = supabase.from('trip_intents').select('id').eq('destination_country', destinationCountry);
    if (destinationCity) {
      query = query.eq('destination_city', destinationCity);
    }
    const { data, error } = await query;
    if (error || !data) {
      console.error('Failed to load trip intents for destination:', error?.message);
      return [];
    }
    return data.map(row => row.id as string);
  }

  /**
   * Records the volunteer offer and sends the traveller a real automatic message — the trip intent
   * itself is left untouched/visible, since other locals may also want to host (see PRODUCT.md).
   */
  async volunteer(trip: TripIntent): Promise<boolean> {
    const uid = this.auth.currentUserId();
    if (!uid) {
      return false;
    }
    const { error } = await supabase.from('trip_hosts').insert({ trip_intent_id: trip.id, host_id: uid });
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return true;
      }
      console.error('Failed to record volunteering:', error.message);
      this.toast.error(this.translation.t('world.volunteerFailed'));
      return false;
    }

    const message = this.translation.t('world.hostAutoMessage', {
      city: trip.destinationCity,
      fromDate: this.formatDate(trip.fromDate),
      toDate: this.formatDate(trip.toDate)
    });
    try {
      const conversationId = await this.messages.ensureConversationWithPlayer(trip.playerId);
      this.messages.send(conversationId, message);
    } catch (err) {
      console.error('Failed to message the traveller:', err);
    }
    return true;
  }

  formatDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(this.translation.locale(), { day: 'numeric', month: 'short' }).format(date);
  }

  private toTripIntent(row: TripIntentRow): TripIntent {
    return {
      id: row.id,
      playerId: row.player_id,
      destinationCountry: row.destination_country,
      destinationCity: row.destination_city,
      fromDate: row.from_date,
      toDate: row.to_date,
      note: row.note,
      createdAt: row.created_at
    };
  }
}
