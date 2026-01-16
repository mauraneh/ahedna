import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NavbarComponent, ScrollToTopComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
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
