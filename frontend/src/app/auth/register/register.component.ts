import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../../core/components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoDirective, NavbarComponent, ScrollToTopComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);

  registerForm: FormGroup;
  loading = false;
  error = '';

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      first_name: [''],
      last_name: [''],
      want_membership: [false]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.error = '';

      this.authService.register(this.registerForm.value).subscribe({
        next: () => {
          this.loading = false;
          const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || '/profil';
          this.router.navigateByUrl(redirectTo);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.error || this.transloco.translate('auth.register.errors.default');
        }
      });
    }
  }
}
