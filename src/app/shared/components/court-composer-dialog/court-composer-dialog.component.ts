import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SURFACES } from '../../../core/data/player-profile-options';
import { COURT_FACILITIES, Court, NearbyVenue, VENUE_ACCESS_OPTIONS, VENUE_KINDS } from '../../../core/models';
import { CourtComposerService } from '../../../features/courts/court-composer.service';
import { CourtsService } from '../../../features/courts/courts.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AutocompleteComponent, ChipComponent, DialogComponent, IconComponent } from '../../ui';

/**
 * The one place a court can be registered, used both from the courts catalogue and from the match
 * composer — a single source of truth for validation, the duplicate check and copy.
 *
 * It also carries the verification funnel: the nearby list is the only surface anywhere in the app
 * that shows draft venues, and it only shows them to someone standing next to one. That is
 * deliberate — a draft is invisible to the catalogue, the feed and search, so if it were invisible
 * here too, no draft could ever be confirmed and the state would be a dead end.
 */
@Component({
  selector: 'rally-court-composer-dialog',
  imports: [FormsModule, ChipComponent, DialogComponent, IconComponent, AutocompleteComponent, TranslatePipe],
  templateUrl: './court-composer-dialog.component.html'
})
export class CourtComposerDialogComponent {
  protected readonly composer = inject(CourtComposerService);
  protected readonly courts = inject(CourtsService);

  protected readonly surfaces = SURFACES;
  protected readonly kinds = VENUE_KINDS;
  protected readonly accessOptions = VENUE_ACCESS_OPTIONS;
  protected readonly facilities = COURT_FACILITIES;

  /** Which nearby venue is expanded to show its courts, so they can be captured/confirmed. */
  protected readonly expandedVenueId = signal<string | null>(null);
  protected readonly venueCourts = signal<Record<string, Court[]>>({});
  protected readonly loadingVenueId = signal<string | null>(null);

  protected async toggleVenue(venue: NearbyVenue): Promise<void> {
    if (this.expandedVenueId() === venue.id) {
      this.expandedVenueId.set(null);
      return;
    }
    this.expandedVenueId.set(venue.id);
    if (this.venueCourts()[venue.id]) {
      return;
    }
    this.loadingVenueId.set(venue.id);
    const courts = await this.courts.courtsForVenue(venue.id);
    this.venueCourts.update(map => ({ ...map, [venue.id]: courts }));
    this.loadingVenueId.set(null);
  }

  protected courtsFor(venueId: string): Court[] {
    return this.venueCourts()[venueId] ?? [];
  }

  /** Confirming someone else's draft from here is what promotes it — so refresh the list after. */
  protected async capture(court: Court): Promise<void> {
    await this.courts.capture(court);
    const refreshed = await this.courts.courtsForVenue(court.venueId);
    this.venueCourts.update(map => ({ ...map, [court.venueId]: refreshed }));
    await this.composer.locate();
  }

  protected distanceLabel(metres: number): string {
    return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
  }

  protected courtName(court: Court): string {
    return court.number ?? '—';
  }
}
