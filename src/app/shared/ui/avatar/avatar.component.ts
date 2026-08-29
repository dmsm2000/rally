import { Component, computed, input } from '@angular/core';

const ACCENT_CLASSES: Record<string, string> = {
  lime: 'bg-lime text-ink',
  clay: 'bg-clay text-white',
  cobalt: 'bg-cobalt text-white',
  ink: 'bg-ink text-bone',
};

const SIZE_CLASSES: Record<string, string> = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-16 text-lg',
  xl: 'size-24 text-2xl',
};

@Component({
  selector: 'ui-avatar',
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  readonly initials = input.required<string>();
  readonly accent = input<string>('ink');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly ring = input(false);

  protected readonly classes = computed(() =>
    [ACCENT_CLASSES[this.accent()] ?? ACCENT_CLASSES['ink'], SIZE_CLASSES[this.size()], this.ring() ? 'ring-2 ring-background' : ''].join(' '),
  );
}
