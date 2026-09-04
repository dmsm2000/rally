import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlayerMetCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { EmptyStateComponent, SectionHeaderComponent, StatComponent } from '../../../../shared/ui';
import { PassportService } from '../../passport.service';

@Component({
  selector: 'rally-passport-page',
  imports: [
    RouterLink,
    StatComponent,
    SectionHeaderComponent,
    EmptyStateComponent,
    PlayerMetCardComponent,
    TranslatePipe
  ],
  templateUrl: './passport-page.component.html',
  styleUrl: './passport-page.component.scss'
})
export class PassportPageComponent {
  protected readonly passport = inject(PassportService);
}
