import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <footer class="site-footer px-4 sm:px-6 lg:px-8">
        <div class="site-footer-inner max-w-7xl mx-auto">
          <div class="footer-layout">
            <div class="footer-main text-center">
              <div class="flex items-center justify-center gap-3">
                <span class="footer-logo-shell">
                  <img src="/logo.png" [alt]="t('navbar.brand.logoAlt')" class="footer-logo">
                </span>
                <h4 class="footer-brand text-lg font-vintage font-bold">{{ t('footer.brand') }}</h4>
              </div>
              <p class="footer-copy mt-2 font-serif italic leading-relaxed">
                {{ t('footer.line1') }}<br>
                {{ t('footer.line2') }}
              </p>
              <div class="footer-links mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.82rem] font-serif font-bold">
                <a routerLink="/contact" class="footer-link">
                  {{ t('footer.contact') }}
                </a>
                <a routerLink="/mentions-legales" class="footer-link">{{ t('footer.legal') }}</a>
                <a routerLink="/politique-confidentialite" class="footer-link">{{ t('footer.privacy') }}</a>
              </div>
            </div>

            <div class="footer-meta text-center lg:text-right">
              <div
                class="footer-language-switch"
                role="group"
                [attr.aria-label]="t('footer.language.title')">
                @for (language of languages; track language.code) {
                  <button
                    type="button"
                    (click)="i18nService.setActiveLang(language.code)"
                    class="footer-lang-button"
                    [class.footer-lang-button-active]="i18nService.activeLang() === language.code"
                    [attr.aria-label]="t(language.labelKey)"
                    [attr.aria-pressed]="i18nService.activeLang() === language.code"
                    [attr.title]="t(language.labelKey)">
                    <span class="footer-lang-code" aria-hidden="true">{{ language.shortLabel }}</span>
                  </button>
                }
              </div>
              <p class="footer-copyright font-serif">{{ t('footer.copyright') }}</p>
            </div>
          </div>
        </div>
      </footer>
    </ng-container>
  `,
  styles: [`
    .site-footer {
      position: relative;
      margin-top: 0;
      padding-top: 0.75rem;
      padding-bottom: 0.75rem;
      color: var(--site-ink, #23180f);
      background:
        linear-gradient(rgba(37, 29, 20, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(37, 29, 20, 0.03) 1px, transparent 1px),
        var(--site-cream, #eadbbd);
      background-size: 34px 34px, 34px 34px, auto;
      border-top: 1px solid var(--site-border-strong, rgba(37, 29, 20, 0.72));
    }

    .site-footer-inner {
      padding: 0.85rem 0 0.35rem;
      border-top: 1px solid var(--site-border-strong, rgba(37, 29, 20, 0.72));
    }

    .footer-layout {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1.1rem 1.5rem;
    }

    .footer-main {
      flex: 1 1 auto;
      min-width: 0;
      text-align: center;
    }

    .footer-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.55rem;
      flex: 0 0 auto;
    }

    .footer-language-switch {
      display: inline-flex;
      align-items: center;
      gap: 0.16rem;
      padding: 0.18rem;
      border-radius: 999px;
      background: #eee9dc;
      border: 1px solid rgba(21, 25, 18, 0.18);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.64);
    }

    .footer-brand {
      color: var(--site-ink, #23180f);
      line-height: 1;
      font-family: var(--site-sans-font, Arial, sans-serif);
      text-transform: uppercase;
    }

    .footer-copy,
    .footer-links,
    .footer-copyright {
      color: var(--site-muted, #6d5744);
    }

    .footer-copy {
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .footer-link {
      color: inherit;
      text-decoration: none;
      font-weight: 700;
      transition: color 0.18s ease;
    }

    .footer-link:hover {
      color: var(--brand-red);
    }

    .footer-lang-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.55rem;
      min-height: 2.15rem;
      padding: 0 0.65rem;
      border-radius: 999px;
      border: 1px solid transparent;
      background: transparent;
      color: #3d4138;
      font-family: var(--site-sans-font, Arial, sans-serif);
      transition:
        background 0.18s ease,
        color 0.18s ease,
        border-color 0.18s ease,
        box-shadow 0.18s ease;
    }

    .footer-lang-button-active {
      background: #173d27;
      border-color: #173d27;
      color: #fbfaf3;
      box-shadow: 0 8px 18px rgba(21, 25, 18, 0.16);
    }

    .footer-lang-code {
      color: inherit;
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      line-height: 1;
    }

    .footer-logo-shell {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      padding: 0.28rem;
      border-radius: 0;
      background:
        rgba(234, 219, 189, 0.48);
      border: 1px solid var(--site-border, rgba(37, 29, 20, 0.38));
    }

    .footer-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center center;
      filter: saturate(1.02) contrast(1.02);
    }

    .footer-brand,
    .footer-copy,
    .footer-links,
    .footer-copyright {
      text-shadow: 0 1px 0 rgba(255, 255, 255, 0.22);
    }

    .footer-copyright {
      font-size: 0.74rem;
      line-height: 1.3;
    }

    @media (max-width: 768px) {
      .site-footer {
        padding-bottom: 0.35rem;
      }

      .site-footer-inner {
        padding: 0;
      }

      .footer-layout {
        flex-direction: column;
        align-items: center;
        gap: 0.8rem;
      }

      .footer-meta {
        width: 100%;
        gap: 0.45rem;
      }
    }

    .site-footer {
      margin-top: 0;
      padding: 1.5rem clamp(0.9rem, 2.5vw, 2rem) 2.5rem;
      background: var(--classic-bg, #d9d7cb);
      border-top: 0;
      color: var(--classic-ink, #111512);
      font-family: var(--site-sans-font, Arial, sans-serif);
    }

    .site-footer-inner {
      max-width: 1120px;
      padding: 1.25rem clamp(1.25rem, 4vw, 2.5rem);
      border: 1px solid var(--classic-line, #d5d1c2);
      border-radius: var(--classic-radius, 22px);
      background: var(--classic-panel, #f6f5ec);
    }

    .footer-brand,
    .footer-copy,
    .footer-links,
    .footer-copyright,
    .footer-lang-code {
      font-family: var(--site-sans-font, Arial, sans-serif);
      font-style: normal;
      letter-spacing: 0;
      text-transform: none;
      text-shadow: none;
    }

    .footer-brand,
    .footer-link:hover {
      color: var(--classic-green, #173d27);
    }

    .footer-language-switch,
    .footer-logo-shell {
      border-radius: 999px;
      border-color: var(--classic-line, #d5d1c2);
      backdrop-filter: none;
    }

    .footer-logo-shell {
      background: var(--classic-panel-soft, #efede2);
    }
  `],
})
export class SiteFooterComponent {
  i18nService = inject(I18nService);

  languages = [
    { code: 'fr', shortLabel: 'FR', labelKey: 'footer.language.options.fr' },
    { code: 'en', shortLabel: 'EN', labelKey: 'footer.language.options.en' },
  ];
}
