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
  team: HomeTeamSection;
  memory: HomeMemorySection;
}

interface ApiNews {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  source_published_at?: string | null;
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
  sourceLabel?: string;
  sourceUrl?: string;
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
  authoredNewsCards: HomeNewsCard[] = [];
  pressNewsCards: HomeNewsCard[] = [];
  eventCards: HomeEventCard[] = [];

  private apiNews: ApiNews[] = [];
  private apiEvents: ApiEvent[] = [];

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
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    const scrollAmount = Math.min(track.clientWidth * 0.9, cardWidth + gap);

    track.scrollBy({
      left: direction * scrollAmount,
      behavior: 'smooth',
    });
  }

  handleMediaImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    image?.classList.add('news-img--hidden');
    image?.parentElement?.classList.add('media-fallback');
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

    this.authoredNewsCards = this.buildAuthoredNewsCards();
    this.pressNewsCards = this.buildPressNewsCards();
    this.eventCards = this.buildEventCards();
  }

  private buildAuthoredNewsCards(): HomeNewsCard[] {
    if (!this.content) {
      return [];
    }

    return this.apiNews
      .filter((item) => !this.isExternalNews(item))
      .slice(0, 3)
      .map((item) => this.buildNewsCard(item));
  }

  private buildPressNewsCards(): HomeNewsCard[] {
    if (!this.content) {
      return [];
    }

    return this.apiNews
      .filter((item) => this.isExternalNews(item))
      .slice(0, 3)
      .map((item) => this.buildNewsCard(item));
  }

  private buildNewsCard(item: ApiNews): HomeNewsCard {
    return {
      title: item.title,
      body: this.getNewsSummary(item),
      imageUrl: this.mediaUpload.resolveMediaUrl(item.image_url) || '',
      imageAlt: item.title,
      dateLabel: this.formatDate(item.source_published_at || item.created_at),
      route: '/actualites',
      sourceLabel: this.getNewsSourceLabel(item),
      sourceUrl: item.source_url || undefined,
    };
  }

  private buildEventCards(): HomeEventCard[] {
    if (!this.content) {
      return [];
    }

    if (this.apiEvents.length === 0) {
      return [];
    }

    return this.apiEvents.slice(0, 3).map((item) => ({
      title: item.title,
      body: this.truncateText(item.description, 140),
      imageUrl: this.mediaUpload.resolveMediaUrl(item.image_url) || this.content?.memory.visual.url || '',
      imageAlt: item.title,
      dateLabel: this.formatDate(item.event_date),
      location: item.location,
      route: '/evenements',
    }));
  }

  private getNewsSummary(item: ApiNews): string {
    const summary = item.excerpt || item.content || '';
    return this.truncateText(summary.replace(/<[^>]+>/g, ' '), 180);
  }

  private getNewsSourceLabel(item: ApiNews): string | undefined {
    if (item.source_name?.trim()) {
      return item.source_name.trim();
    }

    if (!item.source_url) {
      return undefined;
    }

    try {
      return new URL(item.source_url).hostname.replace(/^www\./, '');
    } catch {
      return item.source_url;
    }
  }

  private isExternalNews(item: ApiNews): boolean {
    return Boolean(item.source_url || item.source_name);
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
