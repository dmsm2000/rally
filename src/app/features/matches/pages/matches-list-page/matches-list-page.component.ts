import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { MatchCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import {
  AutocompleteComponent,
  AvatarComponent,
  ChipComponent,
  DatePickerComponent,
  EmptyStateComponent,
  IconComponent,
  SectionHeaderComponent,
  StatComponent,
  TimePickerComponent
} from '../../../../shared/ui';
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
    ChipComponent,
    DatePickerComponent,
    TimePickerComponent,
    AutocompleteComponent,
    AvatarComponent,
    IconComponent,
    MatchCardComponent,
    TranslatePipe
  ],
  templateUrl: './matches-list-page.component.html',
  styleUrl: './matches-list-page.component.scss'
})
export class MatchesListPageComponent {
  protected readonly matches = inject(MatchesService);
  protected readonly auth = inject(AuthService);
  // Placeholder rows shown in place of each list while the first load is in flight.
  protected readonly skeletonRows = [0, 1, 2];

  // Mirrors FeedPageComponent.onBackdropClick — only closes when the backdrop itself (not the
  // dialog panel or one of its inputs) receives the click.
  protected onComposerBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.matches.closeComposer();
    }
  }
}
