import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface Topic {
  id: string;
  title: string;
  content: string;
  validated: boolean;
  first_name: string;
  last_name: string;
  message_count: number;
  created_at: string;
}

@Component({
  selector: 'app-forum-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
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
        <div class="flex justify-between items-center mb-12">
          <div>
            <h1 class="text-5xl font-extrabold text-gray-900 mb-2">Forum</h1>
            <p class="text-xl text-gray-600">Échangez avec la communauté</p>
          </div>
          <button 
            (click)="showCreateForm = !showCreateForm"
            class="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg">
            {{ showCreateForm ? 'Annuler' : '+ Nouveau sujet' }}
          </button>
        </div>

        <!-- Create Topic Form -->
        @if (showCreateForm) {
          <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h3 class="text-2xl font-bold text-gray-900 mb-6">Créer un nouveau sujet</h3>
            <form [formGroup]="createForm" (ngSubmit)="onCreateTopic()" class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                <input formControlName="title" type="text" 
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea formControlName="content" rows="6"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"></textarea>
              </div>
              @if (createError) {
                <div class="bg-red-50 text-red-800 p-4 rounded-lg">{{ createError }}</div>
              }
              @if (createSuccess) {
                <div class="bg-green-50 text-green-800 p-4 rounded-lg">{{ createSuccess }}</div>
              }
              <button type="submit" [disabled]="!createForm.valid || creating"
                class="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-all">
                {{ creating ? 'Création...' : 'Publier' }}
              </button>
            </form>
          </div>
        }

        <!-- Topics List -->
        @if (loading) {
          <div class="text-center py-20">
            <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-600"></div>
          </div>
        } @else if (topics.length === 0) {
          <div class="text-center py-20 bg-amber-50 rounded-2xl">
            <div class="text-6xl mb-4">💬</div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Aucun sujet pour le moment</h3>
            <p class="text-gray-600">Soyez le premier à lancer une discussion !</p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (topic of topics; track topic.id) {
              <article class="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div class="flex items-start space-x-4">
                  <div class="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    {{ topic.first_name?.charAt(0) || 'U' }}
                  </div>
                  <div class="flex-1">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ topic.title }}</h2>
                    <p class="text-gray-700 mb-3 line-clamp-2">{{ topic.content }}</p>
                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Par {{ topic.first_name }} {{ topic.last_name }}</span>
                      <span>•</span>
                      <span>{{ topic.message_count }} réponse(s)</span>
                      <span>•</span>
                      <span>{{ formatDate(topic.created_at) }}</span>
                      @if (!topic.validated) {
                        <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                          En attente de validation
                        </span>
                      }
                    </div>
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
export class ForumListComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);
  
  topics: Topic[] = [];
  loading = true;
  showCreateForm = false;
  creating = false;
  createError = '';
  createSuccess = '';
  createForm: FormGroup;

  constructor() {
    this.createForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadTopics();
  }

  loadTopics(): void {
    this.http.get<{ topics: Topic[] }>(`${environment.apiUrl}/forum/topics?validated=true`)
      .subscribe({
        next: (response) => {
          this.topics = response.topics;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  onCreateTopic(): void {
    if (this.createForm.valid) {
      this.creating = true;
      this.createError = '';
      this.createSuccess = '';

      this.http.post(`${environment.apiUrl}/forum/topics`, this.createForm.value)
        .subscribe({
          next: () => {
            this.creating = false;
            this.createSuccess = 'Sujet créé ! Il sera visible après validation par un administrateur.';
            this.createForm.reset();
            setTimeout(() => {
              this.showCreateForm = false;
              this.createSuccess = '';
            }, 3000);
          },
          error: (err) => {
            this.creating = false;
            this.createError = err.error?.error || 'Erreur lors de la création';
          }
        });
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }
}
