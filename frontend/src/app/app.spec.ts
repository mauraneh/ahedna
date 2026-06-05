import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { of } from 'rxjs';
import { App } from './app';

class TranslocoTestingLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideTransloco({
          config: {
            availableLangs: ['fr', 'en'],
            defaultLang: 'fr',
            reRenderOnLangChange: true,
            prodMode: true,
          },
          loader: TranslocoTestingLoader,
        }),
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
