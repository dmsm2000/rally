import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CourtsService } from '../../courts.service';
import { StatComponent, ChipComponent } from '../../../../shared/ui';
import { CourtCardComponent, RallyMapComponent, MapMarker } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-courts-list-page',
  imports: [FormsModule, StatComponent, ChipComponent, CourtCardComponent, RallyMapComponent, TranslatePipe],
  templateUrl: './courts-list-page.component.html',
  styleUrl: './courts-list-page.component.scss',
})
export class CourtsListPageComponent {
  protected readonly courts = inject(CourtsService);

  protected readonly markers = (): MapMarker[] =>
    this.courts.all().map((c) => ({ id: c.id, x: c.coords.x, y: c.coords.y, kind: 'court', label: c.name }));
}
