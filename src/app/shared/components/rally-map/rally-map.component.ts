import { Component, input, output } from '@angular/core';

export interface MapMarker {
  id: string;
  x: number;
  y: number;
  label?: string;
  kind: 'player' | 'court' | 'match' | 'destination' | 'locked' | 'activity';
  active?: boolean;
}

const MARKER_TONE: Record<MapMarker['kind'], string> = {
  player: 'bg-lime border-lime-deep',
  court: 'bg-clay border-clay',
  match: 'bg-foreground border-foreground',
  destination: 'bg-foreground border-foreground',
  locked: 'bg-transparent border-dashed border-muted-foreground',
  activity: 'bg-cobalt border-cobalt',
};

/** Stylised Rally map: an abstract land silhouette, not a real map provider. */
@Component({
  selector: 'rally-map',
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
