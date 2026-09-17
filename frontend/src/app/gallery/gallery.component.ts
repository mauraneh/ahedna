import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { ApiMessageService } from '../core/services/api-message.service';
import { MediaUploadService } from '../core/services/media-upload.service';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';

interface GalleryPhoto {
  id: string;
  event_id: string;
  photo_url: string;
  description?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  created_at: string;
}

interface GalleryEvent {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  location?: string | null;
  type: 'upcoming' | 'past';
  gallery_enabled: boolean;
  photo_count: number;
  photos: GalleryPhoto[];
}

interface MembershipStatus {
  status: 'pending' | 'active' | 'expired';
}

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    NavbarComponent,
    ScrollToTopComponent,
  ],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private transloco = inject(TranslocoService);
  private apiMessages = inject(ApiMessageService);
  private mediaUpload = inject(MediaUploadService);
  authService = inject(AuthService);

  events: GalleryEvent[] = [];
  loading = true;
  membershipRequired = false;
  uploading = false;
  uploadingFile = false;
  photoFileName = '';
  photoPreview = '';
  uploadError = '';
  uploadMessage = '';
  membershipStatus: MembershipStatus['status'] | null = null;

  uploadForm = this.fb.group({
    event_id: ['', [Validators.required]],
    photo_url: ['', [Validators.required]],
    description: [''],
  });

  particles = Array.from({ length: 12 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

  async ngOnInit(): Promise<void> {
    await this.authService.ensureLoaded();
    this.loadEvents();

    if (this.authService.isAuthenticated()) {
      this.loadMembershipStatus();
    }
  }

  get canUpload(): boolean {
    return this.authService.hasRole(['admin']) || this.membershipStatus === 'active';
  }

  get hasOpenEvents(): boolean {
    return this.events.length > 0;
  }

  get membershipStateKey(): string {
    const state = this.membershipStatus ?? 'pending';
    return `gallery.upload.membership.${state}`;
  }

  loadEvents(): void {
    this.loading = true;
    this.membershipRequired = false;
    this.http.get<{ events: GalleryEvent[] }>(`${environment.apiUrl}/gallery/events`)
      .subscribe({
        next: (response) => {
          this.events = response.events;

          if (!this.uploadForm.value.event_id && this.events[0]) {
            this.uploadForm.patchValue({ event_id: this.events[0].id });
          }

          this.loading = false;
        },
        error: (error) => {
          this.events = [];
          this.membershipRequired = error?.status === 403;
          this.loading = false;
        }
      });
  }

  loadMembershipStatus(): void {
    this.http.get<{ membership: MembershipStatus | null }>(`${environment.apiUrl}/memberships/my-status`)
      .subscribe({
        next: (response) => {
          this.membershipStatus = response.membership?.status ?? null;
        },
        error: () => {
          this.membershipStatus = null;
        }
      });
  }

  submitPhoto(): void {
    if (!this.canUpload || this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }

    const eventId = this.uploadForm.value.event_id;
    if (!eventId) {
      return;
    }

    this.uploading = true;
    this.uploadError = '';
    this.uploadMessage = '';

    this.http.post<{ message: string }>(
      `${environment.apiUrl}/gallery/events/${eventId}/photos`,
      this.uploadForm.getRawValue()
    ).subscribe({
      next: (response) => {
        this.uploadMessage = this.transloco.translate('gallery.upload.messages.success');
        this.uploadForm.patchValue({
          photo_url: '',
          description: '',
        });
        this.photoFileName = '';
        this.photoPreview = '';
        this.uploading = false;
      },
      error: (error) => {
        this.uploadError = this.apiMessages.translateError(error, 'gallery.upload.messages.error');
        this.uploading = false;
      }
    });
  }

  onPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingFile = true;
    this.uploadError = '';
    this.uploadMessage = '';

    this.mediaUpload.uploadImage(file).subscribe({
      next: ({ url }) => {
        this.uploadForm.patchValue({ photo_url: url });
        this.photoFileName = file.name;
        this.photoPreview = this.mediaUpload.resolveMediaUrl(url);
        this.uploadingFile = false;
        input.value = '';
      },
      error: (error) => {
        this.uploadError = this.apiMessages.translateError(error, 'gallery.upload.messages.fileError');
        this.uploadingFile = false;
        input.value = '';
      }
    });
  }

  resolveMediaUrl(url?: string | null): string {
    return this.mediaUpload.resolveMediaUrl(url);
  }

  getPhotoAuthor(photo: GalleryPhoto): string {
    const name = [photo.first_name, photo.last_name]
      .map((part) => (part || '').trim())
      .filter(Boolean)
      .join(' ');

    // Members can register with an email only, so a photo often has no name attached.
    if (!name) {
      return this.transloco.translate('gallery.event.anonymousAuthor');
    }

    return this.transloco.translate('common.byAuthorName', { name });
  }

  clearPhotoFile(): void {
    this.uploadForm.patchValue({ photo_url: '' });
    this.photoFileName = '';
    this.photoPreview = '';
  }

  trackEvent(_: number, event: GalleryEvent): string {
    return event.id;
  }

  trackPhoto(_: number, photo: GalleryPhoto): string {
    return photo.id;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString(this.transloco.getActiveLang() === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
