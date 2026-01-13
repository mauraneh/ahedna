import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  type: 'upcoming' | 'past';
}

@Component({
  selector: 'app-events-list',
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
        <h1 class="text-5xl font-extrabold text-gray-900 mb-4 text-center">Événements</h1>
        <p class="text-xl text-gray-600 text-center mb-12">Cérémonies, rencontres et moments de partage</p>

        <!-- Tabs -->
        <div class="flex justify-center space-x-4 mb-12">
          <button 
            (click)="filterType = 'upcoming'; loadEvents()"
            [class.bg-red-600]="filterType === 'upcoming'"
            [class.text-white]="filterType === 'upcoming'"
            [class.bg-white]="filterType !== 'upcoming'"
            class="px-8 py-3 rounded-xl font-semibold border-2 border-red-600 transition-all">
            À venir
          </button>
          <button 
            (click)="filterType = 'past'; loadEvents()"
            [class.bg-red-600]="filterType === 'past'"
            [class.text-white]="filterType === 'past'"
            [class.bg-white]="filterType !== 'past'"
            class="px-8 py-3 rounded-xl font-semibold border-2 border-red-600 transition-all">
            Passés
          </button>
        </div>

        @if (loading) {
          <div class="text-center py-20">
            <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
          </div>
        } @else if (events.length === 0) {
          <div class="text-center py-20 bg-amber-50 rounded-2xl">
            <div class="text-6xl mb-4">📅</div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Aucun événement {{ filterType === 'upcoming' ? 'à venir' : 'passé' }}</h3>
          </div>
        } @else {
          <div class="space-y-6">
            @for (event of events; track event.id) {
              <article class="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all">
                <div class="flex items-start space-x-6">
                  <div class="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                    <div class="text-3xl font-bold">{{ getDay(event.event_date) }}</div>
                    <div class="text-sm uppercase">{{ getMonth(event.event_date) }}</div>
                  </div>
                  <div class="flex-1">
                    <h2 class="text-3xl font-bold text-gray-900 mb-2">{{ event.title }}</h2>
                    @if (event.location) {
                      <p class="text-red-600 font-medium mb-3">📍 {{ event.location }}</p>
                    }
                    <p class="text-gray-700 leading-relaxed">{{ event.description }}</p>
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
export class EventsListComponent implements OnInit {
  private http = inject(HttpClient);
  
  events: Event[] = [];
  loading = true;
  filterType: 'upcoming' | 'past' = 'upcoming';

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
    const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
    return months[new Date(date).getMonth()];
  }
}
