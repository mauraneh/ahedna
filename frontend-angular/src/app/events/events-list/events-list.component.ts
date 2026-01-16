import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../../core/components/scroll-to-top/scroll-to-top.component';

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
  imports: [CommonModule, NavbarComponent, ScrollToTopComponent],
  templateUrl: './events-list.component.html',
  styleUrl: './events-list.component.scss'
})
export class EventsListComponent implements OnInit {
  private http = inject(HttpClient);
  
  events: Event[] = [];
  loading = true;
  filterType: 'upcoming' | 'past' = 'upcoming';

  particles = Array.from({ length: 12 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

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