import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SeoService } from './seo.service';

function snapshotWithSeo(seo: Record<string, unknown> | undefined): ActivatedRouteSnapshot {
  return {
    firstChild: null,
    data: seo ? { seo } : {},
  } as unknown as ActivatedRouteSnapshot;
}

describe('SeoService', () => {
  let routerEvents: Subject<unknown>;
  let routeSnapshot: ActivatedRouteSnapshot;
  let service: SeoService;

  beforeEach(() => {
    routerEvents = new Subject();
    routeSnapshot = snapshotWithSeo({ title: 'Actualités - AHEDNA', description: 'Les dernières actualités.' });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            events: routerEvents.asObservable(),
            url: '/actualites',
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: routeSnapshot },
        },
      ],
    });

    service = TestBed.inject(SeoService);
  });

  afterEach(() => {
    TestBed.inject(Title).setTitle('');
    const meta = TestBed.inject(Meta);
    ['description', 'robots', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'].forEach(
      (name) => meta.removeTag(`name="${name}"`)
    );
    ['og:type', 'og:locale', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image'].forEach(
      (property) => meta.removeTag(`property="${property}"`)
    );
    document.head.querySelector('link[rel="canonical"]')?.remove();
  });

  it('applies the route-specific title and meta description on init', () => {
    service.init();

    expect(TestBed.inject(Title).getTitle()).toBe('Actualités - AHEDNA');
    expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBe(
      'Les dernières actualités.'
    );
  });

  it('falls back to the default SEO data when the route defines none', () => {
    routeSnapshot.data['seo'] = undefined;

    service.init();

    expect(TestBed.inject(Title).getTitle()).toContain('AHEDNA');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('index, follow');
  });

  it('creates a single canonical link tag and keeps it up to date on navigation', () => {
    service.init();

    const canonicalAfterInit = document.head.querySelectorAll('link[rel="canonical"]');
    expect(canonicalAfterInit.length).toBe(1);
    expect(canonicalAfterInit[0].getAttribute('href')).toContain('/actualites');

    (routeSnapshot as any).data = { seo: { title: 'Contact - AHEDNA', description: 'Nous contacter.' } };
    (TestBed.inject(Router) as any).url = '/contact';
    routerEvents.next(new NavigationEnd(1, '/contact', '/contact'));

    const canonicalAfterNavigation = document.head.querySelectorAll('link[rel="canonical"]');
    expect(canonicalAfterNavigation.length).toBe(1);
    expect(canonicalAfterNavigation[0].getAttribute('href')).toContain('/contact');
    expect(TestBed.inject(Title).getTitle()).toBe('Contact - AHEDNA');
  });

  it('falls back to the default logo as the social share image when the route defines none', () => {
    service.init();

    const meta = TestBed.inject(Meta);
    expect(meta.getTag('property="og:image"')?.content).toContain('/logo.png');
    expect(meta.getTag('name="twitter:image"')?.content).toContain('/logo.png');
  });

  it('uses a route-specific social share image when one is provided', () => {
    routeSnapshot.data['seo'] = {
      title: 'Actualités - AHEDNA',
      description: 'Les dernières actualités.',
      image: '/uploads/images/article.png',
    };

    service.init();

    const meta = TestBed.inject(Meta);
    expect(meta.getTag('property="og:image"')?.content).toContain('/uploads/images/article.png');
  });

  it('override() applies page-specific SEO data immediately without waiting for a navigation', () => {
    service.init();

    service.override({
      title: 'Un article précis - AHEDNA',
      description: "Résumé de l'article.",
      image: '/uploads/images/article.png',
    });

    const meta = TestBed.inject(Meta);
    expect(TestBed.inject(Title).getTitle()).toBe('Un article précis - AHEDNA');
    expect(meta.getTag('name="description"')?.content).toBe("Résumé de l'article.");
    expect(meta.getTag('property="og:image"')?.content).toContain('/uploads/images/article.png');
  });

  it('override() keeps the fields it was not given from the current route SEO data', () => {
    service.init();

    service.override({ title: 'Un article précis - AHEDNA' });

    expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBe(
      'Les dernières actualités.'
    );
  });

  it('override() with an empty image or robots value falls back to the site default', () => {
    service.init();

    service.override({ image: '', robots: '' });

    const meta = TestBed.inject(Meta);
    expect(meta.getTag('property="og:image"')?.content).toContain('/logo.png');
    expect(meta.getTag('name="robots"')?.content).toBe('index, follow');
  });

  it('a subsequent navigation replaces an override with the new route SEO data', () => {
    service.init();
    service.override({ title: 'Un article précis - AHEDNA' });

    (routeSnapshot as any).data = { seo: { title: 'Contact - AHEDNA', description: 'Nous contacter.' } };
    (TestBed.inject(Router) as any).url = '/contact';
    routerEvents.next(new NavigationEnd(1, '/contact', '/contact'));

    expect(TestBed.inject(Title).getTitle()).toBe('Contact - AHEDNA');
  });

  it('ignores router events that are not NavigationEnd', () => {
    service.init();
    const titleBefore = TestBed.inject(Title).getTitle();

    (routeSnapshot as any).data = { seo: { title: 'Ne doit pas être appliqué', description: '' } };
    routerEvents.next({ id: 1 });

    expect(TestBed.inject(Title).getTitle()).toBe(titleBefore);
  });
});
