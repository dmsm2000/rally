import { Component, inject, input } from '@angular/core';
import { BackNavigationService } from '../../../core/services/back-navigation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

/**
 * Desktop's counterpart to the topbar's back arrow (mobile-only, since the drawer hamburger lives
 * there — see `TopbarComponent.detailFallback`). The nav bar is always inline above `lg`, with no
 * slot for a back affordance, so detail pages (player/court/match) render this at the top of their
 * own content instead.
 */
@Component({
  selector: 'ui-back-link',
  imports: [IconComponent, TranslatePipe],
  templateUrl: './back-link.component.html',
  styleUrl: './back-link.component.scss'
})
export class BackLinkComponent {
  private readonly backNav = inject(BackNavigationService);

  /** Translation key for the label, e.g. "courts.backToCourts". */
  readonly label = input.required<string>();
  /** Route to land on when there's no in-app history to unwind back to (a direct/shared link). */
  readonly fallback = input.required<string>();

  protected back(): void {
    this.backNav.back(this.fallback());
  }
}
