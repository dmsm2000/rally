import { Component, computed, inject, signal } from '@angular/core';
import { CountryDataService } from '../../../core/data/country-data.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { TripIntent } from '../../../core/models';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { IconComponent, SectionHeaderComponent } from '../../../shared/ui';
import { TripsRepository } from '../../world/data/trips.repository';

/**
 * "My trips" on the profile page — the published `trip_intents` a player can withdraw.
 *
 * Its own component because it shares nothing with the profile drafts it used to sit among: it
 * loads its own rows, and owning the loading state here means the profile page no longer carries
 * three signals and three methods for a strip of cards.
 */
@Component({
  selector: 'rally-my-trips-section',
  imports: [IconComponent, SectionHeaderComponent, TranslatePipe],
  templateUrl: './my-trips-section.component.html',
  styleUrl: './my-trips-section.component.scss'
})
export class MyTripsSectionComponent {
  private readonly trips = inject(TripsRepository);
  private readonly countryData = inject(CountryDataService);
  private readonly translation = inject(TranslationService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly myTrips = signal<TripIntent[]>([]);
  protected readonly loading = signal(true);
  protected readonly deletingTripId = signal<string | null>(null);

  protected readonly countryFlags = computed(() =>
    Object.fromEntries(this.countryData.countries().map(c => [c.name, c.flag]))
  );

  constructor() {
    void this.load();
  }

  protected formatTripDate(iso: string): string {
    return this.trips.formatDate(iso);
  }

  protected async deleteTrip(trip: TripIntent): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: this.translation.t('profile.deleteTripConfirmLead'),
      confirmLabel: this.translation.t('profile.deleteTripConfirmButton'),
      cancelLabel: this.translation.t('common.cancel'),
      tone: 'destructive'
    });
    if (!confirmed) {
      return;
    }
    this.deletingTripId.set(trip.id);
    const success = await this.trips.deleteTrip(trip.id);
    this.deletingTripId.set(null);
    if (success) {
      this.myTrips.update(list => list.filter(t => t.id !== trip.id));
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.myTrips.set(await this.trips.myTrips());
    this.loading.set(false);
  }
}
