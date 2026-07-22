import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NewsListComponent } from './news-list.component';
import { AuthService } from '../../core/services/auth.service';
import { provideTranslocoTesting } from '../../testing/transloco-testing';
import { NoopAuthServiceStub } from '../../testing/noop-auth-service-stub';

function createComponent() {
  const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

  TestBed.configureTestingModule({
    imports: [NewsListComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: NoopAuthServiceStub },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: queryParamMap$, snapshot: { firstChild: null, data: {} } },
      },
    ],
  });

  const fixture = TestBed.createComponent(NewsListComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  spyOn(router, 'navigate').and.resolveTo(true);

  return { fixture, httpMock, router, queryParamMap$ };
}

function selectNews(queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>, id: string) {
  queryParamMap$.next(convertToParamMap({ id }));
}

const externalNews = {
  id: 'n1',
  title: 'Externe',
  content: 'Contenu externe',
  excerpt: '',
  source_url: 'https://www.lemonde.fr/article',
  source_name: null,
  published: true,
  created_at: '2026-01-01T00:00:00.000Z',
} as any;

const createdNews = {
  id: 'n2',
  title: 'Interne',
  content: 'Contenu interne',
  excerpt: '',
  source_url: null,
  source_name: null,
  published: true,
  created_at: '2026-01-02T00:00:00.000Z',
} as any;

describe('NewsListComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('requests published news with no extra params by default', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    const request = httpMock.expectOne(
      (req) => req.url === `${environment.apiUrl}/news` && req.params.get('published') === 'true'
    );
    expect(request.request.params.has('q')).toBe(false);
    request.flush({ news: [externalNews, createdNews] });

    expect(fixture.componentInstance.newsList.length).toBe(2);
  });

  it('includes keyword and date filters when they are set', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.keyword = '  harkis  ';
    component.dateFrom = '2026-01-01';
    component.dateTo = '2026-01-31';

    component.applyFilters();

    const request = httpMock.expectOne(() => true);
    expect(request.request.params.get('q')).toBe('harkis');
    expect(request.request.params.get('date_from')).toBe('2026-01-01');
    expect(request.request.params.get('date_to')).toBe('2026-01-31');
    request.flush({ news: [] });

    expect(component.hasActiveFilters()).toBe(true);
  });

  it('clears the filters and reloads the news on resetFilters', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.keyword = 'harkis';
    component.dateFrom = '2026-01-01';

    component.resetFilters();

    expect(component.keyword).toBe('');
    expect(component.dateFrom).toBe('');
    expect(component.hasActiveFilters()).toBe(false);
    httpMock.expectOne(() => true).flush({ news: [] });
  });

  it('separates retrieved (external) and created (internal) news', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush({ news: [externalNews, createdNews] });

    const component = fixture.componentInstance;
    expect(component.retrievedNews).toEqual([externalNews]);
    expect(component.createdNews).toEqual([createdNews]);
    expect(component.getTabCount('retrieved')).toBe(1);
    expect(component.getTabCount('created')).toBe(1);
  });

  it('automatically switches to the tab that has content when the active one is empty', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush({ news: [createdNews] });

    expect(fixture.componentInstance.activeTab).toBe('created');
  });

  it('does not auto-switch the tab once the user has manually selected one', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.setActiveTab('retrieved');
    fixture.detectChanges();

    httpMock.expectOne(() => true).flush({ news: [createdNews] });

    expect(component.activeTab).toBe('retrieved');
  });

  it('extracts the hostname as the source label when no source name is provided', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;

    expect(component.getNewsSourceLabel(externalNews)).toBe('lemonde.fr');
    expect(component.getNewsSourceLabel(createdNews)).toBe('');
  });

  it('falls back to the raw source URL when it cannot be parsed', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;

    expect(component.getNewsSourceLabel({ source_url: 'not-a-url' } as any)).toBe('not-a-url');
  });

  it('never shows an image for externally sourced news, even when one is set', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;

    expect(component.hasNewsImage({ ...externalNews, image_url: '/api/uploads/images/photo.png' })).toBe(
      false
    );
    expect(component.hasNewsImage({ ...createdNews, image_url: '/api/uploads/images/photo.png' })).toBe(
      true
    );
    expect(component.hasNewsImage(createdNews)).toBe(false);
  });

  it('splits the content into paragraphs and removes a trailing duplicate of the source URL', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;

    const news = {
      ...externalNews,
      content: 'Premier paragraphe.\n\nDeuxième paragraphe.\n\nhttps://www.lemonde.fr/article',
    };

    expect(component.getNewsParagraphs(news)).toEqual([
      'Premier paragraphe.',
      'Deuxième paragraphe.',
    ]);
  });

  it('requests navigation with the news id when a card is opened', () => {
    const { fixture, httpMock, router } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush({ news: [] });

    fixture.componentInstance.openNewsModal(createdNews);

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { id: 'n2' },
    }));
  });

  it('selects the news item found in the already-loaded list when the id query param is set', () => {
    const { fixture, httpMock, queryParamMap$ } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush({ news: [externalNews, createdNews] });

    selectNews(queryParamMap$, 'n2');

    expect(fixture.componentInstance.selectedNews).toEqual(createdNews);
  });

  it('fetches the news item directly when it is not already in the loaded list', () => {
    const { fixture, httpMock, queryParamMap$ } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush({ news: [] });

    selectNews(queryParamMap$, 'n99');

    httpMock
      .expectOne(`${environment.apiUrl}/news/n99`)
      .flush({ news: { id: 'n99', title: 'Article direct', content: 'Contenu', excerpt: '' } });

    expect(fixture.componentInstance.selectedNews?.title).toBe('Article direct');
  });

  it('clears the selection and navigates back to the list when the requested news cannot be found', () => {
    const { fixture, httpMock, queryParamMap$, router } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush({ news: [] });

    selectNews(queryParamMap$, 'missing-id');

    httpMock
      .expectOne(`${environment.apiUrl}/news/missing-id`)
      .flush({ error: 'News not found' }, { status: 404, statusText: 'Not Found' });

    expect(fixture.componentInstance.selectedNews).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { id: null },
    }));
  });

  it('clears the selection when the id query param is removed and requests navigation on Escape', () => {
    const { fixture, httpMock, queryParamMap$, router } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush({ news: [externalNews, createdNews] });
    selectNews(queryParamMap$, 'n2');
    expect(fixture.componentInstance.selectedNews).not.toBeNull();

    fixture.componentInstance.handleEscapeKey();

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { id: null },
    }));

    queryParamMap$.next(convertToParamMap({}));
    expect(fixture.componentInstance.selectedNews).toBeNull();
  });
});
