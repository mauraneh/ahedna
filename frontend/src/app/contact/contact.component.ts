import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, NavbarComponent, ScrollToTopComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private readonly contactEmail = 'ahedna.nouvelleaquitaine@gmail.com';
  submitted = false;

  contactForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
    subject: ['', [Validators.required, Validators.maxLength(160)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
  });

  submitContact(): void {
    this.submitted = true;

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    window.location.href = this.buildMailtoUrl(this.contactForm.getRawValue());
  }

  buildMailtoUrl(value: {
    name?: string | null;
    email?: string | null;
    subject?: string | null;
    message?: string | null;
  }): string {
    const subject = encodeURIComponent(`[Contact AHEDNA] ${value.subject ?? ''}`);
    const body = encodeURIComponent(
      [
        `Nom : ${value.name ?? ''}`,
        `Email : ${value.email ?? ''}`,
        '',
        value.message ?? '',
      ].join('\n')
    );

    return `mailto:${this.contactEmail}?subject=${subject}&body=${body}`;
  }
}
