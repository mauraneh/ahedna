import { Injectable } from '@angular/core';

// Independent of AuthService so HTTP requests can read the token during startup.
@Injectable({ providedIn: 'root' })
export class AuthTokenStorage {
  private readonly key = 'ahedna_token';

  get(): string | null {
    return localStorage.getItem(this.key);
  }

  set(token: string): void {
    localStorage.setItem(this.key, token);
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}
