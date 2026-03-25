import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { environment } from '../../environments/environment';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';
import { I18nService } from '../core/services/i18n.service';
import { MediaUploadService } from '../core/services/media-upload.service';

type ShortcutIcon = 'history' | 'news' | 'events' | 'forum' | 'membership';

interface HomeVisual {
  url: string;
  alt: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

interface HomeShortcut {
  label: string;
  route: string;
  icon: ShortcutIcon;
}

interface HomeSectionCopy {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
}

interface HomeAboutSection {
  eyebrow: string;
  title: string;
  body1: string;
  body2: string;
  cta: string;
  visual: HomeVisual;
}

interface HomeNewsFallback {
  title: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  dateLabel: string;
}

interface HomeEventFallback {
  title: string;
  body: string;
  dateLabel: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
}

interface HomeMemoryStat {
  value: string;
  label: string;
}

interface HomeTeamMember {
  name: string;
  role: string;
  photoUrl: string;
}

interface HomeTeamSection {
  eyebrow: string;
  title: string;
  body: string;
  previousLabel: string;
  nextLabel: string;
  members: HomeTeamMember[];
}

interface HomeMemorySection {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel: string;
  visual: HomeVisual;
  stats: HomeMemoryStat[];
}

interface HomeContent {
  hero: {
    titlePrimary: string;
    titleSecondary: string;
    region: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    visual: HomeVisual;
  };
  shortcuts: HomeShortcut[];
  about: HomeAboutSection;
  sections: {
    news: HomeSectionCopy;
    events: HomeSectionCopy;
  };
  fallbackNews: HomeNewsFallback[];
  fallbackEvents: HomeEventFallback[];
  team: HomeTeamSection;
  memory: HomeMemorySection;
}

interface ApiNews {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string;
  created_at: string;
}

interface ApiEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url?: string | null;
}

interface HomeNewsCard {
  title: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  dateLabel: string;
  route: string;
}

interface HomeEventCard {
  title: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  dateLabel: string;
  location: string;
  route: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoDirective, NavbarComponent, ScrollToTopComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private transloco = inject(TranslocoService);
  private http = inject(HttpClient);
  private i18nService = inject(I18nService);
  private mediaUpload = inject(MediaUploadService);

  content: HomeContent | null = null;
  newsCards: HomeNewsCard[] = [];
  eventCards: HomeEventCard[] = [];

  private apiNews: ApiNews[] = [];
  private apiEvents: ApiEvent[] = [];

  get featuredNews(): HomeNewsCard | null {
    return this.newsCards[0] ?? null;
  }

  get secondaryNews(): HomeNewsCard[] {
    return this.newsCards.slice(1, 4);
  }

  ngOnInit(): void {
    this.transloco
      .selectTranslateObject<HomeContent>('home')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((content) => {
        this.content = content;
        this.syncHomepageData();
      });

    this.loadNews();
    this.loadEvents();
  }

  trackByLabel(_: number, item: { label: string }): string {
    return item.label;
  }

  getMemberDisplayName(member: HomeTeamMember): string {
    const name = member.name?.trim();
    return name || member.role;
  }

  getMemberInitials(member: HomeTeamMember): string {
    const source = this.getMemberDisplayName(member);
    const letters = source
      .split(/\s+/)
      .slice(0, 2)
      .map((chunk) => chunk.charAt(0))
      .join('')
      .toUpperCase();

    return letters || 'AH';
  }

  scrollTeamCarousel(track: HTMLElement, direction: number): void {
    const cardWidth = track.querySelector<HTMLElement>('.team-polaroid')?.offsetWidth ?? 280;
    track.scrollBy({
      left: direction * (cardWidth + 24),
      behavior: 'smooth',
    });
  }

  private loadNews(): void {
    this.http
      .get<{ news: ApiNews[] }>(`${environment.apiUrl}/news?published=true`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.apiNews = Array.isArray(response.news) ? response.news : [];
          this.syncHomepageData();
        },
        error: () => {
          this.apiNews = [];
          this.syncHomepageData();
        },
      });
  }

  private loadEvents(): void {
    this.http
      .get<{ events: ApiEvent[] }>(`${environment.apiUrl}/events?type=upcoming`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.apiEvents = Array.isArray(response.events) ? response.events : [];
          this.syncHomepageData();
        },
        error: () => {
          this.apiEvents = [];
          this.syncHomepageData();
        },
      });
  }

  private syncHomepageData(): void {
    if (!this.content) {
      return;
    }

    this.newsCards = this.buildNewsCards();
    this.eventCards = this.buildEventCards();
  }

  private buildNewsCards(): HomeNewsCard[] {
    if (!this.content) {
      return [];
    }

    const fallbackNews = this.content.fallbackNews ?? [];
    if (this.apiNews.length === 0) {
      return fallbackNews.slice(0, 4).map((item) => ({
        title: item.title,
        body: item.body,
        imageUrl: item.imageUrl,
        imageAlt: item.imageAlt,
        dateLabel: item.dateLabel,
        route: '/actualites',
      }));
    }

    return this.apiNews.slice(0, 4).map((item, index) => {
      const fallback = fallbackNews[index % Math.max(fallbackNews.length, 1)];
      return {
        title: item.title,
        body: this.getNewsSummary(item),
        imageUrl: item.image_url || fallback?.imageUrl || this.content?.hero.visual.url || '',
        imageAlt: item.title || fallback?.imageAlt || '',
        dateLabel: this.formatDate(item.created_at),
        route: '/actualites',
      };
    });
  }

  private buildEventCards(): HomeEventCard[] {
    if (!this.content) {
      return [];
    }

    const fallbackEvents = this.content.fallbackEvents ?? [];
    if (this.apiEvents.length === 0) {
      return fallbackEvents.slice(0, 3).map((item) => ({
        title: item.title,
        body: item.body,
        imageUrl: item.imageUrl,
        imageAlt: item.imageAlt,
        dateLabel: item.dateLabel,
        location: item.location,
        route: '/evenements',
      }));
    }

    return this.apiEvents.slice(0, 3).map((item, index) => {
      const fallback = fallbackEvents[index % Math.max(fallbackEvents.length, 1)];
      return {
        title: item.title,
        body: this.truncateText(item.description, 140),
        imageUrl: this.mediaUpload.resolveMediaUrl(item.image_url) || fallback?.imageUrl || this.content?.memory.visual.url || '',
        imageAlt: fallback?.imageAlt || item.title,
        dateLabel: this.formatDate(item.event_date),
        location: item.location,
        route: '/evenements',
      };
    });
  }

  private getNewsSummary(item: ApiNews): string {
    const summary = item.excerpt || item.content || '';
    return this.truncateText(summary.replace(/<[^>]+>/g, ' '), 180);
  }

  private truncateText(value: string, maxLength: number): string {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }

    return `${cleaned.slice(0, maxLength).trim()}...`;
  }

  private formatDate(date: string): string {
    return new Intl.DateTimeFormat(this.i18nService.getDateLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  }
}
