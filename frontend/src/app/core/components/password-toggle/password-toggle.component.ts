import { Component, Input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-password-toggle',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <button type="button" (click)="toggle()"
        [attr.aria-label]="t(input.type === 'password' ? 'auth.password.show' : 'auth.password.hide')"
        [attr.aria-controls]="input.id || null"
        [attr.title]="t(input.type === 'password' ? 'auth.password.show' : 'auth.password.hide')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          @if (input.type === 'text') { <path d="m3 3 18 18" /> }
        </svg>
      </button>
    </ng-container>
  `,
  styles: `
    :host { position: absolute; inset-inline-end: 0.25rem; top: 50%; transform: translateY(-50%); }
    button { display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border: 0;
      border-radius: 0.4rem; background: transparent; color: var(--site-ink, #34261a); cursor: pointer; }
    button:hover { background: rgba(23, 107, 115, 0.1); }
    button:focus-visible { outline: 2px solid #176b73; outline-offset: -2px; }
    svg { width: 1.35rem; height: 1.35rem; }
  `,
})
export class PasswordToggleComponent {
  @Input({ required: true }) input!: HTMLInputElement;

  toggle(): void {
    this.input.type = this.input.type === 'password' ? 'text' : 'password';
  }
}
