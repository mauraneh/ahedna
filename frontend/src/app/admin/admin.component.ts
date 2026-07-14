import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { environment } from '../../environments/environment';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';
import { AddressAutocompleteService, AddressSuggestion } from '../core/services/address-autocomplete.service';
import { AuthService } from '../core/services/auth.service';
import { I18nService } from '../core/services/i18n.service';
import { MediaUploadService } from '../core/services/media-upload.service';
import { formatEuroPrice, toDateTimeInputValue } from '../core/utils/date-time';

interface AdminStats {
  users: number;
  active_memberships: number;
  pending_memberships: number;
  news: number;
  published_news: number;
  events: number;
  upcoming_events: number;
  pending_topics: number;
  pending_photos: number;
}

interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'membre' | 'auteur' | 'admin';
  created_at: string;
  membership_number?: string;
}

interface NewsItem {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  image_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  published: boolean;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

interface EventItem {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location?: string | null;
  image_url?: string | null;
  type: 'upcoming' | 'past';
  gallery_enabled?: boolean;
  price_amount?: number | string | null;
  payment_details?: string | null;
}

interface GalleryAlbum {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  location?: string | null;
  image_url?: string | null;
  type: 'upcoming' | 'past';
  gallery_enabled: boolean;
  photo_count: number;
  price_amount?: number | string | null;
  payment_details?: string | null;
}

interface PendingPhoto {
  id: string;
  photo_url: string;
  description?: string | null;
  first_name?: string;
  last_name?: string;
  event_title: string;
  event_date: string;
  location?: string | null;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslocoDirective, NavbarComponent, ScrollToTopComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private transloco = inject(TranslocoService);
  private i18nService = inject(I18nService);
  private addressAutocomplete = inject(AddressAutocompleteService);
  private mediaUpload = inject(MediaUploadService);
  authService = inject(AuthService);

  activeTab = 'users';
  tabs = [
    { id: 'users', labelKey: 'admin.tabs.users' },
    { id: 'news', labelKey: 'admin.tabs.news' },
    { id: 'forum', labelKey: 'admin.tabs.forum' },
    { id: 'gallery', labelKey: 'admin.tabs.gallery' },
    { id: 'events', labelKey: 'admin.tabs.events' }
  ];

  stats: AdminStats = {
    users: 0,
    active_memberships: 0,
    pending_memberships: 0,
    news: 0,
    published_news: 0,
    events: 0,
    upcoming_events: 0,
    pending_topics: 0,
    pending_photos: 0,
  };

  users: AdminUser[] = [];
  loadingUsers = true;
  deletingUserId: string | null = null;

  recentUsers: AdminUser[] = [];
  recentNews: NewsItem[] = [];
  recentEvents: EventItem[] = [];

  newsItems: NewsItem[] = [];
  loadingNews = true;
  savingNews = false;
  importingPublicNews = false;
  editingNewsId: string | null = null;
  deletingNewsId: string | null = null;
  newsFeedback = '';
  newsError = '';
  uploadingNewsImage = false;
  newsImagePreview = '';

  pendingTopics: any[] = [];
  loadingTopics = true;

  pendingPhotos: PendingPhoto[] = [];
  loadingPhotos = true;

  galleryEvents: GalleryAlbum[] = [];
  loadingGalleryEvents = true;
  savingGalleryEvent = false;
  galleryEventFeedback = '';
  galleryEventError = '';
  uploadingGalleryPhoto = false;
  galleryPhotoFeedback = '';
  galleryPhotoError = '';
  uploadingGalleryEventImage = false;
  galleryEventImagePreview = '';

  events: EventItem[] = [];
  loadingEvents = true;
  savingEvent = false;
  uploadingEventImage = false;
  editingEventId: string | null = null;
  deletingEventId: string | null = null;
  eventFeedback = '';
  eventError = '';
  eventImagePreview = '';
  eventLocationSuggestions: AddressSuggestion[] = [];
  galleryEventLocationSuggestions: AddressSuggestion[] = [];
  private eventLocationConfirmed = true;
  private galleryEventLocationConfirmed = true;
  private eventLocationRequestId = 0;
  private galleryEventLocationRequestId = 0;

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

