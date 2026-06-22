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
      background: rgba(240, 236, 228, 0.96);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(26, 18, 8, 0.1);
    }

    .nav-frame-default {
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .nav-shell {
      position: relative;
    }

    .nav-shell-default,
    .nav-shell-hero {
      border: 0;
      background: transparent;
    }

    .nav-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-height: 4rem;
      padding: 0.6rem clamp(1rem, 3vw, 2.5rem);
    }

    /* Brand (left) */
    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
      text-decoration: none;
      flex: 0 0 auto;
    }

    .nav-brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      flex-shrink: 0;
      overflow: hidden;
    }

    .nav-brand-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .nav-brand-copy {
      display: grid;
      min-width: 0;
    }

    .nav-brand-title {
      color: #1a1208;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.92rem;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .nav-brand-subtitle {
      display: none;
      color: #6a5444;
      font-family: 'Crimson Text', Georgia, serif;
      font-style: italic;
      font-size: 0.7rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Desktop nav */
    .nav-desktop {
      display: none;
      min-width: 0;
      flex: 1 1 auto;
    }

    .nav-links,
    .nav-meta {
      display: flex;
      align-items: center;
      gap: 0;
      min-width: 0;
    }

    .nav-links {
      justify-content: center;
      flex-wrap: wrap;
    }

    .nav-meta {
      justify-content: flex-end;
      gap: 0.25rem;
    }

    .nav-account {
      position: relative;
    }

    .nav-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      min-height: 2.25rem;
      padding: 0.35rem 0.75rem;
      border: 0;
      background: transparent;
      color: #3a2a14;
      cursor: pointer;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .nav-item::after {
      content: '';
      position: absolute;
      left: 0.75rem;
      right: 0.75rem;
      bottom: 0.2rem;
      height: 1px;
      background: var(--link-tone, #9b2f2a);
      transform: scaleX(0);
      transform-origin: left center;
      transition: transform 0.22s ease;
    }

    .nav-item:hover,
    .active-link {
      color: var(--link-tone-text, var(--link-tone, #9b2f2a));
    }

    .nav-item:hover::after,
    .active-link::after {
      transform: scaleX(1);
    }

    /* CTA "Adhésion" as pill button in meta */
    .nav-meta > a[routerLink="/adhesion"],
    .nav-meta > a.nav-item:last-child {
      min-height: 2.1rem;
      padding: 0.3rem 1rem;
      border-radius: 999px;
      background: #9b2f2a;
      color: #f5ede0 !important;
      border: none;
    }

    .nav-meta > a[routerLink="/adhesion"]::after,
    .nav-meta > a.nav-item:last-child::after {
      display: none;
    }

    .nav-meta > a[routerLink="/adhesion"]:hover,
    .nav-meta > a.nav-item:last-child:hover {
      background: #7f241f;
    }

    /* Account toggle */
    .nav-account-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      min-height: 2.25rem;
      padding: 0.35rem 0.6rem;
      border-radius: 999px;
      border: 1.5px solid rgba(26, 18, 8, 0.15);
      background: transparent;
      color: #3a2a14;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .nav-account-toggle:hover,
    .nav-account-toggle-open {
      background: rgba(26, 18, 8, 0.06);
      border-color: rgba(26, 18, 8, 0.25);
    }

    .nav-account-icon,
    .nav-account-chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .nav-account-icon { width: 1.25rem; height: 1.25rem; }
    .nav-account-chevron { width: 0.8rem; height: 0.8rem; transition: transform 0.2s ease; }
    .nav-account-toggle-open .nav-account-chevron { transform: rotate(180deg); }
    .nav-account-icon svg, .nav-account-chevron svg { width: 100%; height: 100%; }

    /* Account dropdown */
    .nav-account-menu {
      position: absolute;
      top: calc(100% + 0.6rem);
      right: 0;
      width: min(17rem, 72vw);
      padding: 0.65rem;
      border-radius: 0.85rem;
      border: 1px solid rgba(26, 18, 8, 0.1);
      background: #f5f0e8;
      box-shadow: 0 16px 32px rgba(26, 18, 8, 0.12);
      z-index: 20;
    }

    .nav-account-header {
      padding: 0.3rem 0.55rem 0.7rem;
      border-bottom: 1px solid rgba(26, 18, 8, 0.08);
    }

    .nav-account-name {
      color: #1a1208;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.88rem;
      font-weight: 800;
    }

    .nav-account-email {
      margin-top: 0.2rem;
      color: #6a5444;
      font-family: 'Crimson Text', Georgia, serif;
      font-size: 0.78rem;
      word-break: break-word;
    }

    .nav-account-links {
      display: grid;
      gap: 0.15rem;
      padding-top: 0.5rem;
    }

    .nav-account-item {
      display: inline-flex;
      align-items: center;
      width: 100%;
      min-height: 2.5rem;
      padding: 0.5rem 0.7rem;
      border-radius: 0.5rem;
      border: 0;
      background: transparent;
      color: #3a2a14;
      cursor: pointer;
      text-decoration: none;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.8rem;
      font-weight: 700;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .nav-account-item:hover {
      background: rgba(26, 18, 8, 0.07);
      color: #1a1208;
    }

    .nav-account-item-button { text-align: left; }

    /* Mobile toggle */
    .nav-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.6rem;
      min-height: 2.6rem;
      padding: 0;
      border-radius: 999px;
      border: 1.5px solid rgba(26, 18, 8, 0.18);
      background: transparent;
      color: #1a1208;
      transition: background 0.2s ease;
    }

    .nav-toggle:hover {
      background: rgba(26, 18, 8, 0.07);
    }

    .nav-toggle svg {
      width: 1.2rem;
      height: 1.2rem;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    /* Mobile drawer */
    .nav-mobile {
      display: grid;
      gap: 0.5rem;
      margin: 0.4rem clamp(1rem, 3vw, 2.5rem) 0.6rem;
      padding: 0.85rem;
      border-radius: 0.85rem;
      border: 1px solid rgba(26, 18, 8, 0.1);
      background: rgba(245, 240, 232, 0.98);
      box-shadow: 0 14px 28px rgba(26, 18, 8, 0.1);
    }

    .nav-mobile-group {
      display: grid;
      gap: 0.2rem;
    }

    .nav-item-mobile {
      width: 100%;
      justify-content: flex-start;
      border-radius: 0.5rem;
      padding: 0.6rem 0.85rem;
    }

    .nav-item-mobile::after {
      left: 0.85rem;
      right: 0.85rem;
      bottom: 0.3rem;
    }

    @media (min-width: 768px) {
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

      .nav-brand-subtitle {
        display: block;
      }
    }

    @media (min-width: 1120px) {
      .nav-links,
      .nav-meta {
        flex-wrap: nowrap;
      }
    }

    /* Classic reference theme */
    .nav-frame {
      background: transparent;
      border: 0;
      backdrop-filter: none;
    }

    .nav-frame-default {
      position: relative;
      top: auto;
      z-index: 50;
    }

    .nav-shell {
      max-width: 1120px;
      margin: clamp(2.5rem, 5vw, 4rem) auto 0;
      border: 1px solid var(--classic-line, #d5d1c2);
      border-bottom: 0;
      border-radius: var(--classic-radius, 22px) var(--classic-radius, 22px) 0 0;
      background: var(--classic-panel, #f6f5ec);
      box-shadow: var(--classic-shadow, 0 18px 52px rgba(21, 25, 18, 0.09));
      overflow: visible;
    }

    .nav-frame-hero .nav-shell {
      max-width: none;
      margin: 0;
      border: 0;
      border-bottom: 1px solid var(--classic-line, #d5d1c2);
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }

    .nav-row {
      min-height: 4.25rem;
      padding: 0.85rem clamp(1.25rem, 4vw, 2.5rem);
    }

    .nav-brand {
      gap: 0.55rem;
    }

    .nav-brand-mark {
      width: 1.75rem;
      height: 1.75rem;
    }

    .nav-brand-title {
      color: var(--classic-green, #173d27);
      font-family: var(--site-sans-font, Arial, sans-serif);
      font-size: 0.86rem;
      font-weight: 700;
      letter-spacing: 0;
    }

    .nav-brand-subtitle {
      color: var(--classic-muted, #6f7168);
      font-family: var(--site-sans-font, Arial, sans-serif);
      font-size: 0.58rem;
      font-style: normal;
      letter-spacing: 0;
    }

    .nav-links,
    .nav-meta {
      gap: 0.15rem;
    }

    .nav-item {
      min-height: 2rem;
      padding: 0.35rem 0.65rem;
      color: var(--classic-ink, #111512);
      font-family: var(--site-sans-font, Arial, sans-serif);
      font-size: 0.62rem;
      font-weight: 500;
      letter-spacing: 0;
      text-transform: none;
    }

    .nav-item::after {
      left: 0.65rem;
      right: 0.65rem;
      bottom: 0.3rem;
      height: 1px;
      background: currentColor;
    }

    .nav-item:hover,
    .active-link {
      color: var(--classic-green, #173d27);
    }

    .nav-meta > a.nav-item {
      min-height: 2.05rem;
      border-radius: 999px;
    }

    .nav-meta > a.nav-item:last-child {
      padding: 0.38rem 0.9rem;
      background: var(--classic-green, #173d27);
      color: #fbfaf3 !important;
    }

    .nav-meta > a.nav-item:last-child::after {
      display: none;
    }

    .nav-account-toggle {
      min-height: 2.05rem;
      border-color: var(--classic-line, #d5d1c2);
      border-radius: 999px;
      color: var(--classic-ink, #111512);
    }

    .nav-account-menu,
    .nav-mobile {
      border: 1px solid var(--classic-line, #d5d1c2);
      border-radius: 14px;
      background: var(--classic-panel, #f6f5ec);
      box-shadow: 0 18px 38px rgba(21, 25, 18, 0.12);
    }

    .nav-toggle {
      width: 2.5rem;
      min-height: 2.5rem;
      border-color: var(--classic-line, #d5d1c2);
      border-radius: 999px;
      background: transparent;
      color: var(--classic-green, #173d27);
    }

    @media (max-width: 767px) {
      .nav-shell {
        margin-top: 1rem;
        border-radius: 18px 18px 0 0;
      }

      .nav-frame-hero .nav-shell {
        margin-top: 0;
      }

      .nav-brand-subtitle {
        display: none;
      }
    }
  `]
})
export class NavbarComponent {
  readonly variant = input<'default' | 'hero'>('default');
  readonly logoPath = '/logo.png';
  readonly exactLinkOptions = { exact: true };
  readonly inexactLinkOptions = { exact: false };
  readonly navLinks: { route: string; labelKey: string; exact: boolean; tone: string; toneText?: string }[] = [
    { route: '/', labelKey: 'navbar.links.home', exact: true, tone: 'var(--brand-turquoise)' },
    { route: '/histoire', labelKey: 'navbar.links.history', exact: false, tone: 'var(--brand-red)' },
    { route: '/actualites', labelKey: 'navbar.links.news', exact: false, tone: 'var(--brand-yellow)', toneText: 'var(--site-ink)' },
    { route: '/evenements', labelKey: 'navbar.links.events', exact: false, tone: 'var(--brand-green)' },
    { route: '/forum', labelKey: 'navbar.links.forum', exact: false, tone: 'var(--brand-red)' },
    { route: '/galerie', labelKey: 'navbar.links.gallery', exact: false, tone: 'var(--brand-turquoise)' },
    { route: '/adhesion', labelKey: 'navbar.links.membership', exact: false, tone: 'var(--brand-yellow)', toneText: 'var(--site-ink)' },
  ];

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
