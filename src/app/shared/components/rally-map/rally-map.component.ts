import { Component, input, output } from '@angular/core';

export interface MapMarker {
  id: string;
  x: number;
  y: number;
  label?: string;
  kind: 'player' | 'court' | 'tournament' | 'match' | 'destination' | 'locked';
  active?: boolean;
}

const MARKER_TONE: Record<MapMarker['kind'], string> = {
  player: 'bg-lime border-lime-deep',
  court: 'bg-clay border-clay',
  tournament: 'bg-cobalt border-cobalt',
  match: 'bg-foreground border-foreground',
  destination: 'bg-lime border-lime-deep',
  locked: 'bg-transparent border-dashed border-muted-foreground',
};

/** Stylised Rally map: an abstract land silhouette, not a real map provider. */
@Component({
  selector: 'app-rally-map',
  templateUrl: './rally-map.component.html',
  styleUrl: './rally-map.component.scss',
})
export class RallyMapComponent {
  readonly markers = input<MapMarker[]>([]);
  readonly className = input<string>('h-64');
  readonly selected = input<string>();
  readonly markerSelect = output<string>();

  protected markerClass(marker: MapMarker): string {
    const scale = marker.active || this.selected() === marker.id ? ' scale-150' : '';
    return MARKER_TONE[marker.kind] + scale;
  }
}
