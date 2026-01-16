import { Component, OnInit, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';

interface HistoryChapter {
  id: string;
  title: string;
  content: string;
  chapter_order: number;
  year_start: number;
  year_end: number;
  media_urls: string[];
  coordinates: any;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, ScrollToTopComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  
  chapters: HistoryChapter[] = [];
  loading = true;
  activeChapter = 0;
  timelineProgress = 0;
  visibleChapters = new Set<number>();
  animatedChapters = new Set<number>();
  private observer?: IntersectionObserver;
  private scrollListener?: () => void;

  particles = Array.from({ length: 20 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

  ngOnInit(): void {
    this.loadChapters();
  }

  ngAfterViewInit(): void {
    // Les observateurs seront initialisés après le chargement des chapitres
    // pour s'assurer que les éléments DOM existent
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  loadChapters(): void {
    this.http.get<{ chapters: HistoryChapter[] }>(`${environment.apiUrl}/history/chapters`)
      .subscribe({
        next: (response) => {
          console.log('Chapters loaded:', response.chapters?.length || 0);
          this.chapters = response.chapters?.sort((a, b) => a.chapter_order - b.chapter_order) || [];
          this.loading = false;
          console.log('Loading set to false, chapters count:', this.chapters.length);
          // Initialiser les observateurs après que les chapitres soient chargés et rendus
          setTimeout(() => {
            this.setupIntersectionObserver();
            this.setupScrollListener();
            this.updateTimelineProgress();
          }, 200);
        },
        error: (err) => {
          console.error('Error loading chapters:', err);
          this.loading = false;
          this.chapters = [];
        }
      });
  }

  setupIntersectionObserver(): void {
    // Nettoyer l'observer existant s'il y en a un
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const chapterId = this.extractChapterId(entry.target.id);
            if (chapterId !== null) {
              this.visibleChapters.add(chapterId);
              setTimeout(() => {
                this.animatedChapters.add(chapterId);
              }, 200);
            }
          }
        });
        this.updateTimelineProgress();
        this.updateActiveChapter();
      },
      { 
        threshold: 0.3, 
        rootMargin: '-100px 0px -100px 0px' 
      }
    );

    // Observer tous les chapitres
    this.chapters.forEach((chapter) => {
      const element = document.getElementById(`chapter-${chapter.chapter_order}`);
      if (element) {
        this.observer!.observe(element);
      }
    });
  }

  setupScrollListener(): void {
    // Nettoyer le listener existant s'il y en a un
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
    
    this.scrollListener = () => {
      this.updateTimelineProgress();
      this.updateActiveChapter();
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  updateTimelineProgress(): void {
    if (this.chapters.length === 0) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = Math.min((scrollTop / documentHeight) * 100, 100);
    
    this.timelineProgress = scrollProgress;
  }

  updateActiveChapter(): void {
    const scrollPosition = window.scrollY + window.innerHeight / 3;
    
    for (let i = this.chapters.length - 1; i >= 0; i--) {
      const element = document.getElementById(`chapter-${this.chapters[i].chapter_order}`);
      if (element) {
        const elementTop = element.offsetTop;
        if (scrollPosition >= elementTop) {
          this.activeChapter = this.chapters[i].chapter_order;
          return;
        }
      }
    }
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
    
    if (!currentChapter || !nextChapter) return 0;
    
    if (this.isChapterVisible(nextChapter.chapter_order)) {
      return 100;
    }
    
    if (this.isChapterVisible(currentChapter.chapter_order)) {
      return 50;
    }
    
    return 0;
  }

  scrollToChapter(order: number): void {
    const element = document.getElementById(`chapter-${order}`);
    if (element) {
      const offset = 120;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      this.activeChapter = order;
    }
  }

  formatChapterNumber(num: number): string {
    return String(num).padStart(2, '0');
  }
}