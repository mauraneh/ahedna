import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

class AuthServiceStub {
  private authenticated = false;

  async ensureLoaded(): Promise<void> {}

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  setAuthenticated(value: boolean): void {
    this.authenticated = value;
  }
}

describe('authGuard', () => {
  let authService: AuthServiceStub;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useClass: AuthServiceStub }],
    });

    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    router = TestBed.inject(Router);
  });

  function runGuard(url: string) {
    return TestBed.runInInjectionContext(() =>
      authGuard(
        {} as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot
      )
    );
  }

  it('allows navigation once the user session is loaded and authenticated', async () => {
    authService.setAuthenticated(true);

    const result = await runGuard('/profil');

    expect(result).toBe(true);
  });

  it('redirects to /login with the original URL when the user is not authenticated', async () => {
    authService.setAuthenticated(false);
    const createUrlTreeSpy = spyOn(router, 'createUrlTree').and.callThrough();

    const result = await runGuard('/profil');

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirectTo: '/profil' },
    });
    expect(result instanceof UrlTree).toBe(true);
  });
});
