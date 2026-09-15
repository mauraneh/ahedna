import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminComponent } from './admin.component';
import { AuthService } from '../core/services/auth.service';
import { AddressAutocompleteService } from '../core/services/address-autocomplete.service';
import { MediaUploadService } from '../core/services/media-upload.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';

class AuthServiceStub {
  userId = 'admin-1';

  isAuthenticated() {
    return true;
  }

  currentUser() {
    return { id: this.userId, role: 'admin' } as any;
  }

  hasRole() {
    return true;
  }

  logout() {}
}

class AddressAutocompleteServiceStub {
  searchResult: any = of([]);
  searchByPostalCodeResult: any = of([]);
  citySearchResult: any = of([]);

  search() {
    return this.searchResult;
  }

  searchByPostalCode() {
    return this.searchByPostalCodeResult;
  }

  searchCities() {
    return this.citySearchResult;
  }

  formatLocation(suggestion: any) {
    return suggestion.label;
  }

  formatCity(suggestion: any) {
    return `${suggestion.city} (${suggestion.postalCode})`;
  }
}

class MediaUploadServiceStub {
  uploadResult: any = of({ url: '/api/uploads/images/photo.png' });

  resolveMediaUrl(url?: string | null) {
    return url || '';
  }

  getMediaFileName(url?: string | null) {
    return url?.split('/').pop() || '';
  }

  uploadImage() {
    return this.uploadResult;
  }

  uploadEventMedia() {
    return this.uploadResult;
  }

  isPdfMedia(url?: string | null) {
    return Boolean(url && /\.pdf(?:[?#]|$)/i.test(url));
  }
}

function createComponent() {
  TestBed.configureTestingModule({
    imports: [AdminComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: AuthServiceStub },
      { provide: AddressAutocompleteService, useClass: AddressAutocompleteServiceStub },
      { provide: MediaUploadService, useClass: MediaUploadServiceStub },
    ],
  });

  const fixture = TestBed.createComponent(AdminComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  return { fixture, httpMock };
}

function flushInitialLoad(httpMock: HttpTestingController, overrides: Record<string, unknown> = {}) {
  httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush(
    overrides['overview'] ?? {
      stats: {
        users: 1,
        active_memberships: 0,
        pending_memberships: 0,
        news: 0,
        published_news: 0,
        events: 0,
        upcoming_events: 0,
        pending_topics: 0,
        pending_photos: 0,
      },
      recentUsers: [],
      recentNews: [],
      recentEvents: [],
    }
  );
  httpMock.expectOne(`${environment.apiUrl}/users`).flush(overrides['users'] ?? { users: [] });
  httpMock.expectOne(`${environment.apiUrl}/news`).flush(overrides['news'] ?? { news: [] });
  httpMock.expectNone(`${environment.apiUrl}/forum/topics`);
  httpMock
    .expectOne(`${environment.apiUrl}/gallery/event-photos`)
    .flush(overrides['photos'] ?? { photos: [] });
  httpMock.expectOne(`${environment.apiUrl}/events`).flush(overrides['events'] ?? { events: [] });
  httpMock
    .expectOne(`${environment.apiUrl}/gallery/events`)
    .flush(overrides['galleryEvents'] ?? { events: [] });
}

describe('AdminComponent', () => {
  it('opens the overview and supports keyboard navigation through management tabs', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(fixture.componentInstance.activeTab).toBe('overview');
    expect(fixture.componentInstance.tabs.some(tab => tab.id === 'forum')).toBe(false);
    expect(fixture.componentInstance.tabs.some(tab => tab.id === 'content')).toBe(false);
    expect(buttons.length).toBe(5);
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.activeTab).toBe('events');
    expect(fixture.nativeElement.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('admin-tab-events');
    buttons[buttons.length - 1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.activeTab).toBe('overview');
  });

  it('separates event creation from the scheduled events list', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    fixture.componentInstance.activeTab = 'events';
    fixture.detectChanges();

    expect(fixture.componentInstance.activeEventView).toBe('create');
    expect(fixture.nativeElement.querySelector('#admin-event-panel-create')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#admin-event-panel-planned')).toBeNull();

    const plannedTab = fixture.nativeElement.querySelector('#admin-event-view-planned') as HTMLButtonElement;
    plannedTab.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.activeEventView).toBe('planned');
    expect(fixture.nativeElement.querySelector('#admin-event-panel-create')).toBeNull();
    expect(fixture.nativeElement.querySelector('#admin-event-panel-planned')).not.toBeNull();
  });

  it('shows the event image as a cover in the planned events view', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock, {
      events: {
        events: [{
          id: 'evt-image',
          title: 'Rencontre à Périgueux',
          description: 'Présentation de la rencontre',
          event_date: '2026-09-20T10:30:00',
          location: 'Périgueux (24000)',
          image_url: '/api/uploads/event-media/rencontre.png',
          type: 'upcoming',
          price_amount: 0,
          gallery_enabled: false,
        }],
      },
    });

    fixture.componentInstance.activeTab = 'events';
    fixture.componentInstance.activeEventView = 'planned';
    fixture.detectChanges();

    const cover = fixture.nativeElement.querySelector('.admin-event-card-cover') as HTMLImageElement;
    expect(cover).not.toBeNull();
    expect(cover.getAttribute('src')).toBe('/api/uploads/event-media/rencontre.png');
    expect(cover.getAttribute('alt')).toBe('Rencontre à Périgueux');
  });

