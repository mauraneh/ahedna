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
import { I18nService } from '../core/services/i18n.service';
import { MediaUploadService } from '../core/services/media-upload.service';

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  published: boolean;
  image_url?: string | null;
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
  eventImagePreview = '';
  galleryAlbumImagePreview = '';

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
  });

  galleryAlbumForm = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    event_date: ['', [Validators.required]],
    location: [''],
    image_url: [''],
    type: ['upcoming', [Validators.required]],
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
  }

  saveEvent(): void {
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
    });
    this.eventImagePreview = this.mediaUpload.resolveMediaUrl(item.image_url);
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
    });
    this.eventImagePreview = '';
  }

  saveGalleryAlbum(): void {
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
    });
    this.galleryAlbumImagePreview = this.mediaUpload.resolveMediaUrl(item.image_url);
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
    });
    this.galleryAlbumImagePreview = '';
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

  resolveMediaUrl(url?: string | null): string {
    return this.mediaUpload.resolveMediaUrl(url);
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

  private applyTab(tab: string | null): void {
    if (tab === 'events' || tab === 'gallery') {
      this.activeTab = this.canManageAdvancedContent ? tab : 'news';
      return;
    }

    this.activeTab = 'news';
  }

  private formatDateTimeInput(date: string): string {
    const parsed = new Date(date);
    const year = parsed.getFullYear();
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');
    const hours = `${parsed.getHours()}`.padStart(2, '0');
    const minutes = `${parsed.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
