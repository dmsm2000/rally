import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { CourtCardComponent, CourtComposerDialogComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ChipComponent, EmptyStateComponent, IconComponent, StatComponent } from '../../../../shared/ui';
import { CourtsService } from '../../courts.service';

@Component({
  selector: 'rally-courts-list-page',
  imports: [
    FormsModule,
    StatComponent,
    ChipComponent,
    IconComponent,
    EmptyStateComponent,
    CourtCardComponent,
    CourtComposerDialogComponent,
    TranslatePipe
  ],
  templateUrl: './courts-list-page.component.html',
  styleUrl: './courts-list-page.component.scss'
})
export class CourtsListPageComponent {
  protected readonly courts = inject(CourtsService);
  protected readonly auth = inject(AuthService);
  protected readonly skeletonCards = [0, 1, 2, 3, 4, 5];

  // Green field starts with no countries to show, and a half-empty two-column hero reads as broken
  // rather than as new — so the split only appears once there is something to fill it.
  protected readonly heroLayout = computed(() =>
    this.courts.topCountries().length ? 'lg:grid-cols-[1.1fr_1fr] lg:items-center' : ''
  );
}
