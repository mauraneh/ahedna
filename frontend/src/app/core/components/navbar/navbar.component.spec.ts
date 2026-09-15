import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { AuthService, User } from '../../services/auth.service';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';

class AuthServiceStub {
  authenticated = false;
  user: User | null = null;
  role: User['role'] | null = null;
  logoutSpy = jasmine.createSpy('logout');

  isAuthenticated() {
    return this.authenticated;
  }

  currentUser() {
    return this.user;
  }

  hasRole(roles: string[]) {
    return this.role ? roles.includes(this.role) : false;
  }

  logout() {
    this.logoutSpy();
  }
}

function createComponent() {
  TestBed.configureTestingModule({
    imports: [NavbarComponent],
    providers: [
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: AuthServiceStub },
    ],
  });

  const fixture = TestBed.createComponent(NavbarComponent);
  fixture.detectChanges();
  return fixture;
}

describe('NavbarComponent', () => {
  it('renders a skip link targeting the main content landmark as the first focusable element', () => {
    const fixture = createComponent();
    const skipLink = fixture.nativeElement.querySelector('a.skip-link');

    expect(skipLink).toBeTruthy();
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('opens the mobile menu and closes the account menu when toggled', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component.accountMenuOpen = true;

    component.toggleMenu();

    expect(component.menuOpen).toBe(true);
    expect(component.accountMenuOpen).toBe(false);
  });

  it('closes the mobile menu on a second toggle', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component.toggleMenu();

    component.toggleMenu();

    expect(component.menuOpen).toBe(false);
  });

  it('opens the account menu and closes the mobile menu when toggled', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component.menuOpen = true;

    component.toggleAccountMenu();

    expect(component.accountMenuOpen).toBe(true);
    expect(component.menuOpen).toBe(false);
  });

  it('closes both menus explicitly', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component.menuOpen = true;
    component.accountMenuOpen = true;

    component.closeMenu();
    component.closeAccountMenu();

    expect(component.menuOpen).toBe(false);
    expect(component.accountMenuOpen).toBe(false);
  });

  it('returns an empty display name when no user is logged in', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.getAccountDisplayName()).toBe('');
  });

  it('displays the full name when both first and last names are set', () => {
    const fixture = createComponent();
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.user = {
      id: 'u1',
      email: 'jean.dupont@example.org',
      first_name: 'Jean',
      last_name: 'Dupont',
      role: 'membre',
    };

    expect(fixture.componentInstance.getAccountDisplayName()).toBe('Jean Dupont');
  });

  it('falls back to the email when no name is available', () => {
    const fixture = createComponent();
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.user = { id: 'u1', email: 'jean.dupont@example.org', role: 'membre' };

    expect(fixture.componentInstance.getAccountDisplayName()).toBe('jean.dupont@example.org');
  });

  it('shows administration without the redundant content link for an admin', () => {
    const fixture = createComponent();
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.authenticated = true;
    authService.role = 'admin';
    authService.user = { id: 'u1', email: 'admin@example.org', role: 'admin' };

    fixture.componentInstance.toggleAccountMenu();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.nav-account-menu a[href="/admin"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.nav-account-menu a[href="/contenu"]')).toBeFalsy();
  });

  it('keeps the direct content link for an author', () => {
    const fixture = createComponent();
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.authenticated = true;
    authService.role = 'auteur';
    authService.user = { id: 'u1', email: 'auteur@example.org', role: 'auteur' };

    fixture.componentInstance.toggleAccountMenu();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.nav-account-menu a[href="/contenu"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.nav-account-menu a[href="/admin"]')).toBeFalsy();
  });

  it('closes both menus when clicking outside of the navbar', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component.menuOpen = true;
    component.accountMenuOpen = true;

    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    component.handleDocumentClick({ target: outsideElement } as unknown as MouseEvent);

    expect(component.menuOpen).toBe(false);
    expect(component.accountMenuOpen).toBe(false);

    document.body.removeChild(outsideElement);
  });

  it('keeps the menus open when clicking inside the navbar', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    component.menuOpen = true;

    component.handleDocumentClick({ target: fixture.nativeElement } as unknown as MouseEvent);

    expect(component.menuOpen).toBe(true);
  });

  it('closes the menus and logs the user out', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    component.menuOpen = true;
    component.accountMenuOpen = true;

    component.logout();

    expect(component.menuOpen).toBe(false);
    expect(component.accountMenuOpen).toBe(false);
    expect(authService.logoutSpy).toHaveBeenCalled();
  });
});
