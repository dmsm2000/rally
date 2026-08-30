import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CourtsService } from '../../courts.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { StatComponent, ChipComponent } from '../../../../shared/ui';
import { CourtCardComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'rally-courts-list-page',
  imports: [FormsModule, StatComponent, ChipComponent, CourtCardComponent, TranslatePipe],
  templateUrl: './courts-list-page.component.html',
  styleUrl: './courts-list-page.component.scss'
})
export class CourtsListPageComponent {
  protected readonly courts = inject(CourtsService);
  protected readonly auth = inject(AuthService);

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.courts.attachPhoto(file);
    }
    input.value = '';
  }
}
