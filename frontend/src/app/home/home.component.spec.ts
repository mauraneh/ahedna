import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { HomeComponent } from './home.component';
import { AuthService } from '../core/services/auth.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { NoopAuthServiceStub } from '../testing/noop-auth-service-stub';

const homeTranslation = {
  home: {
    hero: {
      titlePrimary: 'AHEDNA',
      titleSecondary: '',
      region: '',
      subtitle: '',
      primaryCta: '',
      secondaryCta: '',
      visual: { url: '/hero.jpg', alt: 'Hero' },
    },
    shortcuts: [],
    about: {
      eyebrow: '',
      title: '',
      body1: '',
      body2: '',
      cta: '',
      visual: { url: '/about.jpg', alt: 'About' },
    },
    sections: {
      news: { eyebrow: '', title: '', body: '', actionLabel: '' },
      events: { eyebrow: '', title: '', body: '', actionLabel: '' },
    },
    team: {
      eyebrow: '',
      title: '',
      body: '',
      previousLabel: 'Précédent',
      nextLabel: 'Suivant',
      members: [],
    },
    memory: {
      eyebrow: '',
      title: '',
      body: '',
      actionLabel: '',
      visual: { url: '/memory.jpg', alt: 'Memory' },
      stats: [],
    },
  },
};

class TranslocoTestingLoader implements TranslocoLoader {
  getTranslation() {
    return of(homeTranslation);
  }
}

function createComponent() {
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideTranslocoTesting(TranslocoTestingLoader),
      { provide: AuthService, useClass: NoopAuthServiceStub },
    ],
  });

  const fixture = TestBed.createComponent(HomeComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  return { fixture, httpMock };
}

describe('HomeComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('splits authored and press news cards and truncates long excerpts', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/news?published=true`).flush({
      news: [
        {
          id: 'n1',
          title: 'Actualité interne',
          content: '',
          excerpt: 'x'.repeat(200),
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'n2',
          title: 'Actualité externe',
          content: '',
          excerpt: 'Résumé court.',
          source_name: 'Le Monde',
          source_url: 'https://www.lemonde.fr/a',
          created_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    const component = fixture.componentInstance;
    expect(component.authoredNewsCards.length).toBe(1);
    expect(component.authoredNewsCards[0].body.endsWith('...')).toBe(true);
    expect(component.authoredNewsCards[0].body.length).toBe(183);

    expect(component.pressNewsCards.length).toBe(1);
    expect(component.pressNewsCards[0].sourceLabel).toBe('Le Monde');
  });

  it('falls back to the hostname as the source label when no source name is given', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/news?published=true`).flush({
      news: [
        {
          id: 'n1',
          title: 'Externe',
          content: '',
          excerpt: '',
          source_url: 'https://www.lemonde.fr/a',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    expect(fixture.componentInstance.pressNewsCards[0].sourceLabel).toBe('lemonde.fr');
  });

  it('builds event cards with a fallback image when the event has none', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/news?published=true`).flush({ news: [] });
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({
      events: [
        {
          id: 'e1',
          title: 'Assemblée générale',
          description: 'Une description assez longue '.repeat(10),
          event_date: '2027-01-01T10:00:00.000Z',
          location: 'Périgueux',
        },
      ],
    });

    const component = fixture.componentInstance;
    expect(component.eventCards.length).toBe(1);
    expect(component.eventCards[0].imageUrl).toBe('/memory.jpg');
    expect(component.eventCards[0].body.length).toBeLessThanOrEqual(144);
  });

  it('keeps the events list empty when the API returns no upcoming events', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/news?published=true`).flush({ news: [] });
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    expect(fixture.componentInstance.eventCards).toEqual([]);
  });

  it('recovers gracefully when the news and events requests fail', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    httpMock
      .expectOne(`${environment.apiUrl}/news?published=true`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    httpMock
      .expectOne(`${environment.apiUrl}/events?type=upcoming`)
      .flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.authoredNewsCards).toEqual([]);
    expect(fixture.componentInstance.eventCards).toEqual([]);
  });

  it('uses the member label as a fallback display name', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/news?published=true`).flush({ news: [] });
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    const component = fixture.componentInstance;
    expect(component.getMemberDisplayName({ name: '  ', role: 'Bénévole', photoUrl: '' })).toBe(
      'Bénévole'
    );
    expect(
      component.getMemberDisplayName({ name: 'Jean Dupont', role: 'Bénévole', photoUrl: '' })
    ).toBe('Jean Dupont');
  });

  it('adds a fallback class when a media image fails to load', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/news?published=true`).flush({ news: [] });
    httpMock.expectOne(`${environment.apiUrl}/events?type=upcoming`).flush({ events: [] });

    const parent = document.createElement('div');
    const image = document.createElement('img');
    parent.appendChild(image);

    fixture.componentInstance.handleMediaImageError({ target: image } as unknown as Event);

    expect(image.classList.contains('news-img--hidden')).toBe(true);
    expect(parent.classList.contains('media-fallback')).toBe(true);
  });
});
