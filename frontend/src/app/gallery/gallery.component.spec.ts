import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { GalleryComponent } from './gallery.component';
import { AuthService } from '../core/services/auth.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';

class AuthServiceStub {
  authenticated = false;
  role: 'admin' | 'membre' | null = null;

  async ensureLoaded(): Promise<void> {}

  isAuthenticated() {
    return this.authenticated;
  }

  currentUser() {
    return null;
  }

  hasRole(roles: string[]) {
    return this.role !== null && roles.includes(this.role);
  }

  logout() {}
}

async function waitUntil(condition: () => boolean, attempts = 50): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  throw new Error('Condition not met in time');
}

async function waitForRequest(httpMock: HttpTestingController, url: string) {
  let matched: ReturnType<HttpTestingController['match']> = [];
  await waitUntil(() => {
    matched = httpMock.match(url);
    return matched.length > 0;
  });

  return matched[0];
}

function createComponent() {
  TestBed.configureTestingModule({
    imports: [GalleryComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: AuthServiceStub },
    ],
  });

  const fixture = TestBed.createComponent(GalleryComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  return { fixture, httpMock };
}

describe('GalleryComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('loads events for anonymous visitors without requesting the membership status', async () => {
    const { fixture, httpMock } = createComponent();

    const initPromise = fixture.componentInstance.ngOnInit();
    await Promise.resolve();

    httpMock
      .expectOne(`${environment.apiUrl}/gallery/events`)
      .flush({ events: [{ id: 'event-1' } as any] });
    await initPromise;

    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.hasOpenEvents).toBe(true);
    expect(fixture.componentInstance.uploadForm.value.event_id).toBe('event-1');
    httpMock.expectNone(`${environment.apiUrl}/memberships/my-status`);
  });

  it('loads the membership status for an authenticated user', async () => {
    const { fixture, httpMock } = createComponent();
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.authenticated = true;

    const initPromise = fixture.componentInstance.ngOnInit();
    await Promise.resolve();

    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });
    httpMock
      .expectOne(`${environment.apiUrl}/memberships/my-status`)
      .flush({ membership: { status: 'active' } });
    await initPromise;

    expect(fixture.componentInstance.membershipStatus).toBe('active');
    expect(fixture.componentInstance.canUpload).toBe(true);
  });

  it('allows upload for an admin regardless of membership status', () => {
    const { fixture } = createComponent();
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.role = 'admin';

    expect(fixture.componentInstance.canUpload).toBe(true);
  });

  it('does not submit a photo when the user cannot upload', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.uploadForm.setValue({ event_id: 'event-1', photo_url: '/x.png', description: '' });

    component.submitPhoto();

    httpMock.expectNone(() => true);
    expect(component.uploading).toBe(false);
  });

  it('submits a photo and resets the url/description fields on success', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.role = 'admin';
    component.uploadForm.setValue({
      event_id: 'event-1',
      photo_url: '/api/uploads/images/photo.png',
      description: 'Une belle photo',
    });

    component.submitPhoto();

    const request = httpMock.expectOne(`${environment.apiUrl}/gallery/events/event-1/photos`);
    request.flush({ message: 'Photo uploaded successfully' });

    expect(component.uploading).toBe(false);
    expect(component.uploadMessage).toBe('gallery.upload.messages.success');
    expect(component.uploadForm.value.photo_url).toBe('');
    expect(component.uploadForm.value.description).toBe('');
  });

  it('surfaces the server error when the photo upload fails', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.role = 'admin';
    component.uploadForm.setValue({
      event_id: 'event-1',
      photo_url: '/api/uploads/images/photo.png',
      description: '',
    });

    component.submitPhoto();

    httpMock
      .expectOne(`${environment.apiUrl}/gallery/events/event-1/photos`)
      .flush({ error: 'Gallery is not open for this event' }, { status: 400, statusText: 'Bad Request' });

    expect(component.uploading).toBe(false);
    expect(component.uploadError).toBe('api.errors.galleryClosed');
  });

  it('uploads the selected file and feeds its url to the form', async () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'souvenir.png', {
      type: 'image/png',
    });
    const input = { files: [file], value: 'C:\\fakepath\\souvenir.png' } as unknown as HTMLInputElement;

    component.onPhotoFileSelected({ target: input } as unknown as Event);
    expect(component.uploadingFile).toBe(true);

    // The file signature and the FileReader are read before the request goes out.
    const request = await waitForRequest(httpMock, `${environment.apiUrl}/uploads/images`);
    expect(request.request.body.file_name).toBe('souvenir.png');
    expect(request.request.body.mime_type).toBe('image/png');
    request.flush({ url: '/api/uploads/images/souvenir.png' });

    expect(component.uploadingFile).toBe(false);
    expect(component.uploadForm.value.photo_url).toBe('/api/uploads/images/souvenir.png');
    expect(component.photoFileName).toBe('souvenir.png');
    expect(input.value).toBe('');
  });

  it('reports a rejected file without touching the form', async () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    const file = new File(['not-an-image'], 'notes.txt', { type: 'text/plain' });
    const input = { files: [file], value: 'notes.txt' } as unknown as HTMLInputElement;

    component.onPhotoFileSelected({ target: input } as unknown as Event);
    await waitUntil(() => !component.uploadingFile);

    httpMock.expectNone(`${environment.apiUrl}/uploads/images`);
    expect(component.uploadError).toContain('JPG');
    expect(component.uploadForm.value.photo_url).toBe('');
  });

  it('tracks events and photos by their id', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;

    expect(component.trackEvent(0, { id: 'event-1' } as any)).toBe('event-1');
    expect(component.trackPhoto(0, { id: 'photo-1' } as any)).toBe('photo-1');
  });
});
