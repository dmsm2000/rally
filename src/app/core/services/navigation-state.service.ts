import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Tracks the active top-level route so layout/nav components can highlight the current section. */
@Injectable({ providedIn: 'root' })
export class NavigationStateService {
  private readonly router = inject(Router);
  private readonly _url = signal(this.router.url.split('?')[0]);

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this._url.set(event.urlAfterRedirects.split('?')[0]);
    });
  }

  readonly url = this._url.asReadonly();

  readonly section = computed(() => this.url().split('/')[1] ?? '');

  isActive(path: string, exact = false): boolean {
    return exact ? this.url() === path : this.url() === path || this.url().startsWith(`${path}/`);
  }
}
