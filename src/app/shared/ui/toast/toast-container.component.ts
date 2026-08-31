import { Component, effect, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

// Matches the CSS transition duration below — actual removal from the list waits for it to finish.
const EXIT_MS = 250;

/** Fixed-position stack of dismissible toasts (errors/success/info), driven by ToastService. */
@Component({
  selector: 'ui-toast-container',
  imports: [IconComponent],
  templateUrl: './toast-container.component.html'
})
export class ToastContainerComponent {
  protected readonly toast = inject(ToastService);
  protected readonly leavingIds = signal<ReadonlySet<number>>(new Set());

  private readonly autoTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    // Arms one auto-dismiss timer per toast the first time it shows up in the list.
    effect(() => {
      for (const t of this.toast.toasts()) {
        if (!this.autoTimers.has(t.id)) {
          this.autoTimers.set(
            t.id,
            setTimeout(() => this.dismiss(t.id), t.durationMs)
          );
        }
      }
    });
  }

  /** Starts the fade/slide-out transition, then removes the toast once it's finished. */
  protected dismiss(id: number): void {
    clearTimeout(this.autoTimers.get(id));
    this.autoTimers.delete(id);
    this.leavingIds.update(ids => new Set(ids).add(id));
    setTimeout(() => {
      this.toast.dismiss(id);
      this.leavingIds.update(ids => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }, EXIT_MS);
  }

  protected kindClasses(kind: string): string {
    switch (kind) {
      case 'error':
        return 'bg-loss text-white shadow-xl shadow-loss/40 ring-2 ring-white/25';
      case 'success':
        return 'bg-win text-white shadow-lg';
      default:
        return 'bg-ink text-white shadow-lg';
    }
  }

  /** Errors get a more attention-grabbing entrance (slide + shake) than a plain info/success toast. */
  protected enterClasses(kind: string): string {
    return kind === 'error' ? 'animate-toast-in-alert' : 'animate-toast-in';
  }

  /** Only used for non-error kinds — errors render a custom broken-racket SVG in the template instead. */
  protected kindIcon(kind: string): string {
    switch (kind) {
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  }
}
