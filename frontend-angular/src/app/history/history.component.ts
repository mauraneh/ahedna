import { Component, OnInit, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';

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
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <!-- Header -->
      <nav class="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <a routerLink="/" class="text-2xl font-bold bg-gradient-to-r from-red-600 to-green-600 bg-clip-text text-transparent">
            ← AHEDNA
          </a>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="relative py-20 px-4 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-red-100/20 via-yellow-100/20 to-green-100/20"></div>
        <div class="max-w-7xl mx-auto relative text-center">
          <h1 class="text-6xl font-extrabold text-gray-900 mb-6">
            Histoire des Harkis
          </h1>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Un voyage immersif à travers l'histoire des harkis, de leur engagement pendant la guerre d'Algérie jusqu'à aujourd'hui
          </p>
        </div>
      </section>

      <!-- Timeline Navigation -->
      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="flex justify-center space-x-4 overflow-x-auto pb-4">
          @for (chapter of chapters; track chapter.id) {
            <button 
              (click)="scrollToChapter(chapter.chapter_order)"
              class="px-6 py-3 rounded-lg bg-white border-2 border-red-200 hover:border-red-500 hover:bg-red-50 transition-all whitespace-nowrap font-medium text-sm">
              {{ chapter.year_start }}@if(chapter.year_end && chapter.year_end !== chapter.year_start){ - {{ chapter.year_end }}}
            </button>
          }
        </div>
      </div>

      <!-- Chapters Content -->
      <section class="max-w-5xl mx-auto px-4 py-12 space-y-24">
        @if (loading) {
          <div class="text-center py-20">
            <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
            <p class="mt-4 text-gray-600">Chargement de l'histoire...</p>
          </div>
        } @else if (chapters.length === 0) {
          <div class="text-center py-20 bg-amber-50 rounded-2xl">
            <div class="text-6xl mb-4">📚</div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Histoire à venir</h3>
            <p class="text-gray-600">
              Le contenu historique sera bientôt disponible.<br>
              En attendant, explorez nos autres sections.
            </p>
            <a routerLink="/" class="inline-block mt-8 bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors">
              Retour à l'accueil
            </a>
          </div>
        }

        @for (chapter of chapters; track chapter.id; let i = $index) {
          <article 
            [id]="'chapter-' + chapter.chapter_order"
            class="relative scroll-mt-32 opacity-0 translate-y-8 transition-all duration-700"
            [class.opacity-100]="true"
            [class.translate-y-0]="true">
            
            <!-- Chapter Header -->
            <div class="flex items-center space-x-4 mb-8">
              <div class="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-xl">
                {{ i + 1 }}
              </div>
              <div class="flex-1">
                <div class="text-sm font-semibold text-red-600 mb-1">
                  {{ chapter.year_start }}@if(chapter.year_end && chapter.year_end !== chapter.year_start){ - {{ chapter.year_end }}}
                </div>
                <h2 class="text-4xl font-bold text-gray-900">{{ chapter.title }}</h2>
              </div>
            </div>

            <!-- Content Card -->
            <div class="bg-white rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-100 hover:shadow-3xl transition-shadow">
              <div class="prose prose-lg max-w-none">
                <p class="text-gray-700 leading-relaxed whitespace-pre-line">{{ chapter.content }}</p>
              </div>

              <!-- Media Gallery -->
              @if (chapter.media_urls && chapter.media_urls.length > 0) {
                <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (media of chapter.media_urls; track media) {
                    <div class="rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
                      <img [src]="media" [alt]="chapter.title" class="w-full h-64 object-cover">
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Connector Line -->
            @if (i < chapters.length - 1) {
              <div class="absolute left-10 top-24 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-300 -z-10"></div>
            }
          </article>
        }
      </section>

      <!-- CTA Section -->
      <section class="py-20 px-4 bg-gradient-to-r from-red-600 to-red-800 text-white mt-24">
        <div class="max-w-4xl mx-auto text-center space-y-8">
          <h3 class="text-4xl font-bold">Préservons cette mémoire ensemble</h3>
          <p class="text-xl text-red-100">
            Rejoignez notre communauté pour partager vos témoignages et contribuer à la mémoire collective
          </p>
          <a routerLink="/register" 
            class="inline-block bg-white text-red-600 px-10 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transform hover:scale-105 transition-all shadow-2xl">
            Rejoindre AHEDNA
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    article {
      animation: fadeInUp 0.8s ease-out forwards;
    }

    article:nth-child(1) { animation-delay: 0.1s; }
    article:nth-child(2) { animation-delay: 0.2s; }
    article:nth-child(3) { animation-delay: 0.3s; }
    article:nth-child(4) { animation-delay: 0.4s; }
    article:nth-child(5) { animation-delay: 0.5s; }
  `]
})
export class HistoryComponent implements OnInit {
  private http = inject(HttpClient);
  
  chapters: HistoryChapter[] = [];
  loading = true;

  ngOnInit(): void {
    this.loadChapters();
  }

  loadChapters(): void {
    this.http.get<{ chapters: HistoryChapter[] }>(`${environment.apiUrl}/history/chapters`)
      .subscribe({
        next: (response) => {
          this.chapters = response.chapters;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading chapters:', err);
          this.loading = false;
        }
      });
  }

  scrollToChapter(order: number): void {
    const element = document.getElementById(`chapter-${order}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
