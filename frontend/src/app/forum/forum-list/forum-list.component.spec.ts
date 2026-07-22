import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';
import { ForumListComponent } from './forum-list.component';
import { AuthService } from '../../core/services/auth.service';
import { provideTranslocoTesting } from '../../testing/transloco-testing';

class AuthServiceStub {
  authenticated = true;

  async ensureLoaded(): Promise<void> {}

  isAuthenticated() {
    return this.authenticated;
  }

  currentUser() {
    return null;
  }

  hasRole() {
    return false;
  }

  logout() {}
}

function createComponent() {
  TestBed.configureTestingModule({
    imports: [ForumListComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: AuthServiceStub },
    ],
  });

  const fixture = TestBed.createComponent(ForumListComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  return { fixture, httpMock };
}

describe('ForumListComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('does not load topics when the user is not authenticated', async () => {
    const { fixture, httpMock } = createComponent();
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.authenticated = false;

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance.loading).toBe(false);
    httpMock.expectNone(`${environment.apiUrl}/forum/topics?validated=true`);
  });

  it('loads the validated topics once the user is authenticated', async () => {
    const { fixture, httpMock } = createComponent();

    const initPromise = fixture.componentInstance.ngOnInit();
    await Promise.resolve();

    httpMock
      .expectOne(`${environment.apiUrl}/forum/topics?validated=true`)
      .flush({ topics: [{ id: '1', message_count: 3 }, { id: '2', message_count: 2 }] });
    await initPromise;

    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.topics.length).toBe(2);
    expect(fixture.componentInstance.totalResponses).toBe(5);
  });

  it('does not submit the create form when it is invalid', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;

    component.createForm.setValue({ title: '', content: '' });
    component.onCreateTopic();

    httpMock.expectNone(`${environment.apiUrl}/forum/topics`);
    expect(component.creating).toBe(false);
  });

  it('creates a topic, reloads the list and hides the form after a delay', fakeAsync(() => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.showCreateForm = true;
    component.createForm.setValue({ title: 'Un sujet', content: 'Un message' });

    component.onCreateTopic();

    const postRequest = httpMock.expectOne(`${environment.apiUrl}/forum/topics`);
    postRequest.flush({ message: 'created' });

    httpMock.expectOne(`${environment.apiUrl}/forum/topics?validated=true`).flush({ topics: [] });

    expect(component.creating).toBe(false);
    expect(component.createSuccess).not.toBe('');
    expect(component.showCreateForm).toBe(true);

    tick(3000);

    expect(component.showCreateForm).toBe(false);
    expect(component.createSuccess).toBe('');
  }));

  it('surfaces the server error when topic creation fails', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.createForm.setValue({ title: 'Un sujet', content: 'Un message' });

    component.onCreateTopic();

    httpMock
      .expectOne(`${environment.apiUrl}/forum/topics`)
      .flush({ error: 'Content required' }, { status: 400, statusText: 'Bad Request' });

    expect(component.creating).toBe(false);
    expect(component.createError).toBe('Content required');
  });

  it('builds initials from the author name and falls back to a translated placeholder', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;
    const transloco = TestBed.inject(TranslocoService);

    expect(component.getAuthorInitials({ first_name: 'Jean', last_name: 'Dupont' } as any)).toBe(
      'JD'
    );
    expect(component.getAuthorInitials({ first_name: '', last_name: '' } as any)).toBe(
      transloco.translate('forum.list.topic.fallbackInitial')
    );
  });
});
