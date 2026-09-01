import { Component, computed, inject, input } from '@angular/core';
import { AvatarService } from '../../../core/services/avatar.service';

const ACCENT_CLASSES: Record<string, string> = {
  lime: 'bg-lime text-ink',
  clay: 'bg-clay text-white',
  cobalt: 'bg-cobalt text-white',
  ink: 'bg-ink text-bone'
};

const SIZE_CLASSES: Record<string, string> = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-16 text-lg',
  xl: 'size-24 text-2xl'
};

// Matches the px width of SIZE_CLASSES (Tailwind size-N = N * 4px), doubled for crisp rendering.
const SIZE_PX: Record<string, number> = {
  xs: 56,
  sm: 72,
  md: 96,
  lg: 128,
  xl: 192
};

// Tennis-ball badge size (px), roughly a third of the avatar's rendered size.
const BADGE_PX: Record<string, number> = {
  xs: 0,
  sm: 0,
  md: 18,
  lg: 24,
  xl: 34
};

@Component({
  selector: 'ui-avatar',
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss'
})
export class AvatarComponent {
  private readonly avatarService = inject(AvatarService);

  readonly initials = input<string>('');
  readonly accent = input<string>('ink');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly ring = input(false);
  readonly seed = input<string | undefined>(undefined);
  readonly avatarStyle = input<string | undefined>(undefined);
  /** Small status marker on generated avatars; defaults to the Rally tennis ball. */
  readonly badge = input('🎾');
  /** Hide the badge when another control occupies the same avatar corner. */
  readonly showBadge = input(true);
  /** Optional colour override for a badge with semantic meaning, such as gender. */
  readonly badgeClass = input('bg-lime text-ink');

  protected readonly classes = computed(() =>
    [
      ACCENT_CLASSES[this.accent()] ?? ACCENT_CLASSES['ink'],
      SIZE_CLASSES[this.size()],
      this.ring() ? 'ring-2 ring-background' : ''
    ].join(' ')
  );

  protected readonly avatarUri = computed(() => {
    const seed = this.seed();
    const style = this.avatarStyle();
    if (!seed || !this.avatarService.isKnownStyle(style)) {
      return null;
    }
    return this.avatarService.dataUri(seed, style, SIZE_PX[this.size()]);
  });

  // Skip the badge at the smallest sizes, where it would just look like noise.
  protected readonly canShowBadge = computed(() => this.showBadge() && !!this.avatarUri() && BADGE_PX[this.size()] > 0);

  protected readonly badgePx = computed(() => BADGE_PX[this.size()]);
}
