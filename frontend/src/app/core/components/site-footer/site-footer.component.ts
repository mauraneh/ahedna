import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule, TranslocoDirective],
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
                <a href="mailto:ahedna.nouvelleaquitaine@gmail.com" class="footer-link">
                  {{ t('footer.contact') }}
                </a>
                <a href="#" class="footer-link">{{ t('footer.legal') }}</a>
                <a href="#" class="footer-link">{{ t('footer.privacy') }}</a>
              </div>
            </div>

            <div class="footer-meta text-center lg:text-right">
              <div
                class="footer-language-switch"
                [attr.aria-label]="t('footer.language.title')">
                @for (language of languages; track language.code) {
                  <button
                    type="button"
                    (click)="i18nService.setActiveLang(language.code)"
                    class="footer-lang-button"
                    [class.footer-lang-button-active]="i18nService.activeLang() === language.code"
                    [attr.aria-label]="t(language.labelKey)">
                    <span class="footer-lang-flag" aria-hidden="true">{{ language.flag }}</span>
                    <span class="footer-lang-label">{{ t(language.labelKey) }}</span>
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
      padding-top: 0;
      padding-bottom: 0.5rem;
      color: var(--site-ink, #23180f);
      background: transparent;
    }

    .site-footer-inner {
      padding: 0.1rem 0 0.35rem;
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
      gap: 0.2rem;
      padding: 0.18rem;
      border-radius: 999px;
      background: rgba(var(--brand-yellow-rgb), 0.14);
      border: 1px solid rgba(var(--brand-yellow-rgb), 0.18);
      backdrop-filter: blur(8px);
    }

    .footer-brand {
      color: var(--site-ink, #23180f);
      line-height: 1;
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
      gap: 0.38rem;
      min-height: 2rem;
      padding: 0.28rem 0.5rem;
      border-radius: 999px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--site-ink, #23180f);
      transition:
        background 0.18s ease,
        color 0.18s ease,
        border-color 0.18s ease,
        opacity 0.18s ease;
      opacity: 0.66;
    }

    .footer-lang-button-active {
      background: rgba(var(--brand-turquoise-rgb), 0.18);
      border-color: rgba(var(--brand-turquoise-rgb), 0.22);
      color: var(--site-ink);
      opacity: 1;
    }

    .footer-lang-label {
      color: inherit;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      line-height: 1;
    }

    .footer-lang-flag {
      font-size: 0.88rem;
      line-height: 1;
    }

    .footer-logo-shell {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      padding: 0.28rem;
      border-radius: 999px;
      background:
        radial-gradient(circle at center, rgba(255, 255, 255, 0.34), rgba(245, 230, 211, 0.04)),
        rgba(255, 255, 255, 0.05);
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
  `],
})
export class SiteFooterComponent {
  i18nService = inject(I18nService);

  languages = [
    { code: 'fr', flag: '🇫🇷', labelKey: 'footer.language.options.fr' },
    { code: 'en', flag: '🇬🇧', labelKey: 'footer.language.options.en' },
  ];
}
