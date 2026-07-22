import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  let loader: TranslocoHttpLoader;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    loader = TestBed.inject(TranslocoHttpLoader);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches the translation JSON file for the requested language', () => {
    let result: unknown;
    loader.getTranslation('fr').subscribe((translation) => (result = translation));

    const request = httpMock.expectOne('/i18n/fr.json');
    expect(request.request.method).toBe('GET');
    request.flush({ hello: 'Bonjour' });

    expect(result).toEqual({ hello: 'Bonjour' });
  });
});
