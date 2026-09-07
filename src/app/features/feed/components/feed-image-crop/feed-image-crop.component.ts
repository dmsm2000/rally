import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { ImageCroppedEvent, ImageCropperComponent, LoadedImage } from 'ngx-image-cropper';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

// A floor so a pinch/corner-drag can't shrink the selection to something degenerate. Otherwise
// unbounded on purpose: ngx-image-cropper always resamples from the original photo's native
// resolution, so a smaller on-screen frame just selects a tighter region — it doesn't cost quality
// the way it would if this were scaling a already-downsampled preview.
const MIN_FRAME_WIDTH = 120;
// The crop box's height is clamped between these. A fixed height left a landscape photo floating in
// a half-empty box (it only ever scales to the box's *width*), while an unbounded one would let a
// tall portrait shot grow the dialog again — the exact thing the fixed box was there to stop.
const MIN_BOX_HEIGHT = 240;
const MAX_BOX_HEIGHT = 384;
// ngx-image-cropper's own :host padding, which sits between this box's edge and the photo.
const CROPPER_PADDING = 10;

@Component({
  selector: 'rally-feed-image-crop',
  imports: [ImageCropperComponent, TranslatePipe],
  templateUrl: './feed-image-crop.component.html',
  host: { class: 'block' }
})
export class FeedImageCropComponent {
  protected readonly minFrameWidth = MIN_FRAME_WIDTH;

  readonly imageFile = input.required<File>();
  readonly cropped = output<Blob>();
  readonly cancelled = output<void>();

  private readonly boxRef = viewChild.required<ElementRef<HTMLDivElement>>('box');
  protected readonly boxHeight = signal(MAX_BOX_HEIGHT);

  // ngx-image-cropper fires imageCropped continuously as the frame is dragged/resized/pinched
  // (autoCrop's default), not just on an explicit confirm — so the latest result is just cached
  // here, and "Aplicar corte" is what actually forwards it to the composer.
  private readonly latestCrop = signal<ImageCroppedEvent | null>(null);
  protected readonly canConfirm = computed(() => !!this.latestCrop()?.blob);

  // `transformed` rather than `original` — it's the exif-rotated size, which is what actually gets
  // laid out, so a portrait photo written by the camera as landscape-plus-rotation still measures
  // as portrait here.
  protected onImageLoaded(loaded: LoadedImage): void {
    const { width, height } = loaded.transformed.size;
    const boxWidth = this.boxRef().nativeElement.clientWidth;
    if (!width || !height || !boxWidth) {
      return;
    }
    const scaledHeight = (boxWidth - CROPPER_PADDING) * (height / width) + CROPPER_PADDING;
    this.boxHeight.set(Math.round(Math.min(MAX_BOX_HEIGHT, Math.max(MIN_BOX_HEIGHT, scaledHeight))));
  }

  protected onImageCropped(event: ImageCroppedEvent): void {
    this.latestCrop.set(event);
  }

  protected confirm(): void {
    const blob = this.latestCrop()?.blob;
    if (blob) {
      this.cropped.emit(blob);
    }
  }
}