  galleryEventForm = this.fb.group({
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

  ngOnInit(): void {
    this.loadOverview();
    this.loadUsers();
    this.loadNews();
    this.loadPendingTopics();
    this.loadPendingPhotos();
    this.loadEvents();
    this.loadGalleryEvents();
  }

  loadOverview(): void {
    this.http.get<{ stats: AdminStats; recentUsers: AdminUser[]; recentNews: NewsItem[]; recentEvents: EventItem[] }>(`${environment.apiUrl}/admin/overview`).subscribe({
      next: (response) => {
        this.stats = response.stats;
        this.recentUsers = response.recentUsers;
        this.recentNews = response.recentNews;
        this.recentEvents = response.recentEvents;
      }
    });
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.http.get<{ users: AdminUser[] }>(`${environment.apiUrl}/users`)
      .subscribe({
        next: (response) => {
          this.users = response.users;
          this.loadingUsers = false;
        },
        error: () => {
          this.loadingUsers = false;
        }
      });
  }

  loadNews(): void {
    this.loadingNews = true;
    this.http.get<{ news: NewsItem[] }>(`${environment.apiUrl}/news`)
      .subscribe({
        next: (response) => {
          this.newsItems = response.news;
          this.loadingNews = false;
        },
        error: () => {
          this.newsError = this.transloco.translate('admin.messages.loadNewsError');
          this.loadingNews = false;
        }
      });
  }

  loadPendingTopics(): void {
    this.loadingTopics = true;
    this.http.get<{ topics: any[] }>(`${environment.apiUrl}/forum/topics`)
      .subscribe({
        next: (response) => {
          this.pendingTopics = response.topics.filter(topic => !topic.validated);
          this.loadingTopics = false;
        },
        error: () => {
          this.loadingTopics = false;
        }
      });
  }

  loadPendingPhotos(): void {
    this.loadingPhotos = true;
    this.http.get<{ photos: PendingPhoto[] }>(`${environment.apiUrl}/gallery/event-photos`)
      .subscribe({
        next: (response) => {
          this.pendingPhotos = response.photos;
          this.loadingPhotos = false;
        },
        error: () => {
          this.loadingPhotos = false;
        }
      });
  }

  loadGalleryEvents(): void {
    this.loadingGalleryEvents = true;
    this.http.get<{ events: GalleryAlbum[] }>(`${environment.apiUrl}/gallery/events`)
      .subscribe({
        next: (response) => {
          this.galleryEvents = response.events;
          const currentEventId = this.galleryPhotoForm.value.event_id;
          const selectedStillExists = this.galleryEvents.some((event) => event.id === currentEventId);

          if (!selectedStillExists) {
            this.galleryPhotoForm.patchValue({ event_id: this.galleryEvents[0]?.id ?? '' });
          }

          this.loadingGalleryEvents = false;
        },
        error: () => {
          this.loadingGalleryEvents = false;
        }
      });
  }

  loadEvents(): void {
    this.loadingEvents = true;
    this.http.get<{ events: EventItem[] }>(`${environment.apiUrl}/events`)
      .subscribe({
        next: (response) => {
          this.events = response.events;
          this.loadingEvents = false;
        },
        error: () => {
          this.eventError = this.transloco.translate('admin.messages.loadEventsError');
          this.loadingEvents = false;
        }
      });
  }

  updateUserRole(userId: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.http.put(`${environment.apiUrl}/users/${userId}/role`, { role: select.value })
      .subscribe({
        next: () => {
          alert(this.transloco.translate('admin.messages.roleUpdated'));
          this.loadUsers();
        },
        error: () => {
          alert(this.transloco.translate('admin.messages.roleUpdateError'));
        }
      });
  }

  deleteUser(user: AdminUser): void {
    if (!confirm(this.transloco.translate('admin.messages.confirmDeleteUser', { email: user.email }))) {
      return;
    }

    this.deletingUserId = user.id;
    this.http.delete<{ message: string }>(`${environment.apiUrl}/users/${user.id}`)
      .subscribe({
        next: () => {
          this.loadUsers();
          this.loadOverview();
          this.deletingUserId = null;
        },
        error: (error) => {
          alert(error.error?.error || this.transloco.translate('admin.messages.deleteUserError'));
          this.deletingUserId = null;
        }
      });
  }

  saveNews(): void {
    if (this.newsForm.invalid) {
      this.newsForm.markAllAsTouched();
      return;
    }

    this.savingNews = true;
    this.newsFeedback = '';
    this.newsError = '';

    const request = this.editingNewsId
      ? this.http.put<{ message: string }>(`${environment.apiUrl}/news/${this.editingNewsId}`, this.newsForm.getRawValue())
      : this.http.post<{ message: string }>(`${environment.apiUrl}/news`, this.newsForm.getRawValue());

    request.subscribe({
      next: (response) => {
        this.newsFeedback = response.message;
        this.resetNewsForm();
        this.loadNews();
        this.loadOverview();
        this.savingNews = false;
      },
      error: (error) => {
        this.newsError = error.error?.error || this.transloco.translate('admin.messages.saveNewsError');
        this.savingNews = false;
      }
    });
  }

  importPublicNews(): void {
    this.importingPublicNews = true;
    this.newsFeedback = '';
    this.newsError = '';

    this.http.post<{ message: string }>(`${environment.apiUrl}/news/import-public`, {
      max_records: 12,
      published: true,
    }).subscribe({
      next: (response) => {
        this.newsFeedback = response.message;
        this.loadNews();
        this.loadOverview();
        this.importingPublicNews = false;
      },
      error: (error) => {
        this.newsError = error.error?.error || this.transloco.translate('content.messages.importNewsError');
        this.importingPublicNews = false;
      }
    });
  }

  editNews(item: NewsItem): void {
    this.activeTab = 'news';
    this.editingNewsId = item.id;
    this.newsFeedback = '';
    this.newsError = '';
    this.newsForm.patchValue({
      title: item.title,
      excerpt: item.excerpt || '',
      content: item.content,
      image_url: item.image_url || '',
      published: item.published,
    });
    this.newsImagePreview = this.resolveMediaUrl(item.image_url);
  }

  deleteNews(item: NewsItem): void {
    if (!confirm(this.transloco.translate('admin.messages.confirmDeleteNews'))) {
      return;
    }

    this.deletingNewsId = item.id;
    this.http.delete<{ message: string }>(`${environment.apiUrl}/news/${item.id}`)
      .subscribe({
        next: (response) => {
          this.newsFeedback = response.message;
          if (this.editingNewsId === item.id) {
            this.resetNewsForm();
          }
          this.loadNews();
          this.loadOverview();
          this.deletingNewsId = null;
        },
        error: (error) => {
          this.newsError = error.error?.error || this.transloco.translate('admin.messages.deleteError');
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

  saveGalleryEvent(): void {
    if (!this.ensureGalleryEventLocationIsConfirmed()) {
      return;
    }

    if (this.galleryEventForm.invalid) {
      this.galleryEventForm.markAllAsTouched();
      return;
    }

    this.savingGalleryEvent = true;
    this.galleryEventFeedback = '';
    this.galleryEventError = '';

    this.http.post<{ message: string; event: GalleryAlbum }>(`${environment.apiUrl}/events`, {
      ...this.galleryEventForm.getRawValue(),
      gallery_enabled: true,
    }).subscribe({
      next: (response) => {
        this.galleryEventFeedback = response.message || this.transloco.translate('admin.gallery.messages.eventCreated');
        this.resetGalleryEventForm();
        this.galleryPhotoForm.patchValue({ event_id: response.event.id });
        this.loadEvents();
        this.loadGalleryEvents();
        this.loadOverview();
        this.savingGalleryEvent = false;
      },
      error: (error) => {
        this.galleryEventError = error.error?.error || this.transloco.translate('admin.gallery.messages.eventCreateError');
        this.savingGalleryEvent = false;
      }
    });
  }

  resetGalleryEventForm(): void {
    this.galleryEventForm.reset({
      title: '',
      description: '',
      event_date: '',
      location: '',
      image_url: '',
      type: 'upcoming',
      price_amount: 0,
      payment_details: '',
    });
    this.galleryEventImagePreview = '';
    this.galleryEventLocationConfirmed = true;
    this.galleryEventLocationSuggestions = [];
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

    this.uploadingGalleryPhoto = true;
    this.galleryPhotoFeedback = '';
    this.galleryPhotoError = '';

    this.http.post<{ message: string }>(
      `${environment.apiUrl}/gallery/events/${eventId}/photos`,
      this.galleryPhotoForm.getRawValue()
    ).subscribe({
      next: (response) => {
        this.galleryPhotoFeedback = response.message || this.transloco.translate('admin.gallery.messages.photoUploaded');
        this.galleryPhotoForm.patchValue({
          photo_url: '',
          description: '',
        });
        this.loadGalleryEvents();
        this.loadPendingPhotos();
        this.loadOverview();
        this.uploadingGalleryPhoto = false;
      },
      error: (error) => {
        this.galleryPhotoError = error.error?.error || this.transloco.translate('admin.gallery.messages.photoUploadError');
        this.uploadingGalleryPhoto = false;
      }
    });
  }

  openGalleryEvent(item: GalleryAlbum): void {
    this.editEvent({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      event_date: item.event_date,
      location: item.location || undefined,
      image_url: item.image_url || undefined,
      type: item.type,
      gallery_enabled: item.gallery_enabled,
      price_amount: item.price_amount,
      payment_details: item.payment_details,
    });
  }

  onGalleryEventImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingGalleryEventImage = true;
    this.galleryEventError = '';

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.galleryEventForm.patchValue({ image_url: url });
        this.galleryEventImagePreview = this.resolveMediaUrl(url);
        this.uploadingGalleryEventImage = false;
        input.value = '';
      },
      error: (error) => {
        this.galleryEventError = error?.message || error?.error?.error || this.transloco.translate('admin.messages.uploadImageError');
        this.uploadingGalleryEventImage = false;
        input.value = '';
      }
    });
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
    this.eventFeedback = '';
    this.eventError = '';

    const request = this.editingEventId
      ? this.http.put<{ message: string }>(`${environment.apiUrl}/events/${this.editingEventId}`, this.eventForm.getRawValue())
      : this.http.post<{ message: string }>(`${environment.apiUrl}/events`, this.eventForm.getRawValue());

    request.subscribe({
      next: (response) => {
        this.eventFeedback = response.message;
        this.resetEventForm();
        this.loadEvents();
        this.loadGalleryEvents();
        this.loadOverview();
        this.savingEvent = false;
      },
      error: (error) => {
        this.eventError = error.error?.error || this.transloco.translate('admin.messages.saveEventError');
        this.savingEvent = false;
      }
    });
  }

  editEvent(item: EventItem): void {
    this.activeTab = 'events';
    this.editingEventId = item.id;
    this.eventFeedback = '';
    this.eventError = '';
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
    this.eventImagePreview = this.resolveMediaUrl(item.image_url);
    this.eventLocationConfirmed = true;
    this.eventLocationSuggestions = [];
  }

  deleteEvent(item: EventItem): void {
    if (!confirm(this.transloco.translate('admin.messages.confirmDeleteEvent'))) {
      return;
    }

    this.deletingEventId = item.id;
    this.http.delete<{ message: string }>(`${environment.apiUrl}/events/${item.id}`)
      .subscribe({
        next: (response) => {
          this.eventFeedback = response.message;
          if (this.editingEventId === item.id) {
            this.resetEventForm();
          }
          this.loadEvents();
          this.loadGalleryEvents();
          this.loadOverview();
          this.deletingEventId = null;
        },
        error: (error) => {
          this.eventError = error.error?.error || this.transloco.translate('admin.messages.deleteError');
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

  validateTopic(topicId: string, validated: boolean): void {
    this.http.put(`${environment.apiUrl}/forum/topics/${topicId}/validate`, { validated })
      .subscribe({
        next: () => {
          this.loadPendingTopics();
          this.loadOverview();
        },
        error: () => {
          alert(this.transloco.translate('admin.messages.validationError'));
        }
      });
  }

  deleteTopic(topicId: string): void {
    if (confirm(this.transloco.translate('admin.messages.confirmDeleteTopic'))) {
      this.http.delete(`${environment.apiUrl}/forum/topics/${topicId}`)
        .subscribe({
          next: () => {
            this.loadPendingTopics();
            this.loadOverview();
          },
          error: () => {
            alert(this.transloco.translate('admin.messages.deleteError'));
          }
        });
    }
  }

  validatePhoto(photoId: string, validated: boolean): void {
    this.http.put(`${environment.apiUrl}/gallery/event-photos/${photoId}/validate`, { validated })
      .subscribe({
        next: () => {
          this.loadPendingPhotos();
          this.loadGalleryEvents();
          this.loadOverview();
        },
        error: () => {
          alert(this.transloco.translate('admin.messages.validationError'));
        }
      });
  }

  deletePhoto(photoId: string): void {
    if (confirm(this.transloco.translate('admin.messages.confirmDeletePhoto'))) {
      this.http.delete(`${environment.apiUrl}/gallery/event-photos/${photoId}`)
        .subscribe({
          next: () => {
            this.loadPendingPhotos();
            this.loadGalleryEvents();
            this.loadOverview();
          },
          error: () => {
            alert(this.transloco.translate('admin.messages.deleteError'));
          }
        });
    }
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

  isCurrentUser(userId: string): boolean {
    return this.authService.currentUser()?.id === userId;
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
    this.newsError = '';

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.newsForm.patchValue({ image_url: url });
        this.newsImagePreview = this.resolveMediaUrl(url);
        this.uploadingNewsImage = false;
        input.value = '';
      },
      error: (error) => {
        this.newsError = error?.message || error?.error?.error || this.transloco.translate('admin.messages.uploadImageError');
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
    this.eventError = '';

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.eventForm.patchValue({ image_url: url });
        this.eventImagePreview = this.resolveMediaUrl(url);
        this.uploadingEventImage = false;
        input.value = '';
      },
      error: (error) => {
        this.eventError = error?.message || error?.error?.error || this.transloco.translate('admin.messages.uploadImageError');
        this.uploadingEventImage = false;
        input.value = '';
      }
    });
  }

  onEventLocationInput(): void {
    const location = this.eventForm.value.location || '';
    this.eventLocationConfirmed = false;
    this.fetchLocationSuggestions(location, 'event');
  }

  onGalleryEventLocationInput(): void {
    const location = this.galleryEventForm.value.location || '';
    this.galleryEventLocationConfirmed = false;
    this.fetchLocationSuggestions(location, 'galleryEvent');
  }

  selectEventLocation(suggestion: AddressSuggestion): void {
    this.eventForm.patchValue({ location: this.addressAutocomplete.formatLocation(suggestion) });
    this.eventLocationConfirmed = true;
    this.eventLocationSuggestions = [];
  }

  selectGalleryEventLocation(suggestion: AddressSuggestion): void {
    this.galleryEventForm.patchValue({ location: this.addressAutocomplete.formatLocation(suggestion) });
    this.galleryEventLocationConfirmed = true;
    this.galleryEventLocationSuggestions = [];
  }

  private formatDateTimeInput(date: string): string {
    return toDateTimeInputValue(date);
  }

  private fetchLocationSuggestions(value: string, target: 'event' | 'galleryEvent'): void {
    const query = value.trim();
    const requestId = target === 'event'
      ? ++this.eventLocationRequestId
      : ++this.galleryEventLocationRequestId;

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

  private patchLocationFromSuggestion(target: 'event' | 'galleryEvent', suggestion: AddressSuggestion): void {
    if (target === 'event') {
      this.selectEventLocation(suggestion);
      return;
    }

    this.selectGalleryEventLocation(suggestion);
  }

  private setLocationSuggestions(target: 'event' | 'galleryEvent', suggestions: AddressSuggestion[]): void {
    if (target === 'event') {
      this.eventLocationSuggestions = suggestions;
      return;
    }

    this.galleryEventLocationSuggestions = suggestions;
  }

  private setLocationConfirmed(target: 'event' | 'galleryEvent', confirmed: boolean): void {
    if (target === 'event') {
      this.eventLocationConfirmed = confirmed;
      return;
    }

    this.galleryEventLocationConfirmed = confirmed;
  }

  private isLatestLocationRequest(target: 'event' | 'galleryEvent', requestId: number): boolean {
    return target === 'event'
      ? requestId === this.eventLocationRequestId
      : requestId === this.galleryEventLocationRequestId;
  }

  private ensureEventLocationIsConfirmed(): boolean {
    const location = (this.eventForm.value.location || '').trim();

    if (!location || this.eventLocationConfirmed) {
      return true;
    }

    this.eventError = this.transloco.translate('content.messages.locationSuggestionRequired');
    return false;
  }

  private ensureGalleryEventLocationIsConfirmed(): boolean {
    const location = (this.galleryEventForm.value.location || '').trim();

    if (!location || this.galleryEventLocationConfirmed) {
      return true;
    }

    this.galleryEventError = this.transloco.translate('content.messages.locationSuggestionRequired');
    return false;
  }
}
