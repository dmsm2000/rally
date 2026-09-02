import { Component, ElementRef, HostListener, computed, inject, input, model, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Styled dropdown for picking a time ('HH:MM') in fixed-minute steps — replaces the native
 * <input type="time">, whose picker UI is drawn by the OS/browser and can't be themed to match
 * the app (same limitation that led to ui-date-picker).
 */
@Component({
  selector: 'ui-time-picker',
  imports: [IconComponent],
  templateUrl: './time-picker.component.html'
})
export class TimePickerComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly value = model('');
  readonly placeholder = input('');
  readonly name = input('');
  readonly stepMinutes = input(30);
  readonly minHour = input(6);
  readonly maxHour = input(23);
  /** Slots at or before this 'HH:MM' are shown but disabled — e.g. an end time before the start. */
  readonly min = input('');

  protected readonly open = signal(false);

  protected readonly slots = computed(() => {
    const step = this.stepMinutes();
    const start = this.minHour() * 60;
    const end = this.maxHour() * 60;
    const list: string[] = [];
    for (let minutes = start; minutes <= end; minutes += step) {
      const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mm = String(minutes % 60).padStart(2, '0');
      list.push(`${hh}:${mm}`);
    }
    return list;
  });

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected toggleOpen(): void {
    this.open.update(open => !open);
  }

  protected isDisabled(slot: string): boolean {
    return !!this.min() && slot <= this.min();
  }

  protected select(slot: string): void {
    if (this.isDisabled(slot)) {
      return;
    }
    this.value.set(slot);
    this.open.set(false);
  }
}
