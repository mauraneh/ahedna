import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SiteFooterComponent } from './site-footer.component';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';

describe('SiteFooterComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'fr';
  });

  function createComponent() {
    TestBed.configureTestingModule({
      imports: [SiteFooterComponent],
      providers: [
        provideRouter([]),
        provideTranslocoTesting(),
      ],
    });

    const fixture = TestBed.createComponent(SiteFooterComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('exposes the French and English language options', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance.languages.map((language) => language.code)).toEqual([
      'fr',
      'en',
    ]);
  });

  it('switches the active language when a language button is clicked', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const setActiveLangSpy = spyOn(component.i18nService, 'setActiveLang').and.callThrough();

    const buttons = fixture.debugElement.queryAll(By.css('.footer-lang-button'));
    expect(buttons.length).toBe(2);

    buttons[1].nativeElement.click();
    fixture.detectChanges();

    expect(setActiveLangSpy).toHaveBeenCalledWith('en');
    expect(component.i18nService.activeLang()).toBe('en');
  });
});
