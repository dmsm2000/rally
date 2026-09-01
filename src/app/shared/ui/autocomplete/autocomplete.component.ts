import { Component, computed, input, model, signal } from '@angular/core';

/**
 * Small text-input autocomplete — filters `options()` as you type and shows a styled dropdown,
 * instead of relying on a native <select> (huge for 250+ countries) or <datalist> (unstyleable
 * popup, looks inconsistent across browsers/themes).
 */
@Component({
  selector: 'ui-autocomplete',
  templateUrl: './autocomplete.component.html'
})
export class AutocompleteComponent {
  readonly options = input<string[]>([]);
  readonly placeholder = input('');
  readonly name = input('');
  readonly disabled = input(false);
  /** Optional emoji/icon per option (e.g. a country's flag), keyed by the option string. */
  readonly optionIcons = input<Record<string, string>>({});
  readonly value = model('');

  protected readonly open = signal(false);
  protected readonly selectedIcon = computed(() => this.optionIcons()[this.value()]);

  protected readonly filteredOptions = computed(() => {
    const query = this.value().trim().toLowerCase();
    const list = this.options();
    if (!query) {
      return list.slice(0, 50);
    }
    return list.filter(o => o.toLowerCase().includes(query)).slice(0, 50);
  });

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
    this.open.set(true);
  }

  protected select(option: string): void {
    this.value.set(option);
    this.open.set(false);
  }

  // Closing on blur must be deferred so an option's (mousedown) selection lands first.
  protected onBlur(): void {
    setTimeout(() => this.open.set(false), 120);
  }
}
