import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TranslocoDirective } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../../core/components/scroll-to-top/scroll-to-top.component';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
import { MediaUploadService } from '../../core/services/media-upload.service';

interface News {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image_url?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  source_published_at?: string | null;
  published: boolean;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

type NewsTab = 'retrieved' | 'created';

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoDirective, RouterLink, NavbarComponent, ScrollToTopComponent],
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.scss'
})
export class NewsListComponent implements OnInit {
  private http = inject(HttpClient);
  private i18nService = inject(I18nService);
  private mediaUpload = inject(MediaUploadService);
  authService = inject(AuthService);
  
  newsList: News[] = [];
  loading = true;
  activeTab: NewsTab = 'retrieved';
  selectedNews: News | null = null;
  readonly newsTabs: NewsTab[] = ['retrieved', 'created'];
  keyword = '';
  dateFrom = '';
  dateTo = '';
  private hasManuallySelectedTab = false;

  particles = Array.from({ length: 12 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

  ngOnInit(): void {
    this.loadNews();
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    this.closeNewsModal();
  }

  loadNews(): void {
    this.loading = true;

    let params = new HttpParams().set('published', 'true');
    const keyword = this.keyword.trim();

    if (keyword) {
      params = params.set('q', keyword);
    }

    if (this.dateFrom) {
      params = params.set('date_from', this.dateFrom);
    }

    if (this.dateTo) {
      params = params.set('date_to', this.dateTo);
    }

    this.http.get<{ news: News[] }>(`${environment.apiUrl}/news`, { params })
      .subscribe({
        next: (response) => {
          this.newsList = Array.isArray(response.news) ? response.news : [];
          this.ensureActiveTabHasContent();
          this.loading = false;
        },
        error: () => {
          this.newsList = [];
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    this.loadNews();
  }

  resetFilters(): void {
    this.keyword = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.loadNews();
  }

  hasActiveFilters(): boolean {
    return Boolean(this.keyword.trim() || this.dateFrom || this.dateTo);
  }

  setActiveTab(tab: NewsTab): void {
    this.activeTab = tab;
    this.hasManuallySelectedTab = true;
  }

  openNewsModal(news: News): void {
    this.selectedNews = news;
  }

  closeNewsModal(): void {
    this.selectedNews = null;
  }

  get visibleNews(): News[] {
    return this.activeTab === 'retrieved' ? this.retrievedNews : this.createdNews;
  }

  get retrievedNews(): News[] {
    return this.newsList.filter((news) => this.isExternalNews(news));
  }

  get createdNews(): News[] {
    return this.newsList.filter((news) => !this.isExternalNews(news));
  }

  getTabCount(tab: NewsTab): number {
    return tab === 'retrieved' ? this.retrievedNews.length : this.createdNews.length;
  }

  getEmptyTitleKey(): string {
    if (this.hasActiveFilters()) {
      return 'news.list.empty.filteredTitle';
    }

    return this.activeTab === 'retrieved'
      ? 'news.list.empty.retrievedTitle'
      : 'news.list.empty.createdTitle';
  }

  getEmptyBodyKey(): string {
    if (this.hasActiveFilters()) {
      return 'news.list.empty.filteredBody';
    }

    return this.activeTab === 'retrieved'
      ? 'news.list.empty.retrievedBody'
      : 'news.list.empty.createdBody';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString(this.i18nService.getDateLocale());
  }

  getNewsImageUrl(news: News): string {
    return this.mediaUpload.resolveMediaUrl(news.image_url);
  }

  hasNewsImage(news: News): boolean {
    return Boolean(this.getNewsImageUrl(news));
  }

  handleNewsImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.hidden = true;
    image.closest('.news-card-media, .news-modal-media')?.classList.add('news-media-unavailable');
  }

  isExternalNews(news: News): boolean {
    return Boolean(news.source_url || news.source_name);
  }

  getNewsSourceLabel(news: News): string {
    if (news.source_name?.trim()) {
      return news.source_name.trim();
    }

    if (!news.source_url) {
      return '';
    }

    try {
      return new URL(news.source_url).hostname.replace(/^www\./, '');
    } catch {
      return news.source_url;
    }
  }

  getNewsDisplayDate(news: News): string {
    return news.source_published_at || news.created_at;
  }

  getNewsParagraphs(news: News): string[] {
    const sourceUrl = news.source_url?.trim();
    const content = (news.content || news.excerpt || '').trim();

    return content
      .split(/\n{2,}|\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph && paragraph !== sourceUrl);
  }

  getNewsModalTypeKey(news: News): string {
    return this.isExternalNews(news)
      ? 'news.list.tabs.retrieved.label'
      : 'news.list.tabs.created.label';
  }

  private ensureActiveTabHasContent(): void {
    if (
      this.hasManuallySelectedTab ||
      this.getTabCount(this.activeTab) > 0 ||
      this.newsList.length === 0
    ) {
      return;
    }

    this.activeTab = this.activeTab === 'retrieved' ? 'created' : 'retrieved';
  }

}
