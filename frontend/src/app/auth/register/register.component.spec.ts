import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService, AuthResponse, User } from '../../core/services/auth.service';
import { provideTranslocoTesting } from '../../testing/transloco-testing';

const testUser: User = {
  id: 'user-1',
  email: 'nouveau@example.org',
  role: 'membre',
};

class AuthServiceStub {
  registerResult: any = of<AuthResponse>({ message: 'ok', user: testUser, token: 'token' });

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

  register(_data: unknown) {
    return this.registerResult;
  }
}

function createComponent(queryParams: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    imports: [RegisterComponent],
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

  const fixture = TestBed.createComponent(RegisterComponent);
  fixture.detectChanges();
  return fixture;
}

describe('RegisterComponent', () => {
  it('does not submit when the password is shorter than 8 characters', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    const registerSpy = spyOn(authService, 'register').and.callThrough();

    component.registerForm.setValue({
      email: 'nouveau@example.org',
      password: 'short',
      first_name: '',
      last_name: '',
      want_membership: false,
    });
    component.onSubmit();

    expect(registerSpy).not.toHaveBeenCalled();
  });

  it('redirects to /profil by default after a successful registration', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateByUrlSpy = spyOn(router, 'navigateByUrl');

    component.registerForm.setValue({
      email: 'nouveau@example.org',
      password: 'longenoughpassword',
      first_name: 'Jean',
      last_name: 'Dupont',
      want_membership: true,
    });
    component.onSubmit();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/profil');
    expect(component.loading).toBe(false);
  });

  it('redirects to the requested URL when redirectTo is present', () => {
    const fixture = createComponent({ redirectTo: '/adhesion' });
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigateByUrlSpy = spyOn(router, 'navigateByUrl');

    component.registerForm.setValue({
      email: 'nouveau@example.org',
      password: 'longenoughpassword',
      first_name: '',
      last_name: '',
      want_membership: false,
    });
    component.onSubmit();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/adhesion');
  });

  it('surfaces the server error message when registration fails', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.registerResult = throwError(() => ({ error: { error: 'Email already registered' } }));

    component.registerForm.setValue({
      email: 'nouveau@example.org',
      password: 'longenoughpassword',
      first_name: '',
      last_name: '',
      want_membership: false,
    });
    component.onSubmit();

    expect(component.loading).toBe(false);
    expect(component.error).toBe('Email already registered');
  });
});
