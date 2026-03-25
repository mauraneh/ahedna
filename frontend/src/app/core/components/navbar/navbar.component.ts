import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <div
        class="nav-frame"
        [class.nav-frame-default]="variant() === 'default'"
        [class.nav-frame-hero]="variant() === 'hero'">
        <nav
          class="nav-shell max-w-7xl mx-auto"
          [class.nav-shell-default]="variant() === 'default'"
          [class.nav-shell-hero]="variant() === 'hero'">
          <div class="nav-row">
            <a routerLink="/" class="nav-brand" (click)="closeMenu()">
              <span class="nav-brand-mark">
                <img [src]="logoPath" [alt]="t('navbar.brand.logoAlt')" class="nav-brand-image">
              </span>

              <span class="nav-brand-copy">
                <span class="nav-brand-title">{{ t('navbar.brand.name') }}</span>
                <span class="nav-brand-subtitle">{{ t('navbar.brand.region') }}</span>
              </span>
            </a>

            <div class="nav-desktop">
              <div class="nav-links">
                @for (link of navLinks; track link.route) {
                  <a
                    [routerLink]="link.route"
                    routerLinkActive="active-link"
                    [routerLinkActiveOptions]="link.exact ? exactLinkOptions : inexactLinkOptions"
                    [style.--link-tone]="link.tone"
                    [style.--link-tone-text]="link.toneText ?? null"
                    class="nav-item">
                    {{ t(link.labelKey) }}
                  </a>
                }
              </div>

              <div class="nav-meta">
                @if (authService.isAuthenticated()) {
                  <div class="nav-account">
                    <button
                      type="button"
                      class="nav-account-toggle"
                      [class.nav-account-toggle-open]="accountMenuOpen"
                      (click)="toggleAccountMenu()"
                      [attr.aria-expanded]="accountMenuOpen"
                      [attr.aria-label]="t('navbar.auth.accountMenu')">
                      <span class="nav-account-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M20 21a8 8 0 0 0-16 0"></path>
                          <circle cx="12" cy="8" r="4"></circle>
                        </svg>
                      </span>
                      <span class="nav-account-chevron" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m6 9 6 6 6-6"></path>
                        </svg>
                      </span>
                    </button>

                    @if (accountMenuOpen) {
                      <div class="nav-account-menu">
                        <div class="nav-account-header">
                          <p class="nav-account-name">{{ getAccountDisplayName() }}</p>
                          <p class="nav-account-email">{{ authService.currentUser()?.email }}</p>
                        </div>

                        <div class="nav-account-links">
                          <a
                            routerLink="/profil"
                            class="nav-account-item"
                            style="--link-tone: var(--brand-turquoise)"
                            (click)="closeAccountMenu()">
                            {{ t('navbar.auth.profile') }}
                          </a>
                          @if (authService.hasRole(['auteur', 'admin'])) {
                            <a
                              routerLink="/contenu"
                              class="nav-account-item"
                              style="--link-tone: var(--brand-yellow); --link-tone-text: var(--site-ink)"
                              (click)="closeAccountMenu()">
                              {{ t('navbar.auth.content') }}
                            </a>
                          }
                          @if (authService.hasRole(['admin'])) {
                            <a
                              routerLink="/admin"
                              class="nav-account-item"
                              style="--link-tone: var(--brand-green)"
                              (click)="closeAccountMenu()">
                              {{ t('navbar.auth.admin') }}
                            </a>
                          }
                          <button
                            type="button"
                            class="nav-account-item nav-account-item-button"
                            style="--link-tone: var(--brand-red)"
                            (click)="logout()">
                            {{ t('navbar.auth.logout') }}
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <a routerLink="/login" class="nav-item" style="--link-tone: var(--brand-turquoise)">
                    {{ t('navbar.auth.login') }}
                  </a>
                  <a routerLink="/register" class="nav-item" style="--link-tone: var(--brand-red)">
                    {{ t('navbar.auth.register') }}
                  </a>
                }
              </div>
            </div>

            <button
              type="button"
              class="nav-toggle"
              (click)="toggleMenu()"
              [attr.aria-label]="menuOpen ? t('navbar.mobile.close') : t('navbar.mobile.open')">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                @if (menuOpen) {
                  <path d="M6 6 18 18"></path>
                  <path d="M18 6 6 18"></path>
                } @else {
                  <path d="M4 7h16"></path>
                  <path d="M4 12h16"></path>
                  <path d="M4 17h16"></path>
                }
              </svg>
            </button>
          </div>

          @if (menuOpen) {
            <div class="nav-mobile">
              <div class="nav-mobile-group">
                @for (link of navLinks; track link.route) {
                  <a
                    [routerLink]="link.route"
                    routerLinkActive="active-link"
                    [routerLinkActiveOptions]="link.exact ? exactLinkOptions : inexactLinkOptions"
                    [style.--link-tone]="link.tone"
                    [style.--link-tone-text]="link.toneText ?? null"
                    class="nav-item nav-item-mobile"
                    (click)="closeMenu()">
                    {{ t(link.labelKey) }}
                  </a>
                }
              </div>

              <div class="nav-mobile-group">
                @if (authService.isAuthenticated()) {
                  <a
                    routerLink="/profil"
                    routerLinkActive="active-link"
                    class="nav-item nav-item-mobile"
                    style="--link-tone: var(--brand-turquoise)"
                    (click)="closeMenu()">
                    {{ t('navbar.auth.profile') }}
                  </a>
                  @if (authService.hasRole(['auteur', 'admin'])) {
                    <a
                      routerLink="/contenu"
                      routerLinkActive="active-link"
                      class="nav-item nav-item-mobile"
                      style="--link-tone: var(--brand-yellow); --link-tone-text: var(--site-ink)"
                      (click)="closeMenu()">
                      {{ t('navbar.auth.content') }}
                    </a>
                  }
                  @if (authService.hasRole(['admin'])) {
                    <a
                      routerLink="/admin"
                      routerLinkActive="active-link"
                      class="nav-item nav-item-mobile"
                      style="--link-tone: var(--brand-green)"
                      (click)="closeMenu()">
                      {{ t('navbar.auth.admin') }}
                    </a>
                  }
                  <button
                    type="button"
                    (click)="logout()"
                    class="nav-item nav-item-mobile nav-item-button"
                    style="--link-tone: var(--brand-red)">
                    {{ t('navbar.auth.logout') }}
                  </button>
                } @else {
                  <a
                    routerLink="/login"
                    class="nav-item nav-item-mobile"
                    style="--link-tone: var(--brand-turquoise)"
                    (click)="closeMenu()">
                    {{ t('navbar.auth.login') }}
                  </a>
                  <a
                    routerLink="/register"
                    class="nav-item nav-item-mobile"
                    style="--link-tone: var(--brand-red)"
                    (click)="closeMenu()">
                    {{ t('navbar.auth.register') }}
                  </a>
                }
              </div>
            </div>
          }
        </nav>
      </div>
    </ng-container>
  `,
  styles: [`
    :host {
      display: block;
    }

    .nav-frame {
      padding: 1rem 1rem 0;
    }

    .nav-frame-default {
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .nav-shell {
      position: relative;
    }

    .nav-shell-default {
      border: 0;
      border-radius: 0;
      background: transparent;
      backdrop-filter: none;
      box-shadow: none;
    }

    .nav-shell-hero {
      border: 0;
      border-radius: 0;
      background: transparent;
      backdrop-filter: none;
      box-shadow: none;
    }

    .nav-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-height: 4.9rem;
      padding: 0.8rem 1rem 0.8rem 1.05rem;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-width: 0;
      text-decoration: none;
      flex: 0 0 auto;
    }

    .nav-brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      border: 0;
      border-radius: 0;
      background: transparent;
      overflow: hidden;
      flex-shrink: 0;
    }

    .nav-brand-image {
      width: 88%;
      height: 88%;
      object-fit: contain;
    }

    .nav-brand-copy {
      display: grid;
      min-width: 0;
    }

    .nav-brand-title {
      color: #1f180f;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 1.18rem;
      font-weight: 900;
      letter-spacing: 0.08em;
    }

    .nav-brand-subtitle {
      display: none;
      color: #7b6248;
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-frame-hero .nav-brand-title,
    .nav-frame-hero .nav-item {
      color: rgba(255, 250, 244, 0.96);
      text-shadow: 0 8px 18px rgba(17, 22, 31, 0.18);
    }

    .nav-frame-hero .nav-brand-subtitle {
      color: rgba(255, 250, 244, 0.82);
    }

    .nav-desktop {
      display: none;
      min-width: 0;
      flex: 1 1 auto;
    }

    .nav-links,
    .nav-meta {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      min-width: 0;
    }

    .nav-links {
      justify-content: center;
      flex-wrap: wrap;
    }

    .nav-meta {
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .nav-account {
      position: relative;
    }

    .nav-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      min-height: 2.35rem;
      padding: 0.4rem 0.58rem 0.75rem;
      border: 0;
      background: transparent;
      color: #4e3f30;
      cursor: pointer;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .nav-item::after {
      content: '';
      position: absolute;
      left: 0.58rem;
      right: 0.58rem;
      bottom: 0.22rem;
      height: 2px;
      border-radius: 999px;
      background: var(--link-tone, var(--brand-turquoise));
      transform: scaleX(0);
      transform-origin: left center;
      transition: transform 0.22s ease;
    }

    .nav-item:hover,
    .active-link {
      color: var(--link-tone-text, var(--link-tone, var(--brand-turquoise)));
    }

    .nav-item:hover::after,
    .active-link::after {
      transform: scaleX(1);
    }

    .nav-account-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-height: 2.35rem;
      padding: 0.35rem 0.1rem 0.65rem;
      border-radius: 0;
      border: 0;
      background: transparent;
      color: #4e3f30;
      transition:
        border-color 0.2s ease,
        background-color 0.2s ease,
        color 0.2s ease;
    }

    .nav-account-toggle:hover,
    .nav-account-toggle-open {
      color: var(--brand-turquoise);
    }

    .nav-frame-hero .nav-account-toggle {
      color: #fffaf5;
    }

    .nav-frame-hero .nav-account-toggle:hover,
    .nav-frame-hero .nav-account-toggle-open {
      color: var(--brand-turquoise);
    }

    .nav-account-icon,
    .nav-account-chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .nav-account-icon {
      width: 1.55rem;
      height: 1.55rem;
    }

    .nav-account-chevron {
      width: 0.95rem;
      height: 0.95rem;
      transition: transform 0.2s ease;
    }

    .nav-account-toggle-open .nav-account-chevron {
      transform: rotate(180deg);
    }

    .nav-account-icon svg,
    .nav-account-chevron svg {
      width: 100%;
      height: 100%;
    }

    .nav-account-menu {
      position: absolute;
      top: calc(100% + 0.7rem);
      right: 0;
      width: min(18rem, 72vw);
      padding: 0.85rem;
      border-radius: 1.35rem;
      border: 1px solid rgba(95, 72, 49, 0.12);
      background: rgba(255, 254, 251, 0.98);
      box-shadow: 0 22px 42px rgba(15, 23, 42, 0.16);
      backdrop-filter: blur(18px);
      z-index: 20;
    }

    .nav-frame-default .nav-account-menu {
      background: var(--site-surface-bg);
      backdrop-filter: none;
      box-shadow: 0 18px 32px rgba(15, 23, 42, 0.12);
    }

    .nav-frame-hero .nav-account-menu {
      border-color: rgba(255, 255, 255, 0.16);
      background: rgba(18, 26, 38, 0.92);
      box-shadow: 0 22px 42px rgba(10, 16, 26, 0.32);
    }

    .nav-account-header {
      padding: 0.35rem 0.4rem 0.8rem;
      border-bottom: 1px solid rgba(95, 72, 49, 0.08);
    }

    .nav-frame-hero .nav-account-header {
      border-bottom-color: rgba(255, 255, 255, 0.1);
    }

    .nav-account-name {
      color: var(--site-ink);
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.98rem;
      font-weight: 800;
    }

    .nav-account-email {
      margin-top: 0.22rem;
      color: var(--site-muted);
      font-size: 0.78rem;
      font-family: 'Crimson Text', Georgia, serif;
      word-break: break-word;
    }

    .nav-frame-hero .nav-account-name {
      color: #fffaf5;
    }

    .nav-frame-hero .nav-account-email {
      color: rgba(255, 250, 244, 0.72);
    }

    .nav-account-links {
      display: grid;
      gap: 0.25rem;
      padding-top: 0.6rem;
    }

    .nav-account-item {
      display: inline-flex;
      align-items: center;
      width: 100%;
      min-height: 2.8rem;
      padding: 0.65rem 0.8rem;
      border-radius: 0.95rem;
      border: 0;
      background: transparent;
      color: #4e3f30;
      cursor: pointer;
      text-decoration: none;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.88rem;
      font-weight: 700;
      transition:
        background-color 0.2s ease,
        color 0.2s ease,
        transform 0.2s ease;
    }

    .nav-account-item:hover {
      background: rgba(var(--brand-turquoise-rgb), 0.1);
      color: var(--link-tone-text, var(--link-tone, var(--brand-turquoise)));
      transform: translateX(2px);
    }

    .nav-account-item-button {
      text-align: left;
    }

    .nav-frame-hero .nav-account-item {
      color: rgba(255, 250, 244, 0.94);
    }

    .nav-frame-hero .nav-account-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .nav-frame-hero .active-link {
      color: #fffdf8;
    }

    .nav-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      min-height: 3rem;
      padding: 0;
      border-radius: 999px;
      border: 1px solid var(--brand-red);
      background: var(--brand-red);
      color: var(--site-button-primary-text);
      transition:
        transform 0.2s ease,
        background-color 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease;
    }

    .nav-toggle:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 24px rgba(var(--brand-red-rgb), 0.24);
    }

    .nav-toggle svg {
      width: 1.3rem;
      height: 1.3rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .nav-frame-hero .nav-toggle {
      border-color: rgba(255, 255, 255, 0.22);
      background: rgba(18, 26, 38, 0.24);
      color: #fffaf5;
      backdrop-filter: blur(14px);
    }

    .nav-frame-hero .nav-toggle:hover {
      background: rgba(18, 26, 38, 0.4);
      border-color: rgba(255, 255, 255, 0.32);
    }

    .nav-mobile {
      display: grid;
      gap: 0.85rem;
      margin-top: 0.5rem;
      padding: 1rem 1rem 0.7rem;
      border: 1px solid rgba(95, 72, 49, 0.12);
      border-radius: 1.2rem;
      background: var(--site-surface-bg);
      box-shadow: 0 18px 32px rgba(15, 23, 42, 0.08);
    }

    .nav-frame-hero .nav-mobile {
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(18, 26, 38, 0.6);
      box-shadow: 0 22px 36px rgba(10, 16, 26, 0.26);
    }

    .nav-mobile-group {
      display: grid;
      gap: 0.45rem;
    }

    .nav-item-mobile {
      width: 100%;
      justify-content: flex-start;
      padding: 0.7rem 0 0.9rem;
    }

    .nav-item-mobile::after {
      left: 0;
      right: 0;
      bottom: 0.3rem;
    }

    .nav-frame-hero .nav-item-mobile {
      color: rgba(255, 250, 244, 0.96);
    }

    @media (min-width: 768px) {
      .nav-row {
        padding: 0.9rem 1.15rem 0.9rem 1.15rem;
      }

      .nav-desktop {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        column-gap: 1rem;
      }

      .nav-toggle,
      .nav-mobile {
        display: none;
      }
    }

    @media (min-width: 1120px) {
      .nav-brand-subtitle {
        display: block;
      }

      .nav-links,
      .nav-meta {
        flex-wrap: nowrap;
      }
    }
  `]
})
export class NavbarComponent {
  readonly variant = input<'default' | 'hero'>('default');
  readonly logoPath = '/logo.png';
  readonly exactLinkOptions = { exact: true };
  readonly inexactLinkOptions = { exact: false };
  readonly navLinks = [
    { route: '/', labelKey: 'navbar.links.home', exact: true, tone: 'var(--brand-turquoise)' },
    { route: '/histoire', labelKey: 'navbar.links.history', exact: false, tone: 'var(--brand-red)' },
    { route: '/actualites', labelKey: 'navbar.links.news', exact: false, tone: 'var(--brand-yellow)', toneText: 'var(--site-ink)' },
    { route: '/evenements', labelKey: 'navbar.links.events', exact: false, tone: 'var(--brand-green)' },
    { route: '/forum', labelKey: 'navbar.links.forum', exact: false, tone: 'var(--brand-red)' },
    { route: '/galerie', labelKey: 'navbar.links.gallery', exact: false, tone: 'var(--brand-turquoise)' },
    { route: '/adhesion', labelKey: 'navbar.links.membership', exact: false, tone: 'var(--brand-yellow)', toneText: 'var(--site-ink)' },
  ] as const;

  authService = inject(AuthService);
  private elementRef = inject(ElementRef<HTMLElement>);
  menuOpen = false;
  accountMenuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      this.accountMenuOpen = false;
    }
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen = !this.accountMenuOpen;
    if (this.accountMenuOpen) {
      this.menuOpen = false;
    }
  }

  closeAccountMenu(): void {
    this.accountMenuOpen = false;
  }

  getAccountDisplayName(): string {
    const user = this.authService.currentUser();

    if (!user) {
      return '';
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return fullName || user.email;
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.menuOpen = false;
      this.accountMenuOpen = false;
    }
  }

  logout(): void {
    this.closeMenu();
    this.closeAccountMenu();
    this.authService.logout();
  }
}
