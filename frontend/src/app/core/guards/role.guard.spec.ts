import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService, EffectiveRole } from '../services/auth.service';

class AuthServiceStub {
  private authenticated = false;
  private role: EffectiveRole = 'visitor';

  async ensureLoaded(): Promise<void> {}

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  hasRole(roles: EffectiveRole[]): boolean {
    return roles.includes(this.role);
  }

  setSession(authenticated: boolean, role: EffectiveRole): void {
    this.authenticated = authenticated;
    this.role = role;
  }
}

describe('roleGuard', () => {
  let authService: AuthServiceStub;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useClass: AuthServiceStub }],
    });

    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    router = TestBed.inject(Router);
  });

  function runGuard(roles: EffectiveRole[], url: string) {
    return TestBed.runInInjectionContext(() =>
      roleGuard(
        { data: { roles } } as unknown as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot
      )
    );
  }

  it('redirects an unauthenticated user to /login', async () => {
    authService.setSession(false, 'visitor');
    const createUrlTreeSpy = spyOn(router, 'createUrlTree').and.callThrough();

    const result = await runGuard(['admin'], '/admin');

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirectTo: '/admin' },
    });
    expect(result instanceof UrlTree).toBe(true);
  });

  it('redirects an authenticated user without the required role to the home page', async () => {
    authService.setSession(true, 'membre');
    const createUrlTreeSpy = spyOn(router, 'createUrlTree').and.callThrough();

    const result = await runGuard(['admin'], '/admin');

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/']);
    expect(result instanceof UrlTree).toBe(true);
  });

  it('allows navigation when the authenticated user has one of the required roles', async () => {
    authService.setSession(true, 'admin');

    const result = await runGuard(['admin'], '/admin');

    expect(result).toBe(true);
  });
});
