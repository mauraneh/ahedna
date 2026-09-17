import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { environment } from '../../environments/environment';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';
import { AuthService } from '../core/services/auth.service';
import { ApiMessageService } from '../core/services/api-message.service';
import { AddressAutocompleteService, AddressSuggestion } from '../core/services/address-autocomplete.service';
import { I18nService } from '../core/services/i18n.service';
import { MediaUploadService } from '../core/services/media-upload.service';
import { PdfThumbnailComponent } from '../core/components/pdf-thumbnail/pdf-thumbnail.component';
import { formatEuroPrice, toDateTimeInputValue } from '../core/utils/date-time';

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  published: boolean;
  image_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  author_id?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  location?: string | null;
  image_url?: string | null;
  type: 'upcoming' | 'past';
  gallery_enabled?: boolean;
  price_amount?: number | string | null;
  payment_details?: string | null;
}

interface GalleryPhoto {
  id: string;
  event_id: string;
  photo_url: string;
  description?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  created_at: string;
}

interface GalleryAlbum extends EventItem {
  gallery_enabled: boolean;
  photo_count: number;
  photos: GalleryPhoto[];
}

type ContentTab = 'news' | 'events' | 'gallery';

@Component({
  selector: 'app-content-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslocoDirective, NavbarComponent, ScrollToTopComponent, PdfThumbnailComponent],
  templateUrl: './content-management.component.html',
  styleUrl: './content-management.component.scss'
})
export class ContentManagementComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);
  private apiMessages = inject(ApiMessageService);
  private addressAutocomplete = inject(AddressAutocompleteService);
  private mediaUpload = inject(MediaUploadService);
  authService = inject(AuthService);
  i18nService = inject(I18nService);

  activeTab: ContentTab = 'news';
  activeNewsView: 'create' | 'list' = 'create';
  activeGalleryView: 'create' | 'albums' = 'create';
  readonly newsViews = ['create', 'list'] as const;
  readonly galleryViews = ['create', 'albums'] as const;

  loadingNews = true;
  loadingEvents = true;
  loadingGallery = true;

  savingNews = false;
  savingEvent = false;
  savingGalleryAlbum = false;
  savingGalleryPhoto = false;
  importingPublicNews = false;
  uploadingNewsImage = false;
  uploadingEventImage = false;
  uploadingGalleryAlbumImage = false;
  uploadingGalleryPhotoImage = false;

  deletingNewsId: string | null = null;
  deletingEventId: string | null = null;
  deletingPhotoId: string | null = null;

  editingNewsId: string | null = null;
  editingEventId: string | null = null;
  editingGalleryAlbumId: string | null = null;

  newsFeedbackMessage = '';
  newsFeedbackError = '';
  eventFeedbackMessage = '';
  eventFeedbackError = '';
  galleryFeedbackMessage = '';
  galleryFeedbackError = '';
  newsImagePreview = '';
  newsImageFileName = '';
  eventImagePreview = '';
  eventMediaFileName = '';
  galleryAlbumImagePreview = '';
  galleryAlbumImageFileName = '';
  galleryPhotoFileName = '';
  galleryPhotoPreview = '';
  eventLocationSuggestions: AddressSuggestion[] = [];
  galleryAlbumLocationSuggestions: AddressSuggestion[] = [];
  private eventLocationConfirmed = false;
  private galleryAlbumLocationConfirmed = false;
  private eventLocationRequestId = 0;
  private galleryAlbumLocationRequestId = 0;

  newsItems: NewsItem[] = [];
  events: EventItem[] = [];
  galleryAlbums: GalleryAlbum[] = [];

  newsForm = this.fb.group({
    title: ['', [Validators.required]],
    excerpt: [''],
    content: ['', [Validators.required]],
    image_url: [''],
    published: [false],
  });

  eventForm = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    event_date: ['', [Validators.required]],
    location: ['', [Validators.required]],
    image_url: [''],
    type: ['upcoming', [Validators.required]],
    gallery_enabled: [false],
    price_amount: [0],
    payment_details: [''],
  });

  galleryAlbumForm = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    event_date: ['', [Validators.required]],
    location: ['', [Validators.required]],
    image_url: [''],
    type: ['upcoming', [Validators.required]],
    price_amount: [0],
    payment_details: [''],
  });

  galleryPhotoForm = this.fb.group({
    event_id: ['', [Validators.required]],
    photo_url: ['', [Validators.required]],
    description: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.authService.ensureLoaded();
    this.route.queryParamMap.subscribe((params) => {
      this.applyTab(params.get('tab'));
    });

    this.loadNews();

    if (this.canManageAdvancedContent) {
      this.loadEvents();
      this.loadGalleryAlbums();
    }
  }

  get canManageAdvancedContent(): boolean {
    return this.authService.hasRole(['admin']);
  }

  selectTab(tab: ContentTab): void {
    this.applyTab(tab);
  }

  loadNews(): void {
    this.loadingNews = true;
    this.http.get<{ news: NewsItem[] }>(`${environment.apiUrl}/news`).subscribe({
      next: (response) => {
        const currentUserId = this.authService.currentUser()?.id;
        this.newsItems = this.authService.hasRole(['admin'])
          ? response.news
          : response.news.filter((item) => item.author_id === currentUserId);
        this.loadingNews = false;
      },
      error: () => {
        this.newsFeedbackError = this.transloco.translate('content.messages.loadError');
        this.loadingNews = false;
      }
    });
  }

  loadEvents(): void {
    this.loadingEvents = true;
    this.http.get<{ events: EventItem[] }>(`${environment.apiUrl}/events`).subscribe({
      next: (response) => {
        this.events = response.events;
        this.loadingEvents = false;
      },
      error: () => {
        this.eventFeedbackError = this.transloco.translate('content.messages.loadEventsError');
        this.loadingEvents = false;
      }
    });
  }

  loadGalleryAlbums(): void {
    this.loadingGallery = true;
    this.http.get<{ events: GalleryAlbum[] }>(`${environment.apiUrl}/gallery/events`).subscribe({
      next: (response) => {
        this.galleryAlbums = response.events;
        const currentEventId = this.galleryPhotoForm.value.event_id;
        const selectedStillExists = this.galleryAlbums.some((album) => album.id === currentEventId);

        if (!selectedStillExists) {
          this.galleryPhotoForm.patchValue({ event_id: this.galleryAlbums[0]?.id ?? '' });
        }

        this.loadingGallery = false;
      },
      error: () => {
        this.galleryFeedbackError = this.transloco.translate('content.messages.loadGalleryError');
        this.loadingGallery = false;
      }
    });
  }

  saveNews(): void {
    if (this.uploadingNewsImage) {
      return;
    }

    if (this.newsForm.invalid) {
      this.newsForm.markAllAsTouched();
      return;
    }

    this.savingNews = true;
    this.newsFeedbackMessage = '';
    this.newsFeedbackError = '';

    const request = this.editingNewsId
      ? this.http.put<{ message: string }>(`${environment.apiUrl}/news/${this.editingNewsId}`, this.newsForm.getRawValue())
      : this.http.post<{ message: string }>(`${environment.apiUrl}/news`, this.newsForm.getRawValue());

    request.subscribe({
      next: (response) => {
        this.newsFeedbackMessage = response.message;
        this.resetNewsForm();
        this.activeNewsView = 'list';
        this.loadNews();
        this.savingNews = false;
      },
      error: (error) => {
        this.newsFeedbackError = this.apiMessages.translateError(error, 'content.messages.saveError');
        this.savingNews = false;
      }
    });
  }

  importPublicNews(): void {
    this.importingPublicNews = true;
    this.newsFeedbackMessage = '';
    this.newsFeedbackError = '';

    this.http.post<{ message: string }>(`${environment.apiUrl}/news/import-public`, {
      max_records: 12,
      published: true,
    }).subscribe({
      next: (response) => {
        this.newsFeedbackMessage = response.message;
        this.loadNews();
        this.importingPublicNews = false;
      },
      error: (error) => {
        this.newsFeedbackError = this.apiMessages.translateError(error, 'content.messages.importNewsError');
        this.importingPublicNews = false;
      }
    });
  }

  editNews(item: NewsItem): void {
    this.activeTab = 'news';
    this.activeNewsView = 'create';
    this.editingNewsId = item.id;
    this.newsFeedbackMessage = '';
    this.newsFeedbackError = '';
    this.newsForm.patchValue({
      title: item.title,
      excerpt: item.excerpt || '',
      content: item.content,
      image_url: item.image_url || '',
      published: item.published,
    });
    this.newsImagePreview = this.mediaUpload.resolveMediaUrl(item.image_url);
    this.newsImageFileName = this.mediaUpload.getMediaFileName(item.image_url);
  }

  startNewsCreation(): void {
    this.resetNewsForm();
    this.activeNewsView = 'create';
  }

  cancelNewsForm(): void {
    this.resetNewsForm();
    this.activeNewsView = 'list';
  }

  setNewsView(view: 'create' | 'list'): void {
    this.activeNewsView = view;
  }

  onNewsViewKeydown(event: KeyboardEvent, view: 'create' | 'list'): void {
    this.selectWorkspaceView(event, view, this.newsViews, (next) => this.activeNewsView = next);
  }

  deleteNews(item: NewsItem): void {
    if (!confirm(this.transloco.translate('content.actions.confirmDelete'))) {
      return;
    }

    this.deletingNewsId = item.id;
    this.http.delete<{ message: string }>(`${environment.apiUrl}/news/${item.id}`).subscribe({
      next: (response) => {
        this.newsFeedbackMessage = response.message;
        if (this.editingNewsId === item.id) {
          this.resetNewsForm();
        }
        this.loadNews();
        this.deletingNewsId = null;
      },
      error: (error) => {
        this.newsFeedbackError = this.apiMessages.translateError(error, 'content.messages.deleteError');
        this.deletingNewsId = null;
      }
    });
  }

  resetNewsForm(): void {
    this.editingNewsId = null;
    this.newsForm.reset({
      title: '',
      excerpt: '',
      content: '',
      image_url: '',
      published: false,
    });
    this.newsImagePreview = '';
    this.newsImageFileName = '';
  }

  saveEvent(): void {
    if (this.uploadingEventImage) {
      return;
    }

    if (!this.ensureEventLocationIsConfirmed()) {
      return;
    }

    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    this.savingEvent = true;
    this.eventFeedbackMessage = '';
    this.eventFeedbackError = '';

    const request = this.editingEventId
      ? this.http.put<{ message: string }>(`${environment.apiUrl}/events/${this.editingEventId}`, this.eventForm.getRawValue())
      : this.http.post<{ message: string }>(`${environment.apiUrl}/events`, this.eventForm.getRawValue());

    request.subscribe({
      next: (response) => {
        this.eventFeedbackMessage = response.message;
        this.resetEventForm();
        this.loadEvents();
        this.loadGalleryAlbums();
        this.savingEvent = false;
      },
      error: (error) => {
        this.eventFeedbackError = this.apiMessages.translateError(error, 'content.messages.saveEventError');
        this.savingEvent = false;
      }
    });
  }

  editEvent(item: EventItem): void {
    this.activeTab = 'events';
    this.editingEventId = item.id;
    this.eventFeedbackMessage = '';
    this.eventFeedbackError = '';
    this.eventForm.patchValue({
      title: item.title,
      description: item.description || '',
      event_date: this.formatDateTimeInput(item.event_date),
      location: item.location || '',
      image_url: item.image_url || '',
      type: item.type,
      gallery_enabled: !!item.gallery_enabled,
      price_amount: Number(item.price_amount || 0),
      payment_details: item.payment_details || '',
    });
    this.eventImagePreview = this.mediaUpload.resolveMediaUrl(item.image_url);
    this.eventMediaFileName = this.mediaUpload.getMediaFileName(item.image_url);
    this.eventLocationConfirmed = true;
    this.eventLocationSuggestions = [];
  }

  deleteEvent(item: EventItem): void {
    if (!confirm(this.transloco.translate('content.actions.confirmDeleteEvent'))) {
      return;
    }

    this.deletingEventId = item.id;
    this.http.delete<{ message: string }>(`${environment.apiUrl}/events/${item.id}`).subscribe({
      next: (response) => {
        this.eventFeedbackMessage = response.message;
        if (this.editingEventId === item.id) {
          this.resetEventForm();
        }
        this.loadEvents();
        this.loadGalleryAlbums();
        this.deletingEventId = null;
      },
      error: (error) => {
        this.eventFeedbackError = this.apiMessages.translateError(error, 'content.messages.deleteEventError');
        this.deletingEventId = null;
      }
    });
  }

  resetEventForm(): void {
    this.editingEventId = null;
    this.eventForm.reset({
      title: '',
      description: '',
      event_date: '',
      location: '',
      image_url: '',
      type: 'upcoming',
      gallery_enabled: false,
      price_amount: 0,
      payment_details: '',
    });
    this.eventImagePreview = '';
    this.eventMediaFileName = '';
    this.eventLocationConfirmed = false;
    this.eventLocationSuggestions = [];
  }

  saveGalleryAlbum(): void {
    if (this.uploadingGalleryAlbumImage) {
      return;
    }

    if (!this.ensureGalleryAlbumLocationIsConfirmed()) {
      return;
    }

    if (this.galleryAlbumForm.invalid) {
      this.galleryAlbumForm.markAllAsTouched();
      return;
    }

    this.savingGalleryAlbum = true;
    this.galleryFeedbackMessage = '';
    this.galleryFeedbackError = '';

    const request = this.editingGalleryAlbumId
      ? this.http.put<{ message: string }>(`${environment.apiUrl}/events/${this.editingGalleryAlbumId}`, {
          ...this.galleryAlbumForm.getRawValue(),
          gallery_enabled: true,
        })
      : this.http.post<{ message: string; event: GalleryAlbum }>(`${environment.apiUrl}/events`, {
          ...this.galleryAlbumForm.getRawValue(),
          gallery_enabled: true,
        });

    request.subscribe({
      next: (response) => {
        this.galleryFeedbackMessage = response.message;
        this.resetGalleryAlbumForm();
        this.activeGalleryView = 'albums';
        this.loadEvents();
        this.loadGalleryAlbums();
        this.savingGalleryAlbum = false;
      },
      error: (error) => {
        this.galleryFeedbackError = this.apiMessages.translateError(error, 'content.messages.saveGalleryError');
        this.savingGalleryAlbum = false;
      }
    });
  }

  editGalleryAlbum(item: GalleryAlbum): void {
    this.activeTab = 'gallery';
    this.activeGalleryView = 'create';
    this.editingGalleryAlbumId = item.id;
    this.galleryFeedbackMessage = '';
    this.galleryFeedbackError = '';
    this.galleryAlbumForm.patchValue({
      title: item.title,
      description: item.description || '',
      event_date: this.formatDateTimeInput(item.event_date),
      location: item.location || '',
      image_url: item.image_url || '',
      type: item.type,
      price_amount: Number(item.price_amount || 0),
      payment_details: item.payment_details || '',
    });
    this.galleryAlbumImagePreview = this.mediaUpload.resolveMediaUrl(item.image_url);
    this.galleryAlbumImageFileName = this.mediaUpload.getMediaFileName(item.image_url);
    this.galleryAlbumLocationConfirmed = true;
    this.galleryAlbumLocationSuggestions = [];
  }

  startGalleryAlbumCreation(): void {
    this.resetGalleryAlbumForm();
    this.activeGalleryView = 'create';
  }

  cancelGalleryAlbumForm(): void {
    this.resetGalleryAlbumForm();
    this.activeGalleryView = 'albums';
  }

  setGalleryView(view: 'create' | 'albums'): void {
    this.activeGalleryView = view;
  }

  onGalleryViewKeydown(event: KeyboardEvent, view: 'create' | 'albums'): void {
    this.selectWorkspaceView(event, view, this.galleryViews, (next) => this.activeGalleryView = next);
  }

  resetGalleryAlbumForm(): void {
    this.editingGalleryAlbumId = null;
    this.galleryAlbumForm.reset({
      title: '',
      description: '',
      event_date: '',
      location: '',
      image_url: '',
      type: 'upcoming',
      price_amount: 0,
      payment_details: '',
    });
    this.galleryAlbumImagePreview = '';
    this.galleryAlbumImageFileName = '';
    this.galleryAlbumLocationConfirmed = false;
    this.galleryAlbumLocationSuggestions = [];
  }

  uploadGalleryPhoto(): void {
    if (this.uploadingGalleryPhotoImage) {
      return;
    }

    if (this.galleryPhotoForm.invalid) {
      this.galleryPhotoForm.markAllAsTouched();
      return;
    }

    const eventId = this.galleryPhotoForm.value.event_id;
    if (!eventId) {
      return;
    }

    this.savingGalleryPhoto = true;
    this.galleryFeedbackMessage = '';
    this.galleryFeedbackError = '';

    this.http.post<{ message: string }>(
      `${environment.apiUrl}/gallery/events/${eventId}/photos`,
      this.galleryPhotoForm.getRawValue()
    ).subscribe({
      next: (response) => {
        this.galleryFeedbackMessage = response.message;
        this.galleryPhotoForm.patchValue({
          photo_url: '',
          description: '',
        });
        this.galleryPhotoFileName = '';
        this.galleryPhotoPreview = '';
        this.loadGalleryAlbums();
        this.savingGalleryPhoto = false;
      },
      error: (error) => {
        this.galleryFeedbackError = this.apiMessages.translateError(error, 'content.messages.saveGalleryPhotoError');
        this.savingGalleryPhoto = false;
      }
    });
  }

  onGalleryPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingGalleryPhotoImage = true;
    this.galleryFeedbackError = '';
    const previousFileName = this.galleryPhotoFileName;
    this.galleryPhotoFileName = file.name;

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.galleryPhotoForm.patchValue({ photo_url: url });
        this.galleryPhotoPreview = this.resolveMediaUrl(url);
        this.uploadingGalleryPhotoImage = false;
        input.value = '';
      },
      error: (error) => {
        this.galleryPhotoFileName = previousFileName;
        this.galleryFeedbackError = this.apiMessages.translateError(error, 'content.messages.uploadImageError');
        this.uploadingGalleryPhotoImage = false;
        input.value = '';
      }
    });
  }

  clearGalleryPhoto(): void {
    this.galleryPhotoForm.patchValue({ photo_url: '' });
    this.galleryPhotoFileName = '';
    this.galleryPhotoPreview = '';
  }

  deleteGalleryPhoto(photo: GalleryPhoto): void {
    if (!confirm(this.transloco.translate('content.actions.confirmDeletePhoto'))) {
      return;
    }

    this.deletingPhotoId = photo.id;
    this.http.delete<{ message: string }>(`${environment.apiUrl}/gallery/event-photos/${photo.id}`).subscribe({
      next: (response) => {
        this.galleryFeedbackMessage = response.message;
        this.loadGalleryAlbums();
        this.deletingPhotoId = null;
      },
      error: (error) => {
        this.galleryFeedbackError = this.apiMessages.translateError(error, 'content.messages.deleteGalleryPhotoError');
        this.deletingPhotoId = null;
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString(this.i18nService.getDateLocale());
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleString(this.i18nService.getDateLocale());
  }

  formatPrice(value?: number | string | null): string {
    return formatEuroPrice(
      value,
      this.i18nService.getDateLocale(),
      this.transloco.translate('events.modal.free')
    );
  }

  resolveMediaUrl(url?: string | null): string {
    return this.mediaUpload.resolveMediaUrl(url);
  }

  onNewsImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingNewsImage = true;
    this.newsFeedbackError = '';
    const previousFileName = this.newsImageFileName;
    this.newsImageFileName = file.name;

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.newsForm.patchValue({ image_url: url });
        this.newsImagePreview = this.resolveMediaUrl(url);
        this.uploadingNewsImage = false;
        input.value = '';
      },
      error: (error) => {
        this.newsImageFileName = previousFileName;
        this.newsFeedbackError = this.apiMessages.translateError(error, 'content.messages.uploadImageError');
        this.uploadingNewsImage = false;
        input.value = '';
      }
    });
  }

  clearNewsImage(): void {
    this.newsForm.patchValue({ image_url: '' });
    this.newsImagePreview = '';
    this.newsImageFileName = '';
  }

  onEventImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingEventImage = true;
    this.eventFeedbackError = '';
    const previousFileName = this.eventMediaFileName;
    this.eventMediaFileName = file.name;

    this.mediaUpload.uploadEventMedia(file).subscribe({
      next: ({ url }) => {
        this.eventForm.patchValue({ image_url: url });
        this.eventImagePreview = this.resolveMediaUrl(url);
        this.uploadingEventImage = false;
        input.value = '';
      },
      error: (error) => {
        this.eventMediaFileName = previousFileName;
        this.eventFeedbackError = this.apiMessages.translateError(error, 'content.messages.uploadEventMediaError');
        this.uploadingEventImage = false;
        input.value = '';
      }
    });
  }

  clearEventMedia(): void {
    this.eventForm.patchValue({ image_url: '' });
    this.eventImagePreview = '';
    this.eventMediaFileName = '';
  }

  isPdfMedia(url?: string | null): boolean {
    return this.mediaUpload.isPdfMedia(url);
  }

  onGalleryAlbumImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingGalleryAlbumImage = true;
    this.galleryFeedbackError = '';
    const previousFileName = this.galleryAlbumImageFileName;
    this.galleryAlbumImageFileName = file.name;

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.galleryAlbumForm.patchValue({ image_url: url });
        this.galleryAlbumImagePreview = this.resolveMediaUrl(url);
        this.uploadingGalleryAlbumImage = false;
        input.value = '';
      },
      error: (error) => {
        this.galleryAlbumImageFileName = previousFileName;
        this.galleryFeedbackError = this.apiMessages.translateError(error, 'content.messages.uploadImageError');
        this.uploadingGalleryAlbumImage = false;
        input.value = '';
      }
    });
  }

  clearGalleryAlbumImage(): void {
    this.galleryAlbumForm.patchValue({ image_url: '' });
    this.galleryAlbumImagePreview = '';
    this.galleryAlbumImageFileName = '';
  }

  onEventLocationInput(): void {
    const location = this.eventForm.value.location || '';
    this.eventLocationConfirmed = false;
    this.fetchLocationSuggestions(location, 'event');
  }

  onGalleryAlbumLocationInput(): void {
    const location = this.galleryAlbumForm.value.location || '';
    this.galleryAlbumLocationConfirmed = false;
    this.fetchLocationSuggestions(location, 'galleryAlbum');
  }

  selectEventLocation(suggestion: AddressSuggestion): void {
    this.eventForm.patchValue({ location: this.addressAutocomplete.formatCity(suggestion) });
    this.eventLocationConfirmed = true;
    this.eventLocationSuggestions = [];
  }

  selectGalleryAlbumLocation(suggestion: AddressSuggestion): void {
    this.galleryAlbumForm.patchValue({ location: this.addressAutocomplete.formatCity(suggestion) });
    this.galleryAlbumLocationConfirmed = true;
    this.galleryAlbumLocationSuggestions = [];
  }

  private selectWorkspaceView<T extends string>(
    event: KeyboardEvent,
    view: T,
    views: readonly T[],
    select: (next: T) => void
  ): void {
    const index = views.indexOf(view);
    let next = index;

    if (event.key === 'ArrowRight') next = (index + 1) % views.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + views.length) % views.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = views.length - 1;
    else return;

    event.preventDefault();
    select(views[next]);
    const tabList = (event.currentTarget as HTMLElement).closest('[role="tablist"]');
    tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  private applyTab(tab: string | null): void {
    if (tab === 'events' || tab === 'gallery') {
      this.activeTab = this.canManageAdvancedContent ? tab : 'news';
      return;
    }

    this.activeTab = 'news';
  }

  private formatDateTimeInput(date: string): string {
    return toDateTimeInputValue(date);
  }

  private fetchLocationSuggestions(value: string, target: 'event' | 'galleryAlbum'): void {
    const query = value.trim();
    const requestId = target === 'event'
      ? ++this.eventLocationRequestId
      : ++this.galleryAlbumLocationRequestId;

    if (!query) {
      this.setLocationSuggestions(target, []);
      this.setLocationConfirmed(target, false);
      return;
    }

    if (query.length < 3) {
      this.setLocationSuggestions(target, []);
      return;
    }

    this.addressAutocomplete.searchCities(query).subscribe((suggestions) => {
      if (!this.isLatestLocationRequest(target, requestId)) {
        return;
      }

      this.setLocationSuggestions(target, suggestions);
    });
  }

  private setLocationSuggestions(target: 'event' | 'galleryAlbum', suggestions: AddressSuggestion[]): void {
    if (target === 'event') {
      this.eventLocationSuggestions = suggestions;
      return;
    }

    this.galleryAlbumLocationSuggestions = suggestions;
  }

  private setLocationConfirmed(target: 'event' | 'galleryAlbum', confirmed: boolean): void {
    if (target === 'event') {
      this.eventLocationConfirmed = confirmed;
      return;
    }

    this.galleryAlbumLocationConfirmed = confirmed;
  }

  private isLatestLocationRequest(target: 'event' | 'galleryAlbum', requestId: number): boolean {
    return target === 'event'
      ? requestId === this.eventLocationRequestId
      : requestId === this.galleryAlbumLocationRequestId;
  }

  private ensureEventLocationIsConfirmed(): boolean {
    const location = (this.eventForm.value.location || '').trim();

    if (location && this.eventLocationConfirmed) {
      return true;
    }

    this.eventForm.controls.location.markAsTouched();
    this.eventFeedbackError = this.transloco.translate('content.messages.locationSuggestionRequired');
    return false;
  }

  private ensureGalleryAlbumLocationIsConfirmed(): boolean {
    const location = (this.galleryAlbumForm.value.location || '').trim();

    if (location && this.galleryAlbumLocationConfirmed) {
      return true;
    }

    this.galleryAlbumForm.controls.location.markAsTouched();
    this.galleryFeedbackError = this.transloco.translate('content.messages.locationSuggestionRequired');
    return false;
  }
}
