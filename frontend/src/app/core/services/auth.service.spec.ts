import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService, User } from './auth.service';

const TOKEN_KEY = 'ahedna_token';

const testUser: User = {
  id: 'user-1',
  email: 'membre@example.org',
  role: 'membre',
};

function configureTestBed() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
}

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    localStorage.removeItem(TOKEN_KEY);
    httpMock?.verify();
  });

  it('resolves immediately as unauthenticated when no token is stored', async () => {
    localStorage.removeItem(TOKEN_KEY);
    configureTestBed();

    const service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    await service.ensureLoaded();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.authResolved()).toBe(true);
    expect(service.currentUser()).toBeNull();
    expect(service.getCurrentRole()).toBe('visitor');
  });

  it('loads the current user when a token is already stored', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored-token');
    configureTestBed();

    const service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
    request.flush({ user: testUser });

    await service.ensureLoaded();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual(testUser);
  });

  it('clears the session without redirecting when the stored token is rejected', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    configureTestBed();

    const service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
    request.flush({ error: 'Invalid or expired token' }, { status: 401, statusText: 'Unauthorized' });

    await service.ensureLoaded();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('login() stores the token and marks the session as authenticated', async () => {
    localStorage.removeItem(TOKEN_KEY);
    configureTestBed();

    const service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    await service.ensureLoaded();

    let response: unknown;
    service.login('membre@example.org', 'longenoughpassword').subscribe((res) => (response = res));

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    request.flush({ message: 'Login successful', user: testUser, token: 'fresh-token' });

    expect(response).toBeTruthy();
    expect(localStorage.getItem(TOKEN_KEY)).toBe('fresh-token');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()).toEqual(testUser);
    expect(service.hasRole(['membre'])).toBe(true);
    expect(service.hasRole(['admin'])).toBe(false);
  });

  it('logout() clears the session and redirects to the home page', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored-token');
    configureTestBed();

    const service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush({ user: testUser });
    await service.ensureLoaded();

    service.logout();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });

  it('updateSession() refreshes the current user while keeping the existing token by default', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored-token');
    configureTestBed();

    const service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(`${environment.apiUrl}/auth/me`).flush({ user: testUser });
    await service.ensureLoaded();

    const updatedUser: User = { ...testUser, first_name: 'Jean' };
    service.updateSession(updatedUser);

    expect(service.currentUser()).toEqual(updatedUser);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('stored-token');
  });

  it('hasRole() falls back to the visitor role when no user is loaded', async () => {
    localStorage.removeItem(TOKEN_KEY);
    configureTestBed();

    const service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    await service.ensureLoaded();

    expect(service.hasRole(['visitor'])).toBe(true);
    expect(service.hasRole(['membre'])).toBe(false);
  });
});
