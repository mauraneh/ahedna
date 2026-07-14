import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-membership',
  standalone: true,
  imports: [CommonModule, TranslocoDirective, NavbarComponent, ScrollToTopComponent],
  templateUrl: './membership.component.html',
  styleUrl: './membership.component.scss'
})
export class MembershipComponent {
  donationAmounts = [10, 25, 50, 100, 250, 500];
  customAmount = '';

  helloAssoAdhesionUrl =
    'https://www.helloasso.com/associations/association-harkis-et-leurs-enfants-de-dordogne-et-nouvelle-aquitaine/adhesions/ahedna';
  helloAssoDonUrl = this.helloAssoAdhesionUrl;

  stripeEnabled = false;

  selectDonationAmount(amount: number): void {
    this.customAmount = amount.toString();
  }

  handleDonation(): void {
    if (!this.customAmount || parseFloat(this.customAmount) <= 0) {
      return;
    }

    if (this.stripeEnabled) {
      return;
    }

    window.open(this.helloAssoDonUrl, '_blank', 'noopener');
  }

  handleAdhesion(): void {
    window.open(this.helloAssoAdhesionUrl, '_blank', 'noopener');
  }

  isValidAmount(): boolean {
    if (!this.customAmount) return false;
    const amount = parseFloat(this.customAmount);
    return !isNaN(amount) && amount > 0;
  }
}
