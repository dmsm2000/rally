import { Component, HostListener, inject } from '@angular/core';
import { MediaLightboxService } from '../../../core/services/media-lightbox.service';

/** Renders whatever MediaLightboxService.active() currently holds — one instance for the whole app. */
@Component({
  selector: 'ui-media-lightbox',
  templateUrl: './media-lightbox.component.html'
})
export class MediaLightboxComponent {
  protected readonly lightbox = inject(MediaLightboxService);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.lightbox.close();
  }
}
