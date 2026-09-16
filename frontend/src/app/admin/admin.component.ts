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
import { PdfThumbnailComponent } from '../core/components/pdf-thumbnail/pdf-thumbnail.component';
import { formatEuroPrice, toDateTimeInputValue } from '../core/utils/date-time';

interface AdminStats {
  users: number;
  active_memberships: number;
  pending_memberships: number;
  news: number;
  published_news: number;
  events: number;
  upcoming_events: number;
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
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslocoDirective, NavbarComponent, ScrollToTopComponent, PdfThumbnailComponent],
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

  activeTab = 'overview';
  tabs = [
    { id: 'overview', labelKey: 'admin.tabs.overview' },
    { id: 'users', labelKey: 'admin.tabs.users' },
    { id: 'news', labelKey: 'admin.tabs.news' },
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
    pending_photos: 0,
  };

  users: AdminUser[] = [];
  loadingUsers = true;
  deletingUserId: string | null = null;
  savingMembershipNumberId: string | null = null;

  recentUsers: AdminUser[] = [];
  recentNews: NewsItem[] = [];
  recentEvents: EventItem[] = [];

  newsItems: NewsItem[] = [];
  activeNewsView: 'create' | 'list' = 'create';
  readonly newsViews = ['create', 'list'] as const;
  loadingNews = true;
  savingNews = false;
  importingPublicNews = false;
  editingNewsId: string | null = null;
  deletingNewsId: string | null = null;
  newsFeedback = '';
  newsError = '';
  uploadingNewsImage = false;
  newsImagePreview = '';
  newsImageFileName = '';

  pendingPhotos: PendingPhoto[] = [];
  loadingPhotos = true;

  galleryEvents: GalleryAlbum[] = [];
  activeGalleryView: 'create' | 'albums' = 'create';
  readonly galleryViews = ['create', 'albums'] as const;
  loadingGalleryEvents = true;
  savingGalleryEvent = false;
  galleryEventFeedback = '';
  galleryEventError = '';
  uploadingGalleryPhoto = false;
  uploadingGalleryPhotoMedia = false;
  galleryPhotoFeedback = '';
  galleryPhotoError = '';
  galleryPhotoFileName = '';
  galleryPhotoPreview = '';
  uploadingGalleryEventImage = false;
  galleryEventImagePreview = '';
  galleryEventImageFileName = '';

  events: EventItem[] = [];
  activeEventView: 'create' | 'planned' = 'create';
  readonly eventViews = ['create', 'planned'] as const;
  loadingEvents = true;
  savingEvent = false;
  uploadingEventImage = false;
  editingEventId: string | null = null;
  deletingEventId: string | null = null;
  eventFeedback = '';
  eventError = '';
  eventImagePreview = '';
  eventMediaFileName = '';
  eventLocationSuggestions: AddressSuggestion[] = [];
  galleryEventLocationSuggestions: AddressSuggestion[] = [];
  private eventLocationConfirmed = false;
  private galleryEventLocationConfirmed = false;
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
    location: ['', [Validators.required]],
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

  onTabKeydown(event: KeyboardEvent, id: string): void {
    const index = this.tabs.findIndex(tab => tab.id === id);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % this.tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + this.tabs.length) % this.tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.tabs.length - 1;
    else return;
    event.preventDefault();
    this.activeTab = this.tabs[next].id;
    const list = (event.currentTarget as HTMLElement).closest('[role="tablist"]');
    (list?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next])?.focus();
  }

  ngOnInit(): void {
    this.loadOverview();
    this.loadUsers();
    this.loadNews();
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

  updateMembershipNumber(user: AdminUser, event: Event): void {
    const input = event.target as HTMLInputElement;
    const membershipNumber = input.value.trim();

    if (membershipNumber === (user.membership_number || '')) {
      return;
    }

    this.savingMembershipNumberId = user.id;
    this.http.put(`${environment.apiUrl}/users/${user.id}/membership-number`, {
      membership_number: membershipNumber,
    })
      .subscribe({
        next: () => {
          this.savingMembershipNumberId = null;
          this.loadUsers();
        },
        error: (error) => {
          this.savingMembershipNumberId = null;
          input.value = user.membership_number || '';
          alert(error?.error?.error || this.transloco.translate('admin.messages.membershipNumberUpdateError'));
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
    if (this.uploadingNewsImage) {
      return;
    }

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
        this.activeNewsView = 'list';
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
    this.activeNewsView = 'create';
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
    this.newsImageFileName = this.mediaUpload.getMediaFileName(item.image_url);
  }

  setNewsView(view: 'create' | 'list'): void {
    this.activeNewsView = view;
  }

  onNewsViewKeydown(event: KeyboardEvent, view: 'create' | 'list'): void {
    this.selectWorkspaceView(event, view, this.newsViews, (next) => this.activeNewsView = next);
  }

  cancelNewsForm(): void {
    this.resetNewsForm();
    this.activeNewsView = 'list';
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
    this.newsImageFileName = '';
  }

  saveGalleryEvent(): void {
    if (this.uploadingGalleryEventImage) {
      return;
    }

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
        this.activeGalleryView = 'albums';
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
    this.galleryEventImageFileName = '';
    this.galleryEventLocationConfirmed = false;
    this.galleryEventLocationSuggestions = [];
  }

  setGalleryView(view: 'create' | 'albums'): void {
    this.activeGalleryView = view;
  }

  onGalleryViewKeydown(event: KeyboardEvent, view: 'create' | 'albums'): void {
    this.selectWorkspaceView(event, view, this.galleryViews, (next) => this.activeGalleryView = next);
  }

  cancelGalleryEventForm(): void {
    this.resetGalleryEventForm();
    this.activeGalleryView = 'albums';
  }

  uploadGalleryPhoto(): void {
    if (this.uploadingGalleryPhotoMedia) {
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
        this.galleryPhotoFileName = '';
        this.galleryPhotoPreview = '';
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

  onGalleryPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingGalleryPhotoMedia = true;
    this.galleryPhotoError = '';
    const previousFileName = this.galleryPhotoFileName;
    this.galleryPhotoFileName = file.name;

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.galleryPhotoForm.patchValue({ photo_url: url });
        this.galleryPhotoPreview = this.resolveMediaUrl(url);
        this.uploadingGalleryPhotoMedia = false;
        input.value = '';
      },
      error: (error) => {
        this.galleryPhotoFileName = previousFileName;
        this.galleryPhotoError = error?.message || error?.error?.error || this.transloco.translate('admin.messages.uploadImageError');
        this.uploadingGalleryPhotoMedia = false;
        input.value = '';
      }
    });
  }

  clearGalleryPhoto(): void {
    this.galleryPhotoForm.patchValue({ photo_url: '' });
    this.galleryPhotoFileName = '';
    this.galleryPhotoPreview = '';
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
    const previousFileName = this.galleryEventImageFileName;
    this.galleryEventImageFileName = file.name;

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.galleryEventForm.patchValue({ image_url: url });
        this.galleryEventImagePreview = this.resolveMediaUrl(url);
        this.uploadingGalleryEventImage = false;
        input.value = '';
      },
      error: (error) => {
        this.galleryEventImageFileName = previousFileName;
        this.galleryEventError = error?.message || error?.error?.error || this.transloco.translate('admin.messages.uploadImageError');
        this.uploadingGalleryEventImage = false;
        input.value = '';
      }
    });
  }

  clearGalleryEventImage(): void {
    this.galleryEventForm.patchValue({ image_url: '' });
    this.galleryEventImagePreview = '';
    this.galleryEventImageFileName = '';
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
    this.eventFeedback = '';
    this.eventError = '';

    const request = this.editingEventId
      ? this.http.put<{ message: string }>(`${environment.apiUrl}/events/${this.editingEventId}`, this.eventForm.getRawValue())
      : this.http.post<{ message: string }>(`${environment.apiUrl}/events`, this.eventForm.getRawValue());

    request.subscribe({
      next: (response) => {
        this.eventFeedback = response.message;
        this.resetEventForm();
        this.activeEventView = 'planned';
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
    this.activeEventView = 'create';
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
    this.eventMediaFileName = this.mediaUpload.getMediaFileName(item.image_url);
    this.eventLocationConfirmed = true;
    this.eventLocationSuggestions = [];
  }

  setEventView(view: 'create' | 'planned'): void {
    this.activeEventView = view;
  }

  onEventViewKeydown(event: KeyboardEvent, view: 'create' | 'planned'): void {
    const index = this.eventViews.indexOf(view);
    let next = index;

    if (event.key === 'ArrowRight') next = (index + 1) % this.eventViews.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + this.eventViews.length) % this.eventViews.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.eventViews.length - 1;
    else return;

    event.preventDefault();
    this.activeEventView = this.eventViews[next];
    const tabList = (event.currentTarget as HTMLElement).closest('[role="tablist"]');
    tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  cancelEventForm(): void {
    this.resetEventForm();
    this.activeEventView = 'planned';
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
    this.eventMediaFileName = '';
    this.eventLocationConfirmed = false;
    this.eventLocationSuggestions = [];
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
        this.newsError = error?.message || error?.error?.error || this.transloco.translate('admin.messages.uploadImageError');
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
    this.eventError = '';
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
        this.eventError = error?.message || error?.error?.error || this.transloco.translate('content.messages.uploadEventMediaError');
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
    this.eventForm.patchValue({ location: this.addressAutocomplete.formatCity(suggestion) });
    this.eventLocationConfirmed = true;
    this.eventLocationSuggestions = [];
  }

  selectGalleryEventLocation(suggestion: AddressSuggestion): void {
    this.galleryEventForm.patchValue({ location: this.addressAutocomplete.formatCity(suggestion) });
    this.galleryEventLocationConfirmed = true;
    this.galleryEventLocationSuggestions = [];
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

    if (location && this.eventLocationConfirmed) {
      return true;
    }

    this.eventForm.controls.location.markAsTouched();
    this.eventError = this.transloco.translate('content.messages.locationSuggestionRequired');
    return false;
  }

  private ensureGalleryEventLocationIsConfirmed(): boolean {
    const location = (this.galleryEventForm.value.location || '').trim();

    if (location && this.galleryEventLocationConfirmed) {
      return true;
    }

    this.galleryEventForm.controls.location.markAsTouched();
    this.galleryEventError = this.transloco.translate('content.messages.locationSuggestionRequired');
    return false;
  }
}
