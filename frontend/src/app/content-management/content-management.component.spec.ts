import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ContentManagementComponent } from './content-management.component';
import { AuthService } from '../core/services/auth.service';
import { AddressAutocompleteService } from '../core/services/address-autocomplete.service';
import { MediaUploadService } from '../core/services/media-upload.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';

class AuthServiceStub {
  role: 'admin' | 'auteur' = 'admin';
  userId = 'user-1';

  async ensureLoaded(): Promise<void> {}

  isAuthenticated() {
    return true;
  }

  currentUser() {
    return { id: this.userId, role: this.role } as any;
  }

  hasRole(roles: string[]) {
    return roles.includes(this.role);
  }

  logout() {}
}

class AddressAutocompleteServiceStub {
  searchResult: any = of([]);
  searchByPostalCodeResult: any = of([]);

  search() {
    return this.searchResult;
  }

  searchByPostalCode() {
    return this.searchByPostalCodeResult;
  }

  formatLocation(suggestion: any) {
    return suggestion.label;
  }
}

class MediaUploadServiceStub {
  uploadResult: any = of({ url: '/api/uploads/images/photo.png' });

  resolveMediaUrl(url?: string | null) {
    return url || '';
  }

  uploadImage() {
    return this.uploadResult;
  }
}

function createComponent(queryParams: Record<string, string> = {}) {
  const queryParamMap$ = new BehaviorSubject(convertToParamMap(queryParams));

  TestBed.configureTestingModule({
    imports: [ContentManagementComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: AuthServiceStub },
      { provide: AddressAutocompleteService, useClass: AddressAutocompleteServiceStub },
      { provide: MediaUploadService, useClass: MediaUploadServiceStub },
      { provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap$ } },
    ],
  });

  const fixture = TestBed.createComponent(ContentManagementComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  return { fixture, httpMock };
}

