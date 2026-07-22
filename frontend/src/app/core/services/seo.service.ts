import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

type SeoData = {
  title: string;
  description: string;
  robots?: string;
  image?: string;
};

const DEFAULT_SEO: SeoData = {
  title: 'AHEDNA - Association Harkis et leurs Enfants en Dordogne et Nouvelle-Aquitaine',
  description:
    "AHEDNA accompagne les familles harkies, transmet leur histoire et anime une communauté en Dordogne et Nouvelle-Aquitaine.",
  robots: 'index, follow',
  image: '/logo.png',
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  init(): void {
    this.applySeo();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.applySeo());
  }

  // Lasts until the next navigation, at which point the route's own SEO data takes over again.
  override(partial: Partial<SeoData>): void {
    this.applySeoData({ ...this.currentSeo(), ...partial });
  }

  private applySeo(): void {
    this.applySeoData(this.currentSeo());
  }

  private applySeoData(seo: SeoData): void {
    const canonicalUrl = this.absoluteUrl(this.router.url);
    const imageUrl = this.absoluteUrl(seo.image || DEFAULT_SEO.image || '/logo.png');

    this.title.setTitle(seo.title);
    this.setCanonical(canonicalUrl);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({ name: 'robots', content: seo.robots || DEFAULT_SEO.robots || 'index, follow' });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:locale', content: 'fr_FR' });
    this.meta.updateTag({ property: 'og:site_name', content: 'AHEDNA' });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({ property: 'og:description', content: seo.description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({ name: 'twitter:description', content: seo.description });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
  }

  private currentSeo(): SeoData {
    let child = this.route.snapshot;

    while (child.firstChild) {
      child = child.firstChild;
    }

    return {
      ...DEFAULT_SEO,
      ...(child.data['seo'] as Partial<SeoData> | undefined),
    };
  }

  private absoluteUrl(path: string): string {
    if (typeof window === 'undefined') {
      return path;
    }

    return new URL(path || '/', window.location.origin).toString();
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }
}
