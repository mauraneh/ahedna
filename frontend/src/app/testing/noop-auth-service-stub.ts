// Drop-in AuthService replacement for specs that only need NavbarComponent (or another
// AuthService consumer) to be injectable, without exercising any authenticated behaviour.
export class NoopAuthServiceStub {
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
}
