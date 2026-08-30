import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatchesService } from '../../matches.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { StatComponent, SectionHeaderComponent, EmptyStateComponent, ChipComponent } from '../../../../shared/ui';
import { MatchCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-matches-list-page',
  imports: [FormsModule, StatComponent, SectionHeaderComponent, EmptyStateComponent, ChipComponent, MatchCardComponent, TranslatePipe],
  templateUrl: './matches-list-page.component.html',
  styleUrl: './matches-list-page.component.scss',
})
export class MatchesListPageComponent {
  protected readonly matches = inject(MatchesService);
  protected readonly auth = inject(AuthService);
}
