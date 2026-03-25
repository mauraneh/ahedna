import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from './core/services/i18n.service';
import { SiteFooterComponent } from './core/components/site-footer/site-footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SiteFooterComponent],
  template: `
    <router-outlet />
    <app-site-footer />
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class App {
  private i18nService = inject(I18nService);

  constructor() {
    this.i18nService.init();
  }
}
