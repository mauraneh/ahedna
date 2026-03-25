import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslocoDirective } from '@jsverse/transloco';
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
  authService = inject(AuthService);
  
  events: Event[] = [];
  loading = true;
  filterType: 'upcoming' | 'past' = 'upcoming';

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
}
