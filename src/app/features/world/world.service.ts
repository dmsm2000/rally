import { Injectable, computed, inject, signal } from '@angular/core';
import { RallyDataService } from '../../core/data/rally-data.service';
import { MapMarker } from '../../shared/components';

@Injectable({ providedIn: 'root' })
export class WorldService {
  private readonly data = inject(RallyDataService);

  readonly destinations = this.data.destinations;
  readonly countries = this.data.countries;
  readonly courts = this.data.courts;

  readonly selectedId = signal(this.destinations()[0]?.id ?? '');
  readonly selectedDestination = computed(() => this.destinations().find((d) => d.id === this.selectedId()) ?? this.destinations()[0]);

  readonly markers = computed<MapMarker[]>(() => [
    ...this.destinations().map((d) => ({ id: d.id, x: d.coords.x, y: d.coords.y, kind: 'destination' as const, label: d.city })),
    ...this.courts().map((c) => ({ id: `court-${c.id}`, x: c.coords.x + 1, y: c.coords.y + 2, kind: 'court' as const, label: c.name })),
    ...this.countries()
      .filter((c) => !c.visited)
      .map((c) => ({ id: `l-${c.name}`, x: c.coords.x, y: c.coords.y, kind: 'locked' as const, label: c.name })),
  ]);

  readonly abroadPlayers = computed(() => this.data.players().filter((p) => p.country !== 'Portugal').slice(0, 3));
  readonly abroadTournaments = computed(() => this.data.tournaments().slice(1, 4));
  readonly featuredCourts = computed(() => this.data.courts().slice(0, 3));

  select(id: string): void {
    if (this.destinations().some((d) => d.id === id)) {
      this.selectedId.set(id);
    }
  }
}
