import { Component, ElementRef, HostListener, computed, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/i18n/translation.service';
import { IconComponent } from '../icon/icon.component';

interface DayCell {
  iso: string;
  label: number;
  inMonth: boolean;
}

/**
 * Styled calendar dropdown for picking an ISO ('YYYY-MM-DD') date — replaces the native
 * <input type="date"> whose calendar popup is drawn by the OS/browser and can't be themed to
 * match the app (same limitation that led to the country/city ui-autocomplete component).
 */
@Component({
  selector: 'ui-date-picker',
  imports: [FormsModule, IconComponent],
  templateUrl: './date-picker.component.html'
})
export class DatePickerComponent {
  private readonly translation = inject(TranslationService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly value = model('');
  readonly min = input('1900-01-01');
  readonly max = input(new Date().toISOString().slice(0, 10));
  readonly placeholder = input('');
  readonly name = input('');

  protected readonly open = signal(false);
  protected readonly viewYear = signal(this.initialDate().getFullYear());
  protected readonly viewMonth = signal(this.initialDate().getMonth());

  protected readonly years = computed(() => {
    const maxYear = new Date(`${this.max()}T00:00:00`).getFullYear();
    const minYear = new Date(`${this.min()}T00:00:00`).getFullYear();
    const list: number[] = [];
    for (let year = maxYear; year >= minYear; year--) {
      list.push(year);
    }
    return list;
  });

  protected readonly months = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.translation.locale(), { month: 'long' });
    return Array.from({ length: 12 }, (_, i) => ({ value: i, label: formatter.format(new Date(2000, i, 1)) }));
  });

  // 2023-01-01 was a Sunday, so this gives locale-correct narrow weekday labels in Sun..Sat order.
  protected readonly weekdayLabels = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.translation.locale(), { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, 1 + i)));
  });

  protected readonly weeks = computed<DayCell[][]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const firstOfMonth = new Date(year, month, 1);
    const start = new Date(year, month, 1 - firstOfMonth.getDay());
    const cells: DayCell[] = Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { iso: this.toIso(date), label: date.getDate(), inMonth: date.getMonth() === month };
    });
    const weeks: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  });

  protected readonly displayValue = computed(() => {
    if (!this.value()) {
      return '';
    }
    return new Intl.DateTimeFormat(this.translation.locale(), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
      new Date(`${this.value()}T00:00:00`)
    );
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

  protected prevMonth(): void {
    this.shiftMonth(-1);
  }

  protected nextMonth(): void {
    this.shiftMonth(1);
  }

  private shiftMonth(delta: number): void {
    const date = new Date(this.viewYear(), this.viewMonth() + delta, 1);
    this.viewYear.set(date.getFullYear());
    this.viewMonth.set(date.getMonth());
  }

  protected setViewYear(year: string): void {
    this.viewYear.set(Number(year));
  }

  protected setViewMonth(month: string): void {
    this.viewMonth.set(Number(month));
  }

  protected isSelected(iso: string): boolean {
    return iso === this.value();
  }

  protected isDisabled(iso: string): boolean {
    return iso < this.min() || iso > this.max();
  }

  protected selectDay(cell: DayCell): void {
    if (this.isDisabled(cell.iso)) {
      return;
    }
    this.value.set(cell.iso);
    this.open.set(false);
  }

  private toIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private initialDate(): Date {
    const iso = this.value() || this.max();
    return new Date(`${iso}T00:00:00`);
  }
}
