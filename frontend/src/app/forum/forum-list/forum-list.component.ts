import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';
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
  imports: [CommonModule, ReactiveFormsModule, TranslocoDirective, RouterLink, NavbarComponent, ScrollToTopComponent],
  templateUrl: './forum-list.component.html',
  styleUrl: './forum-list.component.scss'
})
export class ForumListComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private transloco = inject(TranslocoService);
  private i18nService = inject(I18nService);
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

  async ngOnInit(): Promise<void> {
    await this.authService.ensureLoaded();

    if (!this.authService.isAuthenticated()) {
      this.loading = false;
      return;
    }

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
            this.createSuccess = this.transloco.translate('forum.list.messages.createSuccess');
            this.createForm.reset();
            this.loadTopics();
            setTimeout(() => {
              this.showCreateForm = false;
              this.createSuccess = '';
            }, 3000);
          },
          error: (err) => {
            this.creating = false;
            this.createError = err.error?.error || this.transloco.translate('forum.list.messages.createError');
          }
        });
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString(this.i18nService.getDateLocale());
  }

  get totalResponses(): number {
    return this.topics.reduce((sum, topic) => sum + topic.message_count, 0);
  }

  getAuthorInitials(topic: Topic): string {
    const initials = [topic.first_name?.charAt(0), topic.last_name?.charAt(0)]
      .filter(Boolean)
      .join('')
      .toUpperCase();

    return initials || this.transloco.translate('forum.list.topic.fallbackInitial');
  }
}
