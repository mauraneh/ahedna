import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../../core/components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoDirective, NavbarComponent, ScrollToTopComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);

  loginForm: FormGroup;
  loading = false;
  error = '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.error = '';
      const { email, password } = this.loginForm.value;

      this.authService.login(email, password).subscribe({
        next: () => {
          this.loading = false;
          const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || '/';
          this.router.navigateByUrl(redirectTo);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.error || this.transloco.translate('auth.login.errors.default');
        }
      });
    }
  }
}
