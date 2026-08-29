import { Component, inject } from '@angular/core';
import { MatchesService } from '../../matches.service';
import { PageHeaderComponent, StatComponent, SectionHeaderComponent, EmptyStateComponent } from '../../../../shared/ui';
import { MatchCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-matches-list-page',
  imports: [PageHeaderComponent, StatComponent, SectionHeaderComponent, EmptyStateComponent, MatchCardComponent, TranslatePipe],
  templateUrl: './matches-list-page.component.html',
  styleUrl: './matches-list-page.component.scss',
})
export class MatchesListPageComponent {
  protected readonly matches = inject(MatchesService);
}
