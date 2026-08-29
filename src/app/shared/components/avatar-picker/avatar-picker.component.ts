import { Component, inject, model } from '@angular/core';
import { AVATAR_STYLES, AvatarService, AvatarStyleId } from '../../../core/services/avatar.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'rally-avatar-picker',
  imports: [TranslatePipe],
  templateUrl: './avatar-picker.component.html',
  styleUrl: './avatar-picker.component.scss',
})
export class AvatarPickerComponent {
  readonly seed = model.required<string>();
  readonly avatarStyle = model.required<AvatarStyleId>();

  protected readonly styles = AVATAR_STYLES;

  private readonly avatarService = inject(AvatarService);

  protected previewUri(): string {
    return this.avatarService.dataUri(this.seed(), this.avatarStyle(), 192);
  }

  protected thumbUri(style: AvatarStyleId): string {
    return this.avatarService.dataUri(this.seed(), style, 96);
  }

  // Deterministic: increments a numeric suffix on the current seed instead of using Math.random().
  protected regenerate(): void {
    const current = this.seed();
    const match = current.match(/^(.*)-(\d+)$/);
    const base = match ? match[1] : current;
    const next = match ? parseInt(match[2], 10) + 1 : 1;
    this.seed.set(`${base}-${next}`);
  }
}
