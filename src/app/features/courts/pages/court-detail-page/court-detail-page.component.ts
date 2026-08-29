import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { CourtsService } from '../../courts.service';
import { RallyDataService } from '../../../../core/data/rally-data.service';
import { StatComponent, ChipComponent, SectionHeaderComponent } from '../../../../shared/ui';
import { PlayerCardComponent, RallyMapComponent, MapMarker } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

const REVIEWS = [
  { name: 'Maria Costa', initials: 'MC', accent: 'lime', rating: 5, text: 'Clay is watered twice a day. Book the evening slot, the light is unreal.' },
  { name: 'Pedro Almeida', initials: 'PA', accent: 'clay', rating: 4, text: 'Great surface, changing rooms could be bigger on weekends.' },
  { name: 'Marc Puig', initials: 'MP', accent: 'cobalt', rating: 5, text: 'Travelled from Barcelona for this. Worth the trip.' },
];

@Component({
  selector: 'app-court-detail-page',
  imports: [RouterLink, StatComponent, ChipComponent, SectionHeaderComponent, PlayerCardComponent, RallyMapComponent, TranslatePipe],
  templateUrl: './court-detail-page.component.html',
  styleUrl: './court-detail-page.component.scss',
})
export class CourtDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly courts = inject(CourtsService);
  private readonly data = inject(RallyDataService);

  private readonly courtId = toSignal(this.route.paramMap.pipe(map((params) => params.get('courtId') ?? '')), { initialValue: '' });

  protected readonly court = computed(() => this.courts.getById(this.courtId()));
  protected readonly nearbyPlayers = computed(() => this.data.players().slice(0, 2));
  protected readonly reviews = REVIEWS;

  protected readonly markers = computed<MapMarker[]>(() => {
    const c = this.court();
    return c ? [{ id: c.id, x: c.coords.x, y: c.coords.y, kind: 'court', active: true }] : [];
  });
}
