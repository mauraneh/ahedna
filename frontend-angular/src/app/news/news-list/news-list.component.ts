import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';

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
  imports: [CommonModule, NavbarComponent],
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.scss'
})
export class NewsListComponent implements OnInit {
  private http = inject(HttpClient);
  
  newsList: News[] = [];
  loading = true;

  particles = Array.from({ length: 12 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

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
