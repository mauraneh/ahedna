import { Component } from '@angular/core';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-legal-notice',
  standalone: true,
  imports: [NavbarComponent, ScrollToTopComponent],
  templateUrl: './legal-notice.component.html',
  styleUrl: './legal-notice.component.scss',
})
export class LegalNoticeComponent {}
