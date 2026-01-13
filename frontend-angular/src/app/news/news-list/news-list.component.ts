import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface News {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string;
  published: boolean;
  first_name: string;
  last_name: string;
  created_at: string;
}

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <nav class="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <a routerLink="/" class="text-2xl font-bold bg-gradient-to-r from-red-600 to-green-600 bg-clip-text text-transparent">
            ← AHEDNA
          </a>
        </div>
      </nav>

      <div class="max-w-7xl mx-auto px-4 py-12">
        <h1 class="text-5xl font-extrabold text-gray-900 mb-12 text-center">Actualités</h1>

        @if (loading) {
          <div class="text-center py-20">
            <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
          </div>
        } @else if (newsList.length === 0) {
          <div class="text-center py-20 bg-amber-50 rounded-2xl">
            <div class="text-6xl mb-4">📰</div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Aucune actualité pour le moment</h3>
            <p class="text-gray-600">Revenez bientôt pour découvrir nos dernières nouvelles.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (news of newsList; track news.id) {
              <article class="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-2">
                @if (news.image_url) {
                  <img [src]="news.image_url" [alt]="news.title" class="w-full h-48 object-cover">
                } @else {
                  <div class="w-full h-48 bg-gradient-to-br from-red-400 to-yellow-400 flex items-center justify-center">
                    <span class="text-6xl">📰</span>
                  </div>
                }
                <div class="p-6">
                  <h2 class="text-2xl font-bold text-gray-900 mb-3 line-clamp-2">{{ news.title }}</h2>
                  <p class="text-gray-600 mb-4 line-clamp-3">{{ news.excerpt || news.content }}</p>
                  <div class="flex justify-between items-center text-sm text-gray-500">
                    <span>Par {{ news.first_name }} {{ news.last_name }}</span>
                    <span>{{ formatDate(news.created_at) }}</span>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class NewsListComponent implements OnInit {
  private http = inject(HttpClient);
  
  newsList: News[] = [];
  loading = true;

  ngOnInit(): void {
    this.http.get<{ news: News[] }>(`${environment.apiUrl}/news?published=true`)
      .subscribe({
        next: (response) => {
          this.newsList = response.news;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }
}
