import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserRole = 'membre' | 'auteur' | 'admin';
export type EffectiveRole = 'visitor' | UserRole;

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  bio?: string;
  avatar_url?: string;
  membership_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'ahedna_token';
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  authResolved = signal<boolean>(false);
  private loadUserPromise: Promise<void>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserPromise = this.loadUser();
  }

  register(data: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(tap(response => this.handleAuth(response)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap(response => this.handleAuth(response)));
  }

  logout(): void {
    this.clearSession(true);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  async ensureLoaded(): Promise<void> {
    await this.loadUserPromise;
  }

  updateSession(user: User, token?: string): void {
    this.handleAuth({
      message: 'Session updated',
      user,
      token: token || this.getToken() || ''
    });
  }

  getCurrentRole(): EffectiveRole {
    return this.currentUser()?.role ?? 'visitor';
  }

  private handleAuth(response: AuthResponse): void {
    if (response.token) {
      localStorage.setItem(this.tokenKey, response.token);
    }
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);
    this.authResolved.set(true);
  }

  private async loadUser(): Promise<void> {
    const token = this.getToken();

    if (!token) {
      this.authResolved.set(true);
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ user: User }>(`${environment.apiUrl}/auth/me`)
      );
      this.currentUser.set(response.user);
      this.isAuthenticated.set(true);
    } catch {
      this.clearSession(false);
    } finally {
      this.authResolved.set(true);
    }
  }

  hasRole(roles: EffectiveRole[]): boolean {
    const user = this.currentUser();
    return user ? roles.includes(user.role) : roles.includes('visitor');
  }

  private clearSession(redirect: boolean): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.authResolved.set(true);

    if (redirect) {
      this.router.navigate(['/']);
    }
  }
}
