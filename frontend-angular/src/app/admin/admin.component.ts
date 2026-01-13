import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <!-- Header -->
      <nav class="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-2xl">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-3xl font-bold">Espace Administrateur</h1>
              <p class="text-blue-100 text-sm">{{ authService.currentUser()?.email }}</p>
            </div>
            <a routerLink="/" class="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-all">
              ← Retour au site
            </a>
          </div>
        </div>
      </nav>

      <!-- Content -->
      <div class="max-w-7xl mx-auto px-4 py-12">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div class="bg-white rounded-2xl shadow-xl p-6">
            <div class="text-4xl mb-2">👥</div>
            <div class="text-3xl font-bold text-gray-900">{{ stats.users }}</div>
            <div class="text-sm text-gray-600">Utilisateurs</div>
          </div>
          <div class="bg-white rounded-2xl shadow-xl p-6">
            <div class="text-4xl mb-2">📰</div>
            <div class="text-3xl font-bold text-gray-900">{{ stats.news }}</div>
            <div class="text-sm text-gray-600">Actualités</div>
          </div>
          <div class="bg-white rounded-2xl shadow-xl p-6">
            <div class="text-4xl mb-2">📅</div>
            <div class="text-3xl font-bold text-gray-900">{{ stats.events }}</div>
            <div class="text-sm text-gray-600">Événements</div>
          </div>
          <div class="bg-white rounded-2xl shadow-xl p-6">
            <div class="text-4xl mb-2">💬</div>
            <div class="text-3xl font-bold text-gray-900">{{ stats.topics }}</div>
            <div class="text-sm text-gray-600">Sujets forum</div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div class="flex border-b border-gray-200">
            @for (tab of tabs; track tab.id) {
              <button 
                (click)="activeTab = tab.id"
                [class.bg-blue-600]="activeTab === tab.id"
                [class.text-white]="activeTab === tab.id"
                [class.text-gray-700]="activeTab !== tab.id"
                class="flex-1 px-6 py-4 font-semibold hover:bg-blue-50 transition-colors">
                {{ tab.label }}
              </button>
            }
          </div>

          <div class="p-8">
            <!-- Users Tab -->
            @if (activeTab === 'users') {
              <div>
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Gestion des utilisateurs</h2>
                @if (loadingUsers) {
                  <div class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
                  </div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        @for (user of users; track user.id) {
                          <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ user.email }}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ user.first_name }} {{ user.last_name }}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                              <select 
                                [value]="user.role"
                                (change)="updateUserRole(user.id, $event)"
                                class="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                                <option value="membre">Membre</option>
                                <option value="auteur">Auteur</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                              <span class="text-gray-500">{{ formatDate(user.created_at) }}</span>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            }

            <!-- Forum Moderation Tab -->
            @if (activeTab === 'forum') {
              <div>
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Modération du forum</h2>
                @if (loadingTopics) {
                  <div class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
                  </div>
                } @else if (pendingTopics.length === 0) {
                  <div class="text-center py-12 bg-green-50 rounded-xl">
                    <div class="text-5xl mb-3">✅</div>
                    <p class="text-gray-600">Aucun sujet en attente de validation</p>
                  </div>
                } @else {
                  <div class="space-y-4">
                    @for (topic of pendingTopics; track topic.id) {
                      <div class="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <h3 class="text-xl font-bold text-gray-900 mb-2">{{ topic.title }}</h3>
                        <p class="text-gray-700 mb-4">{{ topic.content }}</p>
                        <div class="flex items-center justify-between">
                          <span class="text-sm text-gray-500">Par {{ topic.first_name }} {{ topic.last_name }}</span>
                          <div class="space-x-3">
                            <button 
                              (click)="validateTopic(topic.id, true)"
                              class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                              ✓ Valider
                            </button>
                            <button 
                              (click)="deleteTopic(topic.id)"
                              class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
                              ✗ Refuser
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- Gallery Moderation Tab -->
            @if (activeTab === 'gallery') {
              <div>
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Modération de la galerie</h2>
                @if (loadingPhotos) {
                  <div class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
                  </div>
                } @else if (pendingPhotos.length === 0) {
                  <div class="text-center py-12 bg-green-50 rounded-xl">
                    <div class="text-5xl mb-3">✅</div>
                    <p class="text-gray-600">Aucune photo en attente de validation</p>
                  </div>
                } @else {
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    @for (photo of pendingPhotos; track photo.id) {
                      <div class="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                        <img [src]="photo.photo_url" [alt]="photo.description" class="w-full h-48 object-cover">
                        <div class="p-4">
                          <p class="text-sm text-gray-700 mb-2">{{ photo.description }}</p>
                          <p class="text-xs text-gray-500 mb-4">Par {{ photo.first_name }} {{ photo.last_name }}</p>
                          <div class="flex space-x-2">
                            <button 
                              (click)="validatePhoto(photo.id, true)"
                              class="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                              ✓ Valider
                            </button>
                            <button 
                              (click)="deletePhoto(photo.id)"
                              class="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
                              ✗ Refuser
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- Events Tab -->
            @if (activeTab === 'events') {
              <div>
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Gestion des événements</h2>
                <p class="text-gray-600 mb-4">Fonctionnalité de création d'événements à venir</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  private http = inject(HttpClient);
  authService = inject(AuthService);

  activeTab = 'users';
  tabs = [
    { id: 'users', label: 'Utilisateurs' },
    { id: 'forum', label: 'Forum' },
    { id: 'gallery', label: 'Galerie' },
    { id: 'events', label: 'Événements' }
  ];

  stats = { users: 0, news: 0, events: 0, topics: 0 };
  
  users: any[] = [];
  loadingUsers = true;
  
  pendingTopics: any[] = [];
  loadingTopics = true;
  
  pendingPhotos: any[] = [];
  loadingPhotos = true;

  ngOnInit(): void {
    this.loadUsers();
    this.loadPendingTopics();
    this.loadPendingPhotos();
    this.loadStats();
  }

  loadStats(): void {
    // Load basic stats
    this.http.get<any>(`${environment.apiUrl}/users`).subscribe({
      next: (res) => this.stats.users = res.users?.length || 0
    });
  }

  loadUsers(): void {
    this.http.get<{ users: any[] }>(`${environment.apiUrl}/users`)
      .subscribe({
        next: (response) => {
          this.users = response.users;
          this.loadingUsers = false;
        },
        error: () => {
          this.loadingUsers = false;
        }
      });
  }

  loadPendingTopics(): void {
    this.http.get<{ topics: any[] }>(`${environment.apiUrl}/forum/topics`)
      .subscribe({
        next: (response) => {
          this.pendingTopics = response.topics.filter(t => !t.validated);
          this.loadingTopics = false;
        },
        error: () => {
          this.loadingTopics = false;
        }
      });
  }

  loadPendingPhotos(): void {
    this.http.get<{ photos: any[] }>(`${environment.apiUrl}/gallery`)
      .subscribe({
        next: (response) => {
          this.pendingPhotos = response.photos.filter(p => !p.validated);
          this.loadingPhotos = false;
        },
        error: () => {
          this.loadingPhotos = false;
        }
      });
  }

  updateUserRole(userId: string, event: any): void {
    const newRole = event.target.value;
    this.http.put(`${environment.apiUrl}/users/${userId}/role`, { role: newRole })
      .subscribe({
        next: () => {
          alert('Rôle mis à jour avec succès');
        },
        error: () => {
          alert('Erreur lors de la mise à jour du rôle');
        }
      });
  }

  validateTopic(topicId: string, validated: boolean): void {
    this.http.put(`${environment.apiUrl}/forum/topics/${topicId}/validate`, { validated })
      .subscribe({
        next: () => {
          this.loadPendingTopics();
        },
        error: () => {
          alert('Erreur lors de la validation');
        }
      });
  }

  deleteTopic(topicId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce sujet ?')) {
      this.http.delete(`${environment.apiUrl}/forum/topics/${topicId}`)
        .subscribe({
          next: () => {
            this.loadPendingTopics();
          },
          error: () => {
            alert('Erreur lors de la suppression');
          }
        });
    }
  }

  validatePhoto(photoId: string, validated: boolean): void {
    this.http.put(`${environment.apiUrl}/gallery/${photoId}/validate`, { validated })
      .subscribe({
        next: () => {
          this.loadPendingPhotos();
        },
        error: () => {
          alert('Erreur lors de la validation');
        }
      });
  }

  deletePhoto(photoId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      this.http.delete(`${environment.apiUrl}/gallery/${photoId}`)
        .subscribe({
          next: () => {
            this.loadPendingPhotos();
          },
          error: () => {
            alert('Erreur lors de la suppression');
          }
        });
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }
}
