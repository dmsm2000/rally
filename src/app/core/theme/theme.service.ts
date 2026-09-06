import { Injectable, effect, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rally.theme';

/** Applies/persists the color scheme. Toggles a `.dark` class on <html>; all tokens in styles.css react to it. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.readInitialTheme());

  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const dark = this._theme() === 'dark';
      document.documentElement.classList.toggle('dark', dark);
      // Without this the native status bar keeps its OS-default style, which can land as
      // unreadable (e.g. light text on our light theme's pale background).
      if (Capacitor.isNativePlatform()) {
        void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
      }
    });
  }

  toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage may be unavailable (private mode) — theme still applies for the session.
    }
  }

  private readInitialTheme(): Theme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // ignore and fall back to the app default
    }
    return 'dark';
  }
}
