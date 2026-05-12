import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private darkModeSignal = signal<boolean>(false);
  private readonly comfortThemeVersion = 'eye-comfort-v1';
  readonly isDarkMode = this.darkModeSignal.asReadonly();

  constructor() {
    effect(() => {
      document.body.classList.toggle('dark', this.darkModeSignal());
      document.body.classList.toggle('dark-theme', this.darkModeSignal());
    });
  }

  initTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    const savedVersion = localStorage.getItem('theme-version');

    if (savedVersion !== this.comfortThemeVersion) {
      this.darkModeSignal.set(true);
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('theme-version', this.comfortThemeVersion);
      return;
    }

    const shouldUseDark = savedTheme ? savedTheme === 'dark' : true;
    this.darkModeSignal.set(shouldUseDark);
    localStorage.setItem('theme', shouldUseDark ? 'dark' : 'light');
  }

  toggleTheme(): void {
    const newValue = !this.darkModeSignal();
    this.darkModeSignal.set(newValue);
    localStorage.setItem('theme', newValue ? 'dark' : 'light');
    localStorage.setItem('theme-version', this.comfortThemeVersion);
  }

  setTheme(isDark: boolean): void {
    this.darkModeSignal.set(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme-version', this.comfortThemeVersion);
  }
}
