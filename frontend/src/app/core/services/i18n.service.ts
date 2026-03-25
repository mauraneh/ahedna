import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

const LANG_STORAGE_KEY = 'ahedna.activeLang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private transloco = inject(TranslocoService);

  readonly availableLangs = ['fr', 'en'] as const;
  readonly activeLang = signal<'fr' | 'en'>('fr');

  constructor() {
    this.transloco.langChanges$.subscribe((lang) => {
      if (this.isSupportedLang(lang)) {
        this.activeLang.set(lang);
      }
    });
  }

  init(): void {
    this.setActiveLang(this.resolveInitialLang());
  }

  setActiveLang(lang: string): void {
    if (!this.isSupportedLang(lang)) {
      return;
    }

    this.transloco.setActiveLang(lang);
    this.activeLang.set(lang);
    this.persistLang(lang);
  }

  getDateLocale(): string {
    return this.activeLang() === 'fr' ? 'fr-FR' : 'en-US';
  }

  private resolveInitialLang(): 'fr' | 'en' {
    const storedLang = this.readStoredLang();

    if (storedLang) {
      return storedLang;
    }

    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.toLowerCase().split('-')[0];
      if (this.isSupportedLang(browserLang)) {
        return browserLang;
      }
    }

    return 'fr';
  }

  private isSupportedLang(lang: string): lang is 'fr' | 'en' {
    return this.availableLangs.includes(lang as 'fr' | 'en');
  }

  private readStoredLang(): 'fr' | 'en' | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const storedLang = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (this.isSupportedLang(storedLang ?? '')) {
        return storedLang as 'fr' | 'en';
      }

      return null;
    } catch {
      return null;
    }
  }

  private persistLang(lang: 'fr' | 'en'): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage failures and keep runtime language only.
    }
  }
}
