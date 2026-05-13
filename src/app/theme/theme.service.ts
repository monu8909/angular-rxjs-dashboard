import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSignal = signal<ThemeMode>('light');
  private storageKey = 'dashboard-theme';

  readonly theme$ = this.themeSignal.asReadonly();

  constructor() {
    this.loadTheme();
  }

  get currentTheme(): ThemeMode {
    return this.themeSignal();
  }

  toggle(): void {
    const next = this.currentTheme === 'light' ? 'dark' : 'light';
    this.themeSignal.set(next);
    this.applyTheme(next);
    this.persistTheme(next);
  }

  private applyTheme(theme: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private loadTheme(): void {
    try {
      const stored = localStorage.getItem(this.storageKey) as ThemeMode | null;
      const theme = stored === 'dark' ? 'dark' : 'light';
      this.themeSignal.set(theme);
      this.applyTheme(theme);
    } catch {
      this.applyTheme('light');
    }
  }

  private persistTheme(theme: ThemeMode): void {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch {
      /* ignore */
    }
  }
}
