import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../../core/components/scroll-to-top/scroll-to-top.component';

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
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, ScrollToTopComponent],
  templateUrl: './forum-list.component.html',
  styleUrl: './forum-list.component.scss'
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

  particles = Array.from({ length: 12 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

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
            this.loadTopics();
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