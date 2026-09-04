import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { CourtComposerDialogComponent, MatchCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import {
  AutocompleteComponent,
  AvatarComponent,
  ChipComponent,
  DatePickerComponent,
  DialogComponent,
  EmptyStateComponent,
  FabComponent,
  IconComponent,
  SectionHeaderComponent,
  StatComponent,
  TimePickerComponent
} from '../../../../shared/ui';
import { CourtComposerService } from '../../../courts/court-composer.service';
import { CourtsService } from '../../../courts/courts.service';
import { MatchesService } from '../../matches.service';

@Component({
  selector: 'rally-matches-list-page',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    RouterLink,
    StatComponent,
    SectionHeaderComponent,
    EmptyStateComponent,
    FabComponent,
    ChipComponent,
    DatePickerComponent,
    DialogComponent,
    TimePickerComponent,
    AutocompleteComponent,
    AvatarComponent,
    IconComponent,
    MatchCardComponent,
    CourtComposerDialogComponent,
    TranslatePipe
  ],
  templateUrl: './matches-list-page.component.html',
  styleUrl: './matches-list-page.component.scss'
})
export class MatchesListPageComponent {
  protected readonly matches = inject(MatchesService);
  protected readonly courts = inject(CourtsService);
  protected readonly composer = inject(CourtComposerService);
  protected readonly auth = inject(AuthService);
  // Placeholder rows shown in place of each list while the first load is in flight.
  protected readonly skeletonRows = [0, 1, 2];
}
