import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../../core/components/scroll-to-top/scroll-to-top.component';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { MediaUploadService } from '../../core/services/media-upload.service';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url?: string | null;
  type: 'upcoming' | 'past';
  price_amount?: number | string | null;
  payment_details?: string | null;
  participant_count?: number | string | null;
  current_user_participation?: 'attending' | 'declined' | null;
}

interface ParticipationResponse {
  message: string;
  participation: {
    status: 'attending' | 'declined';
  };
}

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, TranslocoDirective, RouterLink, NavbarComponent, ScrollToTopComponent],
  templateUrl: './events-list.component.html',
  styleUrl: './events-list.component.scss'
})
export class EventsListComponent implements OnInit {
  private http = inject(HttpClient);
  private i18nService = inject(I18nService);
  private mediaUpload = inject(MediaUploadService);
  private sanitizer = inject(DomSanitizer);
  private transloco = inject(TranslocoService);
  authService = inject(AuthService);
  
  events: Event[] = [];
  loading = true;
  filterType: 'upcoming' | 'past' = 'upcoming';
  selectedEvent: Event | null = null;
  participationSaving = false;
  participationMessage = '';
  participationError = '';

  particles = Array.from({ length: 12 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.http.get<{ events: Event[] }>(`${environment.apiUrl}/events?type=${this.filterType}`)
      .subscribe({
        next: (response) => {
          this.events = response.events;
          if (this.selectedEvent) {
            this.selectedEvent = this.events.find((event) => event.id === this.selectedEvent?.id) ?? this.selectedEvent;
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  getDay(date: string): string {
    return new Date(date).getDate().toString();
  }

  getMonth(date: string): string {
    return new Intl.DateTimeFormat(this.i18nService.getDateLocale(), { month: 'short' })
      .format(new Date(date))
      .replace('.', '')
      .toUpperCase();
  }

  getEventImageUrl(url?: string | null): string {
    return this.mediaUpload.resolveMediaUrl(url);
  }

  openEvent(event: Event): void {
    this.selectedEvent = event;
    this.participationMessage = '';
    this.participationError = '';
  }

  closeEvent(): void {
    if (this.participationSaving) {
      return;
    }

    this.selectedEvent = null;
    this.participationMessage = '';
    this.participationError = '';
  }

  setParticipation(status: 'attending' | 'declined'): void {
    if (!this.selectedEvent) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.participationError = 'events.modal.loginRequired';
      return;
    }

    const event = this.selectedEvent;
    const previousStatus = event.current_user_participation ?? null;

    this.participationSaving = true;
    this.participationMessage = '';
    this.participationError = '';

    this.http.post<ParticipationResponse>(`${environment.apiUrl}/events/${event.id}/participation`, { status })
      .subscribe({
        next: (response) => {
          const nextStatus = response.participation.status;
          const participantCount = this.getNextParticipantCount(event, previousStatus, nextStatus);
          const updatedEvent = {
            ...event,
            current_user_participation: nextStatus,
            participant_count: participantCount,
          };

          this.selectedEvent = updatedEvent;
          this.events = this.events.map((item) => item.id === event.id ? updatedEvent : item);
          this.participationMessage = 'events.modal.participationSaved';
          this.participationSaving = false;
        },
        error: () => {
          this.participationError = 'events.modal.participationError';
          this.participationSaving = false;
        }
      });
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleString(this.i18nService.getDateLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatPrice(value?: number | string | null): string {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return this.transloco.translate('events.modal.free');
    }

    return new Intl.NumberFormat(this.i18nService.getDateLocale(), {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }

  getParticipantCount(event: Event): number {
    const count = Number(event.participant_count || 0);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  getMapEmbedUrl(location?: string | null): SafeResourceUrl | null {
    const query = location?.trim();
    if (!query) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
    );
  }

  getMapLink(location?: string | null): string {
    const query = location?.trim() || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  private getNextParticipantCount(
    event: Event,
    previousStatus: 'attending' | 'declined' | null,
    nextStatus: 'attending' | 'declined'
  ): number {
    const current = this.getParticipantCount(event);

    if (previousStatus !== 'attending' && nextStatus === 'attending') {
      return current + 1;
    }

    if (previousStatus === 'attending' && nextStatus === 'declined') {
      return Math.max(0, current - 1);
    }

    return current;
  }
}
