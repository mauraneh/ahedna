import { Component } from '@angular/core';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [NavbarComponent, ScrollToTopComponent],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent {}
