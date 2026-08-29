import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatchesService } from '../../matches.service';
import { StatComponent, SectionHeaderComponent, EmptyStateComponent } from '../../../../shared/ui';
import { MatchCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-matches-list-page',
  imports: [FormsModule, StatComponent, SectionHeaderComponent, EmptyStateComponent, MatchCardComponent, TranslatePipe],
  templateUrl: './matches-list-page.component.html',
  styleUrl: './matches-list-page.component.scss',
})
export class MatchesListPageComponent {
  protected readonly matches = inject(MatchesService);
}