describe('ContentManagementComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('loads events and gallery albums for an admin and honours the requested tab', async () => {
    const { fixture, httpMock } = createComponent({ tab: 'events' });

    const initPromise = fixture.componentInstance.ngOnInit();
    await Promise.resolve();

    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ news: [] });
    httpMock.expectOne(`${environment.apiUrl}/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });
    await initPromise;

    expect(fixture.componentInstance.activeTab).toBe('events');
  });

  it('forces a non-admin author back to the news tab and skips advanced content', async () => {
    const { fixture, httpMock } = createComponent({ tab: 'events' });
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.role = 'auteur';

    const initPromise = fixture.componentInstance.ngOnInit();
    await Promise.resolve();

    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ news: [] });
    await initPromise;

    expect(fixture.componentInstance.activeTab).toBe('news');
    httpMock.expectNone(`${environment.apiUrl}/events`);
    httpMock.expectNone(`${environment.apiUrl}/gallery/events`);
  });

  it('filters the news list to the current author when the user is not an admin', () => {
    const { fixture, httpMock } = createComponent();
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    authService.role = 'auteur';
    authService.userId = 'author-1';

    fixture.componentInstance.loadNews();

    httpMock.expectOne(`${environment.apiUrl}/news`).flush({
      news: [
        { id: 'n1', author_id: 'author-1' } as any,
        { id: 'n2', author_id: 'someone-else' } as any,
      ],
    });

    expect(fixture.componentInstance.newsItems.map((item) => item.id)).toEqual(['n1']);
  });

  it('does not submit the news form when it is invalid', () => {
    const { fixture, httpMock } = createComponent();
    fixture.componentInstance.saveNews();

    httpMock.expectNone(`${environment.apiUrl}/news`);
    expect(fixture.componentInstance.savingNews).toBe(false);
  });

  it('creates a news item with POST and resets the form on success', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.newsForm.setValue({
      title: 'Titre',
      excerpt: '',
      content: 'Contenu',
      image_url: '',
      published: false,
    });

    component.saveNews();

    const request = httpMock.expectOne(`${environment.apiUrl}/news`);
    expect(request.request.method).toBe('POST');
    request.flush({ message: 'News created successfully' });
    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ news: [] });

    expect(component.newsFeedbackMessage).toBe('News created successfully');
    expect(component.savingNews).toBe(false);
    expect(component.editingNewsId).toBeNull();
  });

  it('updates a news item with PUT when editingNewsId is set', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.editNews({
      id: 'n1',
      title: 'Ancien titre',
      excerpt: '',
      content: 'Ancien contenu',
      image_url: '',
      published: true,
    } as any);

    component.saveNews();

    const request = httpMock.expectOne(`${environment.apiUrl}/news/n1`);
    expect(request.request.method).toBe('PUT');
    request.flush({ message: 'News updated successfully' });
    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ news: [] });

    expect(component.newsFeedbackMessage).toBe('News updated successfully');
  });

  it('surfaces the server error when saving a news item fails', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.newsForm.setValue({
      title: 'Titre',
      excerpt: '',
      content: 'Contenu',
      image_url: '',
      published: false,
    });

    component.saveNews();

    httpMock
      .expectOne(`${environment.apiUrl}/news`)
      .flush({ error: 'Title and content required' }, { status: 400, statusText: 'Bad Request' });

    expect(component.savingNews).toBe(false);
    expect(component.newsFeedbackError).toBe('Title and content required');
  });

  it('imports public news and refreshes the list', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;

    component.importPublicNews();

    httpMock
      .expectOne(`${environment.apiUrl}/news/import-public`)
      .flush({ message: '3 article(s) importe(s), 0 doublon(s) ignore(s).' });
    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ news: [] });

    expect(component.importingPublicNews).toBe(false);
    expect(component.newsFeedbackMessage).toContain('importe');
  });

  it('does not delete a news item when the confirmation dialog is dismissed', () => {
    const { fixture, httpMock } = createComponent();
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.deleteNews({ id: 'n1' } as any);

    httpMock.expectNone(`${environment.apiUrl}/news/n1`);
    expect(fixture.componentInstance.deletingNewsId).toBeNull();
  });

  it('deletes a news item and resets the form if it was being edited', () => {
    const { fixture, httpMock } = createComponent();
    spyOn(window, 'confirm').and.returnValue(true);
    const component = fixture.componentInstance;
    component.editNews({ id: 'n1', title: '', excerpt: '', content: '', image_url: '', published: false } as any);

    component.deleteNews({ id: 'n1' } as any);

    httpMock.expectOne(`${environment.apiUrl}/news/n1`).flush({ message: 'News deleted successfully' });
    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ news: [] });

    expect(component.editingNewsId).toBeNull();
    expect(component.deletingNewsId).toBeNull();
  });

  it('blocks saving an event when the location was typed but never confirmed via a suggestion', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.eventForm.patchValue({
      title: 'Un évènement',
      event_date: '2027-01-01T10:00',
      type: 'upcoming',
      location: 'Périgueux',
    });
    component.onEventLocationInput();

    component.saveEvent();

    httpMock.expectNone(`${environment.apiUrl}/events`);
    expect(component.eventFeedbackError).not.toBe('');
  });

  it('saves an event once the location has been confirmed through a suggestion', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    addressAutocomplete.searchResult = of([
      { label: 'Périgueux, France', city: 'Périgueux', postalCode: '24000', kind: 'municipality' },
    ]);

    component.eventForm.patchValue({
      title: 'Un évènement',
      event_date: '2027-01-01T10:00',
      type: 'upcoming',
      location: 'Périgueux',
    });
    component.onEventLocationInput();
    component.selectEventLocation({
      label: 'Périgueux, France',
      city: 'Périgueux',
      postalCode: '24000',
      kind: 'municipality',
    });

    component.saveEvent();

    const request = httpMock.expectOne(`${environment.apiUrl}/events`);
    request.flush({ message: 'Event created successfully' });
    httpMock.expectOne(`${environment.apiUrl}/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });

    expect(component.eventFeedbackMessage).toBe('Event created successfully');
  });

  it('always forces gallery_enabled to true when saving a gallery album', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.galleryAlbumForm.setValue({
      title: 'Album',
      description: '',
      event_date: '2027-01-01T10:00',
      location: '',
      image_url: '',
      type: 'upcoming',
      price_amount: 0,
      payment_details: '',
    });

    component.saveGalleryAlbum();

    const request = httpMock.expectOne(`${environment.apiUrl}/events`);
    expect((request.request.body as any).gallery_enabled).toBe(true);
    request.flush({ message: 'ok', event: {} });
    httpMock.expectOne(`${environment.apiUrl}/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });
  });

  it('does not upload a gallery photo when the form is invalid', () => {
    const { fixture, httpMock } = createComponent();
    fixture.componentInstance.uploadGalleryPhoto();

    httpMock.expectNone(() => true);
    expect(fixture.componentInstance.savingGalleryPhoto).toBe(false);
  });

  it('uploads a gallery photo and clears the url/description fields on success', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.galleryPhotoForm.setValue({
      event_id: 'evt-1',
      photo_url: '/api/uploads/images/photo.png',
      description: 'Une photo',
    });

    component.uploadGalleryPhoto();

    httpMock
      .expectOne(`${environment.apiUrl}/gallery/events/evt-1/photos`)
      .flush({ message: 'Photo uploaded successfully' });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });

    expect(component.galleryPhotoForm.value.photo_url).toBe('');
    expect(component.savingGalleryPhoto).toBe(false);
  });

  it('uploads a selected news image and patches the form with the returned URL', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;
    const file = new File(['fake'], 'photo.png', { type: 'image/png' });
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });

    component.onNewsImageSelected({ target: input } as unknown as Event);

    expect(component.newsForm.value.image_url).toBe('/api/uploads/images/photo.png');
    expect(component.uploadingNewsImage).toBe(false);
  });

  it('surfaces an upload error when the news image cannot be uploaded', () => {
    const { fixture } = createComponent();
    const mediaUpload = TestBed.inject(MediaUploadService) as unknown as MediaUploadServiceStub;
    mediaUpload.uploadResult = throwError(() => new Error('Formats acceptés : JPG, PNG, WebP ou GIF.'));

    const component = fixture.componentInstance;
    const file = new File(['fake'], 'doc.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onNewsImageSelected({ target: input } as unknown as Event);

    expect(component.newsFeedbackError).toBe('Formats acceptés : JPG, PNG, WebP ou GIF.');
    expect(component.uploadingNewsImage).toBe(false);
  });

  it('does nothing when no file was selected for the news image input', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });

    component.onNewsImageSelected({ target: input } as unknown as Event);

    expect(component.uploadingNewsImage).toBe(false);
  });

  it('clears the news image preview and form value', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;
    component.newsForm.patchValue({ image_url: '/api/uploads/images/photo.png' });
    component.newsImagePreview = '/api/uploads/images/photo.png';

    component.clearNewsImage();

    expect(component.newsForm.value.image_url).toBe('');
    expect(component.newsImagePreview).toBe('');
  });

  it('surfaces the server error when deleting a news item fails', () => {
    const { fixture, httpMock } = createComponent();
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.deleteNews({ id: 'n1' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/news/n1`)
      .flush({ error: 'Cannot delete' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.newsFeedbackError).toBe('Cannot delete');
    expect(fixture.componentInstance.deletingNewsId).toBeNull();
  });

  it('surfaces the server error when importing public news fails', () => {
    const { fixture, httpMock } = createComponent();

    fixture.componentInstance.importPublicNews();

    httpMock
      .expectOne(`${environment.apiUrl}/news/import-public`)
      .flush({ error: 'Import failed' }, { status: 502, statusText: 'Bad Gateway' });

    expect(fixture.componentInstance.newsFeedbackError).toBe('Import failed');
    expect(fixture.componentInstance.importingPublicNews).toBe(false);
  });

  it('updates an event with PUT when editingEventId is set', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.editEvent({
      id: 'evt-1',
      title: 'Avant',
      event_date: '2027-01-01T10:00:00.000Z',
      type: 'upcoming',
    } as any);

    component.saveEvent();

    const request = httpMock.expectOne(`${environment.apiUrl}/events/evt-1`);
    expect(request.request.method).toBe('PUT');
    request.flush({ message: 'Event updated successfully' });
    httpMock.expectOne(`${environment.apiUrl}/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });

    expect(component.editingEventId).toBeNull();
  });

  it('surfaces the server error when saving an event fails', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.eventForm.setValue({
      title: 'Titre',
      description: '',
      event_date: '2027-01-01T10:00',
      location: '',
      image_url: '',
      type: 'upcoming',
      gallery_enabled: false,
      price_amount: 0,
      payment_details: '',
    });

    component.saveEvent();

    httpMock
      .expectOne(`${environment.apiUrl}/events`)
      .flush({ error: 'Invalid' }, { status: 400, statusText: 'Bad Request' });

    expect(component.eventFeedbackError).toBe('Invalid');
  });

  it('does not delete an event when the confirmation dialog is dismissed', () => {
    const { fixture, httpMock } = createComponent();
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.deleteEvent({ id: 'evt-1' } as any);

    httpMock.expectNone(`${environment.apiUrl}/events/evt-1`);
    expect(fixture.componentInstance.deletingEventId).toBeNull();
  });

  it('deletes the event currently being edited and resets the form', () => {
    const { fixture, httpMock } = createComponent();
    spyOn(window, 'confirm').and.returnValue(true);
    const component = fixture.componentInstance;
    component.editEvent({
      id: 'evt-1',
      title: 'X',
      event_date: '2027-01-01T10:00:00.000Z',
      type: 'upcoming',
    } as any);

    component.deleteEvent({ id: 'evt-1' } as any);

    httpMock.expectOne(`${environment.apiUrl}/events/evt-1`).flush({ message: 'Event deleted successfully' });
    httpMock.expectOne(`${environment.apiUrl}/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });

    expect(component.editingEventId).toBeNull();
  });

  it('surfaces the server error when deleting an event fails', () => {
    const { fixture, httpMock } = createComponent();
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.deleteEvent({ id: 'evt-1' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/events/evt-1`)
      .flush({ error: 'Cannot delete' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.eventFeedbackError).toBe('Cannot delete');
  });

  it('updates a gallery album with PUT when editingGalleryAlbumId is set', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.editGalleryAlbum({
      id: 'album-1',
      title: 'Avant',
      event_date: '2027-01-01T10:00:00.000Z',
      type: 'upcoming',
      gallery_enabled: true,
      photo_count: 0,
      photos: [],
    } as any);

    component.saveGalleryAlbum();

    const request = httpMock.expectOne(`${environment.apiUrl}/events/album-1`);
    expect(request.request.method).toBe('PUT');
    expect((request.request.body as any).gallery_enabled).toBe(true);
    request.flush({ message: 'Album updated' });
    httpMock.expectOne(`${environment.apiUrl}/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });

    expect(component.editingGalleryAlbumId).toBeNull();
  });

  it('blocks saving a gallery album when its location was never confirmed', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.galleryAlbumForm.patchValue({
      title: 'Album',
      event_date: '2027-01-01T10:00',
      type: 'upcoming',
      location: 'Périgueux',
    });
    component.onGalleryAlbumLocationInput();

    component.saveGalleryAlbum();

    httpMock.expectNone(`${environment.apiUrl}/events`);
    expect(component.galleryFeedbackError).not.toBe('');
  });

  it('surfaces the server error when saving a gallery album fails', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.galleryAlbumForm.setValue({
      title: 'Album',
      description: '',
      event_date: '2027-01-01T10:00',
      location: '',
      image_url: '',
      type: 'upcoming',
      price_amount: 0,
      payment_details: '',
    });

    component.saveGalleryAlbum();

    httpMock
      .expectOne(`${environment.apiUrl}/events`)
      .flush({ error: 'Invalid' }, { status: 400, statusText: 'Bad Request' });

    expect(component.galleryFeedbackError).toBe('Invalid');
  });

  it('surfaces the server error when uploading a gallery photo fails', () => {
    const { fixture, httpMock } = createComponent();
    const component = fixture.componentInstance;
    component.galleryPhotoForm.setValue({
      event_id: 'evt-1',
      photo_url: '/api/uploads/images/photo.png',
      description: '',
    });

    component.uploadGalleryPhoto();

    httpMock
      .expectOne(`${environment.apiUrl}/gallery/events/evt-1/photos`)
      .flush({ error: 'Upload failed' }, { status: 400, statusText: 'Bad Request' });

    expect(component.galleryFeedbackError).toBe('Upload failed');
    expect(component.savingGalleryPhoto).toBe(false);
  });

  it('does not delete a gallery photo when the confirmation dialog is dismissed', () => {
    const { fixture, httpMock } = createComponent();
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.deleteGalleryPhoto({ id: 'photo-1' } as any);

    httpMock.expectNone(`${environment.apiUrl}/gallery/event-photos/photo-1`);
    expect(fixture.componentInstance.deletingPhotoId).toBeNull();
  });

  it('deletes a gallery photo and refreshes the albums', () => {
    const { fixture, httpMock } = createComponent();
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.deleteGalleryPhoto({ id: 'photo-1' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/gallery/event-photos/photo-1`)
      .flush({ message: 'Photo deleted successfully' });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });

    expect(fixture.componentInstance.deletingPhotoId).toBeNull();
  });

  it('surfaces the server error when deleting a gallery photo fails', () => {
    const { fixture, httpMock } = createComponent();
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.deleteGalleryPhoto({ id: 'photo-1' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/gallery/event-photos/photo-1`)
      .flush({ error: 'Cannot delete' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.galleryFeedbackError).toBe('Cannot delete');
  });

  it('does nothing when no file was selected for the event or gallery album image inputs', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });

    component.onEventImageSelected({ target: input } as unknown as Event);
    component.onGalleryAlbumImageSelected({ target: input } as unknown as Event);

    expect(component.uploadingEventImage).toBe(false);
    expect(component.uploadingGalleryAlbumImage).toBe(false);
  });

  it('uploads a selected event image and a gallery album image', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;
    const file = new File(['fake'], 'photo.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onEventImageSelected({ target: input } as unknown as Event);
    expect(component.eventForm.value.image_url).toBe('/api/uploads/images/photo.png');

    component.onGalleryAlbumImageSelected({ target: input } as unknown as Event);
    expect(component.galleryAlbumForm.value.image_url).toBe('/api/uploads/images/photo.png');
  });

  it('surfaces an upload error for the event and gallery album image inputs', () => {
    const { fixture } = createComponent();
    const mediaUpload = TestBed.inject(MediaUploadService) as unknown as MediaUploadServiceStub;
    mediaUpload.uploadResult = throwError(() => new Error('Upload broke'));

    const component = fixture.componentInstance;
    const file = new File(['fake'], 'photo.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onEventImageSelected({ target: input } as unknown as Event);
    expect(component.eventFeedbackError).toBe('Upload broke');

    component.onGalleryAlbumImageSelected({ target: input } as unknown as Event);
    expect(component.galleryFeedbackError).toBe('Upload broke');
  });

  it('auto-selects the gallery album location when searching by a full postal code', () => {
    const { fixture } = createComponent();
    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    addressAutocomplete.searchByPostalCodeResult = of([{ label: 'Périgueux (24000)' }]);

    const component = fixture.componentInstance;
    component.galleryAlbumForm.patchValue({ location: '24000' });
    component.onGalleryAlbumLocationInput();

    expect(component.galleryAlbumForm.value.location).toBe('Périgueux (24000)');
  });

  it('does not search for location suggestions when the query is too short or empty', () => {
    const { fixture } = createComponent();
    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    const searchSpy = spyOn(addressAutocomplete, 'search').and.callThrough();

    const component = fixture.componentInstance;
    component.eventForm.patchValue({ location: 'Pa' });
    component.onEventLocationInput();
    expect(searchSpy).not.toHaveBeenCalled();
    expect(component.eventLocationSuggestions).toEqual([]);

    component.eventForm.patchValue({ location: '' });
    component.onEventLocationInput();
    expect(component.eventLocationSuggestions).toEqual([]);
  });

  it('ignores a stale event location lookup response that arrives after a newer request', () => {
    const { fixture } = createComponent();
    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    const staleResults = new Subject<any[]>();
    addressAutocomplete.searchResult = staleResults.asObservable();

    const component = fixture.componentInstance;
    component.eventForm.patchValue({ location: 'Perigueux' });
    component.onEventLocationInput();

    addressAutocomplete.searchResult = of([{ label: 'Nouvelle-Aquitaine' }]);
    component.onEventLocationInput();

    staleResults.next([{ label: 'Résultat périmé' }]);

    expect(component.eventLocationSuggestions).toEqual([{ label: 'Nouvelle-Aquitaine' } as any]);
  });
});
