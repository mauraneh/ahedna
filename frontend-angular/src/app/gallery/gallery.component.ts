import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';

interface Photo {
  id: string;
  photo_url: string;
  description: string;
  first_name: string;
  last_name: string;
  validated: boolean;
  created_at: string;
}

@Component({
  selector: 'app-gallery',
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
        <div class="text-center mb-12">
          <h1 class="text-5xl font-extrabold text-gray-900 mb-4">Galerie Photos</h1>
          <p class="text-xl text-gray-600">Souvenirs et moments partagés</p>
        </div>

        @if (loading) {
          <div class="text-center py-20">
            <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          </div>
        } @else if (photos.length === 0) {
          <div class="text-center py-20 bg-amber-50 rounded-2xl">
            <div class="text-6xl mb-4">🖼️</div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Aucune photo pour le moment</h3>
            <p class="text-gray-600">La galerie sera bientôt remplie de souvenirs.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            @for (photo of photos; track photo.id) {
              <div class="group relative bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-2">
                <div class="aspect-square overflow-hidden">
                  <img [src]="photo.photo_url" [alt]="photo.description" 
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300">
                </div>
                @if (photo.description) {
                  <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p class="text-white text-sm font-medium">{{ photo.description }}</p>
                    <p class="text-white/80 text-xs mt-1">Par {{ photo.first_name }} {{ photo.last_name }}</p>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class GalleryComponent implements OnInit {
  private http = inject(HttpClient);
  authService = inject(AuthService);
  
  photos: Photo[] = [];
  loading = true;

  ngOnInit(): void {
    this.http.get<{ photos: Photo[] }>(`${environment.apiUrl}/gallery?validated=true`)
      .subscribe({
        next: (response) => {
          this.photos = response.photos;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }
}
