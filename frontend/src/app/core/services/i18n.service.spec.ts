import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { I18nService } from './i18n.service';

class TranslocoServiceStub {
  readonly langChanges$ = new BehaviorSubject<string>('fr');

  setActiveLang(lang: string): void {
    this.langChanges$.next(lang);
  }
}

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'fr';

    TestBed.configureTestingModule({
      providers: [
        I18nService,
        {
          provide: TranslocoService,
          useClass: TranslocoServiceStub,
        },
      ],
    });

    service = TestBed.inject(I18nService);
  });

  it('initializes the application language from local storage', () => {
    localStorage.setItem('ahedna.activeLang', 'en');

    service.init();

    expect(service.activeLang()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('persists the selected language and updates the document language', () => {
    service.setActiveLang('en');

    expect(service.activeLang()).toBe('en');
    expect(localStorage.getItem('ahedna.activeLang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('ignores unsupported languages', () => {
    service.setActiveLang('de');

    expect(service.activeLang()).toBe('fr');
    expect(localStorage.getItem('ahedna.activeLang')).toBeNull();
  });
});
