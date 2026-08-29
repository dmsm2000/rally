import { Injectable, computed, inject, signal } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';
import { MapMarker } from '../../shared/components';

@Injectable({ providedIn: 'root' })
export class WorldService {
  private readonly data = inject(RallyDataService);

  readonly destinations = this.data.destinations;
  readonly countries = this.data.countries;
  readonly courts = this.data.courts;
  readonly activity = this.data.worldActivity;
  readonly communityStats = this.data.communityStats;

  readonly selectedId = signal(this.destinations()[0]?.id ?? '');
  readonly selectedDestination = computed(() => this.destinations().find((d) => d.id === this.selectedId()) ?? this.destinations()[0]);

  readonly markers = computed<MapMarker[]>(() => [
    ...this.destinations().map((d) => ({ id: d.id, x: d.coords.x, y: d.coords.y, kind: 'destination' as const, label: d.city })),
    ...this.courts().map((c) => ({ id: `court-${c.id}`, x: c.coords.x + 1, y: c.coords.y + 2, kind: 'court' as const, label: c.name })),
    ...this.activity().map((a) => ({ id: a.id, x: a.coords.x, y: a.coords.y, kind: 'activity' as const, label: a.city })),
    ...this.countries()
      .filter((c) => !c.visited)
      .map((c) => ({ id: `l-${c.name}`, x: c.coords.x, y: c.coords.y, kind: 'locked' as const, label: c.name })),
  ]);

  select(id: string): void {
    if (this.destinations().some((d) => d.id === id)) {
      this.selectedId.set(id);
    }
  }

  readonly tripDestinationId = signal('');
  readonly tripFromDate = signal('');
  readonly tripToDate = signal('');
  readonly tripNote = signal('');

  readonly meId = computed(() => this.data.me().id);

  readonly openTripIntents = computed(() =>
    this.data
      .tripIntents()
      .filter((t) => t.status === 'open')
      .map((t) => ({
        intent: t,
        player: this.data.playerById(t.playerId),
        destination: this.destinations().find((d) => d.id === t.destinationId),
      })),
  );

  publishTripIntent(): void {
    if (!this.tripDestinationId() || !this.tripFromDate() || !this.tripToDate() || !this.tripNote()) {
      return;
    }
    this.data.createTripIntent({
      destinationId: this.tripDestinationId(),
      fromDate: this.tripFromDate(),
      toDate: this.tripToDate(),
      note: this.tripNote(),
    });
    this.tripDestinationId.set('');
    this.tripFromDate.set('');
    this.tripToDate.set('');
    this.tripNote.set('');
  }

  volunteerForTrip(tripId: string): void {
    this.data.volunteerForTrip(tripId);
  }
}