  it('supports arrow-key navigation between the two event views', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    fixture.componentInstance.activeTab = 'events';
    fixture.detectChanges();
    const createTab = fixture.nativeElement.querySelector('#admin-event-view-create') as HTMLButtonElement;

    createTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.activeEventView).toBe('planned');
    expect(document.activeElement?.id).toBe('admin-event-view-planned');
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('loads the six active datasets without requesting the deferred forum', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    expect(component.loadingUsers).toBe(false);
    expect(component.loadingNews).toBe(false);
    expect(component.loadingPhotos).toBe(false);
    expect(component.loadingEvents).toBe(false);
    expect(component.loadingGalleryEvents).toBe(false);
  });

  it('populates the overview stats and recent lists', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    flushInitialLoad(httpMock, {
      overview: {
        stats: {
          users: 42,
          active_memberships: 10,
          pending_memberships: 2,
          news: 5,
          published_news: 4,
          events: 3,
          upcoming_events: 1,
          pending_topics: 2,
          pending_photos: 1,
        },
        recentUsers: [{ id: 'u1' }],
        recentNews: [{ id: 'n1' }],
        recentEvents: [{ id: 'e1' }],
      },
    });

    expect(fixture.componentInstance.stats.users).toBe(42);
    expect(fixture.componentInstance.recentUsers.length).toBe(1);
  });


  it('reports whether a user id matches the current admin', () => {
    const { fixture } = createComponent();
    const component = fixture.componentInstance;

    expect(component.isCurrentUser('admin-1')).toBe(true);
    expect(component.isCurrentUser('someone-else')).toBe(false);
  });

  it('updates a user role and shows a confirmation alert', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    const alertSpy = spyOn(window, 'alert');

    const select = document.createElement('select');
    const option = document.createElement('option');
    option.value = 'auteur';
    select.appendChild(option);
    select.value = 'auteur';
    fixture.componentInstance.updateUserRole('user-1', { target: select } as unknown as Event);

    const request = httpMock.expectOne(`${environment.apiUrl}/users/user-1/role`);
    expect((request.request.body as any).role).toBe('auteur');
    request.flush({ message: 'User role updated' });
    httpMock.expectOne(`${environment.apiUrl}/users`).flush({ users: [] });

    expect(alertSpy).toHaveBeenCalled();
  });

  it('does not delete a user when the confirmation dialog is dismissed', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.deleteUser({ id: 'user-1', email: 'user@example.org' } as any);

    httpMock.expectNone(`${environment.apiUrl}/users/user-1`);
    expect(fixture.componentInstance.deletingUserId).toBeNull();
  });

  it('deletes a user and reloads the users list and the overview', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.deleteUser({ id: 'user-1', email: 'user@example.org' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/users/user-1`)
      .flush({ message: 'User deleted successfully' });
    httpMock.expectOne(`${environment.apiUrl}/users`).flush({ users: [] });
    httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush({
      stats: {
        users: 0,
        active_memberships: 0,
        pending_memberships: 0,
        news: 0,
        published_news: 0,
        events: 0,
        upcoming_events: 0,
        pending_topics: 0,
        pending_photos: 0,
      },
      recentUsers: [],
      recentNews: [],
      recentEvents: [],
    });

    expect(fixture.componentInstance.deletingUserId).toBeNull();
  });

  it('creates a news item and refreshes the news list and the overview', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.newsForm.setValue({
      title: 'Titre',
      excerpt: '',
      content: 'Contenu',
      image_url: '',
      published: false,
    });

    component.saveNews();

    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ message: 'News created successfully' });
    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ news: [] });
    httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush({
      stats: {
        users: 0,
        active_memberships: 0,
        pending_memberships: 0,
        news: 0,
        published_news: 0,
        events: 0,
        upcoming_events: 0,
        pending_topics: 0,
        pending_photos: 0,
      },
      recentUsers: [],
      recentNews: [],
      recentEvents: [],
    });

    expect(component.newsFeedback).toBe('News created successfully');
    expect(component.editingNewsId).toBeNull();
  });

  it('blocks saving a gallery event when the location has not been confirmed', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.galleryEventForm.patchValue({
      title: 'Album photo',
      event_date: '2027-01-01T10:00',
      type: 'upcoming',
      location: 'Périgueux',
    });
    component.onGalleryEventLocationInput();

    component.saveGalleryEvent();

    httpMock.expectNone(`${environment.apiUrl}/events`);
    expect(component.galleryEventError).not.toBe('');
  });

  it('forces gallery_enabled to true and pre-selects the new event for photo uploads', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.galleryEventForm.setValue({
      title: 'Album photo',
      description: '',
      event_date: '2027-01-01T10:00',
      location: '',
      image_url: '',
      type: 'upcoming',
      price_amount: 0,
      payment_details: '',
    });
    component.selectGalleryEventLocation({
      label: 'Périgueux, 24000 Périgueux',
      city: 'Périgueux',
      postalCode: '24000',
      kind: 'municipality',
    } as any);

    component.saveGalleryEvent();

    const request = httpMock.expectOne(`${environment.apiUrl}/events`);
    expect((request.request.body as any).gallery_enabled).toBe(true);
    request.flush({ message: 'Event created successfully', event: { id: 'evt-42' } });
    httpMock.expectOne(`${environment.apiUrl}/events`).flush({ events: [{ id: 'evt-42' } as any] });
    httpMock
      .expectOne(`${environment.apiUrl}/gallery/events`)
      .flush({ events: [{ id: 'evt-42' } as any] });
    httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush({
      stats: {
        users: 0,
        active_memberships: 0,
        pending_memberships: 0,
        news: 0,
        published_news: 0,
        events: 0,
        upcoming_events: 0,
        pending_topics: 0,
        pending_photos: 0,
      },
      recentUsers: [],
      recentNews: [],
      recentEvents: [],
    });

    expect(component.galleryPhotoForm.value.event_id).toBe('evt-42');
  });

  it('delegates opening a gallery event to editEvent and switches to the events tab', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.openGalleryEvent({
      id: 'album-1',
      title: 'Album',
      event_date: '2027-01-01T10:00:00.000Z',
      type: 'upcoming',
      gallery_enabled: true,
      photo_count: 0,
    } as any);

    expect(component.activeTab).toBe('events');
    expect(component.activeEventView).toBe('create');
    expect(component.editingEventId).toBe('album-1');
  });




  it('validates a pending photo and reloads photos, gallery events and the overview', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    fixture.componentInstance.validatePhoto('photo-1', true);

    httpMock
      .expectOne(`${environment.apiUrl}/gallery/event-photos/photo-1/validate`)
      .flush({ message: 'Photo validation updated' });
    httpMock.expectOne(`${environment.apiUrl}/gallery/event-photos`).flush({ photos: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush({
      stats: {
        users: 0,
        active_memberships: 0,
        pending_memberships: 0,
        news: 0,
        published_news: 0,
        events: 0,
        upcoming_events: 0,
        pending_topics: 0,
        pending_photos: 0,
      },
      recentUsers: [],
      recentNews: [],
      recentEvents: [],
    });

    expect(fixture.componentInstance.pendingPhotos).toEqual([]);
  });

  it('does not upload a gallery photo when no event is available', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    fixture.componentInstance.uploadGalleryPhoto();

    httpMock.expectNone(() => true);
    expect(fixture.componentInstance.uploadingGalleryPhoto).toBe(false);
  });

  it('uploads a selected event image and patches the form with the returned URL', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    const file = new File(['fake'], 'photo.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onEventImageSelected({ target: input } as unknown as Event);

    expect(component.eventForm.value.image_url).toBe('/api/uploads/images/photo.png');
    expect(component.eventMediaFileName).toBe('photo.png');
    expect(component.uploadingEventImage).toBe(false);
  });

  it('accepts a PDF document for an event and identifies it as a document', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const mediaUpload = TestBed.inject(MediaUploadService) as unknown as MediaUploadServiceStub;
    mediaUpload.uploadResult = of({ url: '/api/uploads/event-media/programme.pdf' });
    const component = fixture.componentInstance;
    const file = new File(['%PDF-1.4'], 'programme.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    component.onEventImageSelected({ target: input } as unknown as Event);

    expect(component.eventForm.value.image_url).toBe('/api/uploads/event-media/programme.pdf');
    expect(component.eventMediaFileName).toBe('programme.pdf');
    expect(component.isPdfMedia(component.eventForm.value.image_url)).toBe(true);
    expect(component.uploadingEventImage).toBe(false);
  });

  it('removes the selected media from the event form', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.eventForm.patchValue({ image_url: '/api/uploads/event-media/programme.pdf' });
    component.eventImagePreview = '/api/uploads/event-media/programme.pdf';
    component.eventMediaFileName = 'programme.pdf';

    component.clearEventMedia();

    expect(component.eventForm.value.image_url).toBe('');
    expect(component.eventImagePreview).toBe('');
    expect(component.eventMediaFileName).toBe('');
  });

  function overviewPayload() {
    return {
      stats: {
        users: 0,
        active_memberships: 0,
        pending_memberships: 0,
        news: 0,
        published_news: 0,
        events: 0,
        upcoming_events: 0,
        pending_topics: 0,
        pending_photos: 0,
      },
      recentUsers: [],
      recentNews: [],
      recentEvents: [],
    };
  }

  it('shows an error message when deleting a user fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(true);
    const alertSpy = spyOn(window, 'alert');

    fixture.componentInstance.deleteUser({ id: 'user-1', email: 'user@example.org' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/users/user-1`)
      .flush({ error: 'Cannot delete' }, { status: 400, statusText: 'Bad Request' });

    expect(alertSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.deletingUserId).toBeNull();
  });

  it('does not submit the news form when it is invalid', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    fixture.componentInstance.saveNews();

    httpMock.expectNone(`${environment.apiUrl}/news`);
    expect(fixture.componentInstance.newsForm.touched).toBe(true);
  });

  it('shows an error message when saving news fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

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
      .flush({ error: 'Invalid' }, { status: 400, statusText: 'Bad Request' });

    expect(component.newsError).toBe('Invalid');
    expect(component.savingNews).toBe(false);
  });

  it('updates an existing news item via PUT when editingNewsId is set', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.editNews({
      id: 'news-1',
      title: 'Ancien titre',
      content: 'Ancien contenu',
      published: true,
    } as any);
    expect(component.activeTab).toBe('news');

    component.saveNews();

    const request = httpMock.expectOne(`${environment.apiUrl}/news/news-1`);
    expect(request.request.method).toBe('PUT');
    request.flush({ message: 'News updated successfully' });
    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ news: [] });
    httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush(overviewPayload());

    expect(component.editingNewsId).toBeNull();
  });

  it('shows an error message when importing public news fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    fixture.componentInstance.importPublicNews();

    httpMock
      .expectOne(`${environment.apiUrl}/news/import-public`)
      .flush({ error: 'Import failed' }, { status: 502, statusText: 'Bad Gateway' });

    expect(fixture.componentInstance.newsError).toBe('Import failed');
    expect(fixture.componentInstance.importingPublicNews).toBe(false);
  });

  it('does not delete a news item when the confirmation dialog is dismissed', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.deleteNews({ id: 'news-1' } as any);

    httpMock.expectNone(`${environment.apiUrl}/news/news-1`);
    expect(fixture.componentInstance.deletingNewsId).toBeNull();
  });

  it('deletes the news item currently being edited and resets the form', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(true);

    const component = fixture.componentInstance;
    component.editNews({ id: 'news-1', title: 'X', content: 'Y', published: false } as any);
    component.deleteNews({ id: 'news-1' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/news/news-1`)
      .flush({ message: 'News deleted successfully' });
    httpMock.expectOne(`${environment.apiUrl}/news`).flush({ news: [] });
    httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush(overviewPayload());

    expect(component.editingNewsId).toBeNull();
    expect(component.newsFeedback).toBe('News deleted successfully');
  });

  it('shows an error message when deleting a news item fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.deleteNews({ id: 'news-1' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/news/news-1`)
      .flush({ error: 'Cannot delete' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.newsError).toBe('Cannot delete');
  });

  it('does not submit the gallery event form when it is invalid', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    fixture.componentInstance.saveGalleryEvent();

    httpMock.expectNone(`${environment.apiUrl}/events`);
    expect(fixture.componentInstance.galleryEventForm.touched).toBe(true);
  });

  it('shows an error message when creating a gallery event fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.galleryEventForm.setValue({
      title: 'Album',
      description: '',
      event_date: '2027-01-01T10:00',
      location: '',
      image_url: '',
      type: 'upcoming',
      price_amount: 0,
      payment_details: '',
    });
    component.selectGalleryEventLocation({
      label: 'Périgueux, 24000 Périgueux',
      city: 'Périgueux',
      postalCode: '24000',
      kind: 'municipality',
    } as any);
    component.saveGalleryEvent();

    httpMock
      .expectOne(`${environment.apiUrl}/events`)
      .flush({ error: 'Invalid' }, { status: 400, statusText: 'Bad Request' });

    expect(component.galleryEventError).toBe('Invalid');
    expect(component.savingGalleryEvent).toBe(false);
  });

  it('shows an error message when uploading a gallery photo fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock, { galleryEvents: { events: [{ id: 'evt-1' } as any] } });

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

    expect(component.galleryPhotoError).toBe('Upload failed');
    expect(component.uploadingGalleryPhoto).toBe(false);
  });

  it('does nothing when the gallery event image input has no file', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });
    fixture.componentInstance.onGalleryEventImageSelected({ target: input } as unknown as Event);

    expect(fixture.componentInstance.uploadingGalleryEventImage).toBe(false);
  });

  it('shows an error message when the gallery event image upload fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const mediaUpload = TestBed.inject(MediaUploadService) as unknown as MediaUploadServiceStub;
    mediaUpload.uploadResult = throwError(() => new Error('Upload broke'));

    const file = new File(['fake'], 'photo.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    fixture.componentInstance.onGalleryEventImageSelected({ target: input } as unknown as Event);

    expect(fixture.componentInstance.galleryEventError).toBe('Upload broke');
    expect(fixture.componentInstance.uploadingGalleryEventImage).toBe(false);
  });

  it('does not submit the event form when it is invalid', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    fixture.componentInstance.saveEvent();

    httpMock.expectNone(`${environment.apiUrl}/events`);
    expect(fixture.componentInstance.eventForm.touched).toBe(true);
  });

  it('updates an existing event via PUT when editingEventId is set', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.editEvent({
      id: 'evt-1',
      title: 'Avant',
      event_date: '2027-01-01T10:00:00.000Z',
      location: 'Périgueux (24000)',
      type: 'upcoming',
    } as any);

    component.saveEvent();

    const request = httpMock.expectOne(`${environment.apiUrl}/events/evt-1`);
    expect(request.request.method).toBe('PUT');
    request.flush({ message: 'Event updated successfully' });
    httpMock.expectOne(`${environment.apiUrl}/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush(overviewPayload());

    expect(component.editingEventId).toBeNull();
    expect(component.activeEventView).toBe('planned');
  });

  it('shows an error message when saving an event fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

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
    component.selectEventLocation({
      label: 'Périgueux, 24000 Périgueux',
      city: 'Périgueux',
      postalCode: '24000',
      kind: 'municipality',
    } as any);
    component.saveEvent();

    httpMock
      .expectOne(`${environment.apiUrl}/events`)
      .flush({ error: 'Invalid' }, { status: 400, statusText: 'Bad Request' });

    expect(component.eventError).toBe('Invalid');
  });

  it('does not delete an event when the confirmation dialog is dismissed', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.deleteEvent({ id: 'evt-1' } as any);

    httpMock.expectNone(`${environment.apiUrl}/events/evt-1`);
    expect(fixture.componentInstance.deletingEventId).toBeNull();
  });

  it('deletes the event currently being edited and resets the form', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(true);

    const component = fixture.componentInstance;
    component.editEvent({
      id: 'evt-1',
      title: 'X',
      event_date: '2027-01-01T10:00:00.000Z',
      type: 'upcoming',
    } as any);
    component.deleteEvent({ id: 'evt-1' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/events/evt-1`)
      .flush({ message: 'Event deleted successfully' });
    httpMock.expectOne(`${environment.apiUrl}/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush(overviewPayload());

    expect(component.editingEventId).toBeNull();
  });

  it('shows an error message when deleting an event fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.deleteEvent({ id: 'evt-1' } as any);

    httpMock
      .expectOne(`${environment.apiUrl}/events/evt-1`)
      .flush({ error: 'Cannot delete' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.eventError).toBe('Cannot delete');
  });


  it('deletes a pending photo and reloads photos, gallery events and the overview', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.deletePhoto('photo-1');

    httpMock
      .expectOne(`${environment.apiUrl}/gallery/event-photos/photo-1`)
      .flush({ message: 'Photo deleted successfully' });
    httpMock.expectOne(`${environment.apiUrl}/gallery/event-photos`).flush({ photos: [] });
    httpMock.expectOne(`${environment.apiUrl}/gallery/events`).flush({ events: [] });
    httpMock.expectOne(`${environment.apiUrl}/admin/overview`).flush(overviewPayload());

    expect(fixture.componentInstance.pendingPhotos).toEqual([]);
  });

  it('does not delete a pending photo when the confirmation dialog is dismissed', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(false);

    fixture.componentInstance.deletePhoto('photo-1');

    httpMock.expectNone(`${environment.apiUrl}/gallery/event-photos/photo-1`);
    expect(fixture.componentInstance.pendingPhotos).toEqual([]);
  });

  it('shows an error alert when deleting a pending photo fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);
    spyOn(window, 'confirm').and.returnValue(true);
    const alertSpy = spyOn(window, 'alert');

    fixture.componentInstance.deletePhoto('photo-1');

    httpMock
      .expectOne(`${environment.apiUrl}/gallery/event-photos/photo-1`)
      .flush({ error: 'Cannot delete' }, { status: 400, statusText: 'Bad Request' });

    expect(alertSpy).toHaveBeenCalled();
  });

  it('does nothing when the news image input has no file', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });
    fixture.componentInstance.onNewsImageSelected({ target: input } as unknown as Event);

    expect(fixture.componentInstance.uploadingNewsImage).toBe(false);
  });

  it('shows an error message when the news image upload fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const mediaUpload = TestBed.inject(MediaUploadService) as unknown as MediaUploadServiceStub;
    mediaUpload.uploadResult = throwError(() => new Error('Upload broke'));

    const file = new File(['fake'], 'photo.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    fixture.componentInstance.onNewsImageSelected({ target: input } as unknown as Event);

    expect(fixture.componentInstance.newsError).toBe('Upload broke');
    expect(fixture.componentInstance.uploadingNewsImage).toBe(false);
  });

  it('does nothing when the event image input has no file', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });
    fixture.componentInstance.onEventImageSelected({ target: input } as unknown as Event);

    expect(fixture.componentInstance.uploadingEventImage).toBe(false);
  });

  it('shows an error message when the event image upload fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const mediaUpload = TestBed.inject(MediaUploadService) as unknown as MediaUploadServiceStub;
    mediaUpload.uploadResult = throwError(() => new Error('Upload broke'));

    const file = new File(['fake'], 'photo.png', { type: 'image/png' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    fixture.componentInstance.onEventImageSelected({ target: input } as unknown as Event);

    expect(fixture.componentInstance.eventError).toBe('Upload broke');
    expect(fixture.componentInstance.uploadingEventImage).toBe(false);
  });

  it('clears city suggestions when the required field is emptied', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.eventForm.patchValue({ location: '' });
    component.onEventLocationInput();

    expect(component.eventLocationSuggestions).toEqual([]);
  });

  it('does not search for suggestions when the location is too short', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    const searchSpy = spyOn(addressAutocomplete, 'searchCities').and.callThrough();

    const component = fixture.componentInstance;
    component.eventForm.patchValue({ location: 'Pa' });
    component.onEventLocationInput();

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('lists official cities for a postal code and requires an explicit selection', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    addressAutocomplete.citySearchResult = of([
      {
        label: 'Périgueux, 24000 Périgueux',
        city: 'Périgueux',
        postalCode: '24000',
        kind: 'municipality',
      },
    ]);

    const component = fixture.componentInstance;
    component.eventForm.patchValue({
      title: 'Titre',
      event_date: '2027-01-01T10:00',
      type: 'upcoming',
      location: '24000',
    });
    component.onEventLocationInput();

    expect(component.eventForm.value.location).toBe('24000');
    expect(component.eventLocationSuggestions.length).toBe(1);

    component.saveEvent();
    httpMock.expectNone(`${environment.apiUrl}/events`);

    component.selectEventLocation(component.eventLocationSuggestions[0]);
    expect(component.eventForm.value.location).toBe('Périgueux (24000)');

    component.saveEvent();
    httpMock.expectOne(`${environment.apiUrl}/events`);
  });

  it('searches by free text for the gallery event location and lists the suggestions', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    addressAutocomplete.citySearchResult = of([
      { label: 'Périgueux', city: 'Périgueux', postalCode: '24000', kind: 'municipality' },
      { label: 'Pérignac', city: 'Pérignac', postalCode: '17800', kind: 'municipality' },
    ]);

    const component = fixture.componentInstance;
    component.galleryEventForm.patchValue({
      title: 'Album',
      event_date: '2027-01-01T10:00',
      type: 'upcoming',
      location: 'Perigueux',
    });
    component.onGalleryEventLocationInput();

    expect(component.galleryEventLocationSuggestions.length).toBe(2);

    // Free-text search results require explicit confirmation, so saving stays blocked.
    component.saveGalleryEvent();
    httpMock.expectNone(`${environment.apiUrl}/events`);
    expect(component.galleryEventError).not.toBe('');
  });

  it('ignores a stale location lookup response that arrives after a newer request', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    const staleResults = new Subject<any[]>();
    addressAutocomplete.citySearchResult = staleResults.asObservable();

    const component = fixture.componentInstance;
    component.eventForm.patchValue({ location: 'Perigueux' });
    component.onEventLocationInput();

    // A second, newer request supersedes the first before it resolves.
    addressAutocomplete.citySearchResult = of([
      { label: 'Pérignac', city: 'Pérignac', postalCode: '17800', kind: 'municipality' },
    ]);
    component.onEventLocationInput();

    staleResults.next([{ label: 'Résultat périmé' }]);

    expect(component.eventLocationSuggestions).toEqual([
      { label: 'Pérignac', city: 'Pérignac', postalCode: '17800', kind: 'municipality' } as any,
    ]);
  });

  it('selects a suggestion for the gallery event location', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.galleryEventForm.patchValue({
      title: 'Album',
      event_date: '2027-01-01T10:00',
      type: 'upcoming',
    });
    component.selectGalleryEventLocation({
      label: 'Périgueux, 24000 Périgueux',
      city: 'Périgueux',
      postalCode: '24000',
      kind: 'municipality',
    } as any);

    expect(component.galleryEventForm.value.location).toBe('Périgueux (24000)');

    // Selecting a suggestion confirms the location, so saving should not be blocked.
    component.saveGalleryEvent();
    httpMock.expectOne(`${environment.apiUrl}/events`);
  });
});
