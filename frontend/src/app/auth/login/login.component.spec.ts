import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService, AuthResponse, User } from '../../core/services/auth.service';
import { provideTranslocoTesting } from '../../testing/transloco-testing';

const testUser: User = {
  id: 'user-1',
  email: 'membre@example.org',
  role: 'membre',
};

class AuthServiceStub {
  loginResult: any = of<AuthResponse>({ message: 'ok', user: testUser, token: 'token' });

  isAuthenticated() {
    return false;
  }

  currentUser() {
    return null;
  }

  hasRole() {
    return false;
  }

  logout() {}

  login(_email: string, _password: string) {
    return this.loginResult;
  }
}

function createComponent(queryParams: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: AuthServiceStub },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
      },
    ],
  });

  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  return fixture;
}

describe('LoginComponent', () => {
  it('does not call the auth service when the form is invalid', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    const loginSpy = spyOn(authService, 'login').and.callThrough();

    component.loginForm.setValue({ email: '', password: '' });
    component.onSubmit();

    expect(loginSpy).not.toHaveBeenCalled();
    expect(component.loading).toBe(false);
  });

  it('redirects to the requested URL after a successful login', () => {
    const fixture = createComponent({ redirectTo: '/profil' });
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateByUrlSpy = spyOn(router, 'navigateByUrl');

    component.loginForm.setValue({ email: 'membre@example.org', password: 'longenoughpassword' });
    component.onSubmit();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/profil');
    expect(component.loading).toBe(false);
    expect(component.error).toBe('');
  });

  it('redirects to the home page when no redirectTo query parameter is present', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateByUrlSpy = spyOn(router, 'navigateByUrl');

    component.loginForm.setValue({ email: 'membre@example.org', password: 'longenoughpassword' });
    component.onSubmit();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/');
  });

  it('surfaces the server error message when the login fails', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.loginResult = throwError(() => ({ error: { error: 'Invalid credentials' } }));

    component.loginForm.setValue({ email: 'membre@example.org', password: 'wrongpassword' });
    component.onSubmit();

    expect(component.loading).toBe(false);
    expect(component.error).toBe('Invalid credentials');
  });

  it('exposes the error message through a role="alert" live region for assistive technology', () => {
    const fixture = createComponent();
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.loginResult = throwError(() => ({ error: { error: 'Invalid credentials' } }));

    fixture.componentInstance.loginForm.setValue({
      email: 'membre@example.org',
      password: 'wrongpassword',
    });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    const alertBox = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alertBox).toBeTruthy();
    expect(alertBox.textContent).toContain('Invalid credentials');
  });
});
