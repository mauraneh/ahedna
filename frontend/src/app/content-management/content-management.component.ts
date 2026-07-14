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
import { AddressAutocompleteService, AddressSuggestion } from '../core/services/address-autocomplete.service';
import { I18nService } from '../core/services/i18n.service';
import { MediaUploadService } from '../core/services/media-upload.service';
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
  imports: [CommonModule, ReactiveFormsModule, TranslocoDirective, NavbarComponent, ScrollToTopComponent],
  templateUrl: './content-management.component.html',
  styleUrl: './content-management.component.scss'
})
export class ContentManagementComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);
  private addressAutocomplete = inject(AddressAutocompleteService);
  private mediaUpload = inject(MediaUploadService);
  authService = inject(AuthService);
  i18nService = inject(I18nService);

  activeTab: ContentTab = 'news';

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
  eventImagePreview = '';
  galleryAlbumImagePreview = '';
  eventLocationSuggestions: AddressSuggestion[] = [];
  galleryAlbumLocationSuggestions: AddressSuggestion[] = [];
  private eventLocationConfirmed = true;
  private galleryAlbumLocationConfirmed = true;
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
    location: [''],
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
    location: [''],
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
        this.loadNews();
        this.savingNews = false;
      },
      error: (error) => {
        this.newsFeedbackError = error.error?.error || this.transloco.translate('content.messages.saveError');
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
        this.newsFeedbackError = error.error?.error || this.transloco.translate('content.messages.importNewsError');
        this.importingPublicNews = false;
      }
    });
  }

  editNews(item: NewsItem): void {
    this.activeTab = 'news';
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
        this.newsFeedbackError = error.error?.error || this.transloco.translate('content.messages.deleteError');
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
  }

  saveEvent(): void {
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
        this.eventFeedbackError = error.error?.error || this.transloco.translate('content.messages.saveEventError');
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
        this.eventFeedbackError = error.error?.error || this.transloco.translate('content.messages.deleteEventError');
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
    this.eventLocationConfirmed = true;
    this.eventLocationSuggestions = [];
  }

  saveGalleryAlbum(): void {
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
        this.loadEvents();
        this.loadGalleryAlbums();
        this.savingGalleryAlbum = false;
      },
      error: (error) => {
        this.galleryFeedbackError = error.error?.error || this.transloco.translate('content.messages.saveGalleryError');
        this.savingGalleryAlbum = false;
      }
    });
  }

  editGalleryAlbum(item: GalleryAlbum): void {
    this.activeTab = 'gallery';
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
    this.galleryAlbumLocationConfirmed = true;
    this.galleryAlbumLocationSuggestions = [];
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
    this.galleryAlbumLocationConfirmed = true;
    this.galleryAlbumLocationSuggestions = [];
  }

  uploadGalleryPhoto(): void {
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
        this.loadGalleryAlbums();
        this.savingGalleryPhoto = false;
      },
      error: (error) => {
        this.galleryFeedbackError = error.error?.error || this.transloco.translate('content.messages.saveGalleryPhotoError');
        this.savingGalleryPhoto = false;
      }
    });
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
        this.galleryFeedbackError = error.error?.error || this.transloco.translate('content.messages.deleteGalleryPhotoError');
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

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.newsForm.patchValue({ image_url: url });
        this.newsImagePreview = this.resolveMediaUrl(url);
        this.uploadingNewsImage = false;
        input.value = '';
      },
      error: (error) => {
        this.newsFeedbackError = error?.message || error?.error?.error || this.transloco.translate('content.messages.uploadImageError');
        this.uploadingNewsImage = false;
        input.value = '';
      }
    });
  }

  clearNewsImage(): void {
    this.newsForm.patchValue({ image_url: '' });
    this.newsImagePreview = '';
  }

  onEventImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingEventImage = true;
    this.eventFeedbackError = '';

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.eventForm.patchValue({ image_url: url });
        this.eventImagePreview = this.resolveMediaUrl(url);
        this.uploadingEventImage = false;
        input.value = '';
      },
      error: (error) => {
        this.eventFeedbackError = error?.message || error?.error?.error || this.transloco.translate('content.messages.uploadImageError');
        this.uploadingEventImage = false;
        input.value = '';
      }
    });
  }

  onGalleryAlbumImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingGalleryAlbumImage = true;
    this.galleryFeedbackError = '';

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.galleryAlbumForm.patchValue({ image_url: url });
        this.galleryAlbumImagePreview = this.resolveMediaUrl(url);
        this.uploadingGalleryAlbumImage = false;
        input.value = '';
      },
      error: (error) => {
        this.galleryFeedbackError = error?.message || error?.error?.error || this.transloco.translate('content.messages.uploadImageError');
        this.uploadingGalleryAlbumImage = false;
        input.value = '';
      }
    });
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
    this.eventForm.patchValue({ location: this.addressAutocomplete.formatLocation(suggestion) });
    this.eventLocationConfirmed = true;
    this.eventLocationSuggestions = [];
  }

  selectGalleryAlbumLocation(suggestion: AddressSuggestion): void {
    this.galleryAlbumForm.patchValue({ location: this.addressAutocomplete.formatLocation(suggestion) });
    this.galleryAlbumLocationConfirmed = true;
    this.galleryAlbumLocationSuggestions = [];
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
      this.setLocationConfirmed(target, true);
      return;
    }

    if (query.length < 3) {
      this.setLocationSuggestions(target, []);
      return;
    }

    const lookup = /^\d{5}$/.test(query)
      ? this.addressAutocomplete.searchByPostalCode(query)
      : this.addressAutocomplete.search(query);

    lookup.subscribe((suggestions) => {
      if (!this.isLatestLocationRequest(target, requestId)) {
        return;
      }

      if (/^\d{5}$/.test(query) && suggestions[0]) {
        this.patchLocationFromSuggestion(target, suggestions[0]);
        return;
      }

      this.setLocationSuggestions(target, suggestions);
    });
  }

  private patchLocationFromSuggestion(target: 'event' | 'galleryAlbum', suggestion: AddressSuggestion): void {
    if (target === 'event') {
      this.selectEventLocation(suggestion);
      return;
    }

    this.selectGalleryAlbumLocation(suggestion);
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

    if (!location || this.eventLocationConfirmed) {
      return true;
    }

    this.eventFeedbackError = this.transloco.translate('content.messages.locationSuggestionRequired');
    return false;
  }

  private ensureGalleryAlbumLocationIsConfirmed(): boolean {
    const location = (this.galleryAlbumForm.value.location || '').trim();

    if (!location || this.galleryAlbumLocationConfirmed) {
      return true;
    }

    this.galleryFeedbackError = this.transloco.translate('content.messages.locationSuggestionRequired');
    return false;
  }
}
