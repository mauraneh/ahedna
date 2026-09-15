import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthTokenStorage } from '../services/auth-token-storage.service';

class AuthTokenStorageStub {
  token: string | null = null;

  get(): string | null {
    return this.token;
  }
}

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: AuthTokenStorageStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthTokenStorage, useClass: AuthTokenStorageStub },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthTokenStorage) as unknown as AuthTokenStorageStub;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds an Authorization header when a token is present', () => {
    authService.token = 'signed-token';

    httpClient.get('/api/profile/me').subscribe();

    const request = httpMock.expectOne('/api/profile/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    request.flush({});
  });

  it('leaves the request untouched when no token is stored', () => {
    authService.token = null;

    httpClient.get('/api/news').subscribe();

    const request = httpMock.expectOne('/api/news');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
