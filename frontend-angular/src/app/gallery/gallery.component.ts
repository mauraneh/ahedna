import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { NavbarComponent } from '../core/components/navbar/navbar.component';

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
  imports: [CommonModule, NavbarComponent],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements OnInit {
  private http = inject(HttpClient);
  authService = inject(AuthService);
  
  photos: Photo[] = [];
  loading = true;

  particles = Array.from({ length: 12 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

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
