import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';

type HistoryMediaTone = 'archive' | 'document' | 'ceremony' | 'memory';
type HistoryMediaOrientation = 'portrait' | 'landscape';

interface HistoryHighlight {
  value: string;
  label: string;
}

interface HistoryLabels {
  chapter: string;
  visual: string;
  source: string;
  photoPlaceholder: string;
  tones: Record<HistoryMediaTone, string>;
}

interface HistoryMedia {
  url: string;
  alt: string;
  caption: string;
  credit: string;
  sourceUrl?: string;
  sourceLabel?: string;
  focus: string;
  tone: HistoryMediaTone;
  orientation: HistoryMediaOrientation;
}

interface HistoryChapter {
  id: string;
  title: string;
  content: string;
  chapterOrder: number;
  yearStart: number;
  yearEnd: number;
  media: HistoryMedia[];
}

interface HistoryPageContent {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    highlights: HistoryHighlight[];
  };
  loadingLabel: string;
  emptyState: {
    title: string;
    body: string;
    ctaLabel: string;
  };
  labels: HistoryLabels;
  cta: {
    title: string;
    body: string;
    actionLabel: string;
  };
  chapters: HistoryChapter[];
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, ScrollToTopComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private transloco = inject(TranslocoService);

  content: HistoryPageContent | null = null;
  chapters: HistoryChapter[] = [];
  loading = true;
  activeChapter = 0;
  timelineProgress = 0;
  visibleChapters = new Set<number>();
  animatedChapters = new Set<number>();
  private observer?: IntersectionObserver;
  private scrollListener?: () => void;
  private animationFrameId: number | null = null;

  particles = Array.from({ length: 20 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

  ngOnInit(): void {
    this.transloco
      .selectTranslateObject<HistoryPageContent>('history')
      .pipe(
        catchError((error) => {
          console.error('Error loading history translations:', error);
          this.loading = false;
          this.content = null;
          this.chapters = [];
          this.teardownObservers();
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((historyContent) => {
        if (!historyContent || !Array.isArray(historyContent.chapters)) {
          this.loading = false;
          this.content = null;
          this.chapters = [];
          return;
        }

        this.applyHistoryContent(historyContent);
      });
  }

  ngOnDestroy(): void {
    this.teardownObservers();
  }

  isChapterVisible(chapterOrder: number): boolean {
    return this.visibleChapters.has(chapterOrder);
  }

  isChapterAnimated(chapterOrder: number): boolean {
    return this.animatedChapters.has(chapterOrder);
  }

  extractChapterId(elementId: string): number | null {
    const match = elementId.match(/chapter-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  getPathProgress(pathIndex: number): number {
    const currentChapter = this.chapters[pathIndex];
    const nextChapter = this.chapters[pathIndex + 1];

    if (!currentChapter || !nextChapter) {
      return 0;
    }

    if (this.isChapterVisible(nextChapter.chapterOrder)) {
      return 100;
    }

    if (this.isChapterVisible(currentChapter.chapterOrder)) {
      return 50;
    }

    return 0;
  }

  scrollToChapter(order: number): void {
    const element = document.getElementById(`chapter-${order}`);
    if (!element) {
      return;
    }

    const offset = 120;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });

    this.activeChapter = order;
  }

  formatChapterNumber(num: number): string {
    return String(num).padStart(2, '0');
  }

  getChapterPeriod(chapter: HistoryChapter): string {
    if (!chapter.yearEnd || chapter.yearEnd === chapter.yearStart) {
      return String(chapter.yearStart);
    }

    return `${chapter.yearStart} - ${chapter.yearEnd}`;
  }

  getHighlightLabel(tone: HistoryMediaTone): string {
    return this.content?.labels.tones[tone] ?? '';
  }

  getChapterMedia(chapter: HistoryChapter): HistoryMedia[] {
    return chapter.media ?? [];
  }

  private applyHistoryContent(historyContent: HistoryPageContent): void {
    this.loading = true;
    this.teardownObservers();
    this.visibleChapters = new Set<number>();
    this.animatedChapters = new Set<number>();
    this.timelineProgress = 0;
    this.activeChapter = 0;
    this.content = historyContent;
    this.chapters = [...historyContent.chapters].sort((a, b) => a.chapterOrder - b.chapterOrder);

    if (this.chapters[0]) {
      this.visibleChapters.add(this.chapters[0].chapterOrder);
      this.animatedChapters.add(this.chapters[0].chapterOrder);
      this.activeChapter = this.chapters[0].chapterOrder;
    }

    this.loading = false;

    setTimeout(() => {
      this.setupIntersectionObserver();
      this.setupScrollListener();
      this.scheduleViewportUpdate();
    }, 200);
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const chapterId = this.extractChapterId(entry.target.id);
          if (chapterId === null) {
            return;
          }

          this.visibleChapters.add(chapterId);
          setTimeout(() => {
            this.animatedChapters.add(chapterId);
          }, 200);
        });

        this.scheduleViewportUpdate();
      },
      {
        threshold: 0.18,
        rootMargin: '-12% 0px -18% 0px'
      }
    );

    this.chapters.forEach((chapter) => {
      const element = document.getElementById(`chapter-${chapter.chapterOrder}`);
      if (element) {
        this.observer?.observe(element);
      }
    });
  }

  private setupScrollListener(): void {
    this.scrollListener = () => {
      this.scheduleViewportUpdate();
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  private scheduleViewportUpdate(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.animationFrameId = window.requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.updateTimelineProgress();
      this.updateActiveChapter();
    });
  }

  private updateTimelineProgress(): void {
    if (this.chapters.length === 0) {
      return;
    }

    const firstChapter = document.getElementById(`chapter-${this.chapters[0].chapterOrder}`);
    const lastChapter = document.getElementById(`chapter-${this.chapters[this.chapters.length - 1].chapterOrder}`);

    if (!firstChapter || !lastChapter) {
      this.timelineProgress = 0;
      return;
    }

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const start = Math.max(firstChapter.offsetTop - viewportHeight * 0.48, 0);
    const end = Math.max(lastChapter.offsetTop + lastChapter.offsetHeight - viewportHeight * 0.38, start + 1);
    const rawProgress = ((scrollTop - start) / (end - start)) * 100;

    this.timelineProgress = Math.min(Math.max(rawProgress, 0), 100);
  }

  private updateActiveChapter(): void {
    const focusLine = window.innerHeight * 0.38;
    let fallbackChapter = this.chapters[0]?.chapterOrder ?? 0;

    for (let i = 0; i < this.chapters.length; i++) {
      const chapter = this.chapters[i];
      const element = document.getElementById(`chapter-${chapter.chapterOrder}`);
      if (!element) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (rect.top <= focusLine) {
        fallbackChapter = chapter.chapterOrder;
      }

      if (rect.top <= focusLine && rect.bottom >= focusLine) {
        this.activeChapter = chapter.chapterOrder;
        return;
      }
    }

    this.activeChapter = fallbackChapter;
  }

  private teardownObservers(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }

    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = undefined;
    }

    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
