import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-membership',
  standalone: true,
  imports: [CommonModule, NavbarComponent, ScrollToTopComponent],
  templateUrl: './membership.component.html',
  styleUrl: './membership.component.scss'
})
export class MembershipComponent {
  particles = Array.from({ length: 20 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 20,
    size: 3 + Math.random() * 4,
  }));

  // Montants de dons suggérés
  donationAmounts = [10, 25, 50, 100, 250, 500];
  customAmount = '';

  // HelloAsso URL (à remplacer par votre URL réelle)
  helloAssoAdhesionUrl = 'https://www.helloasso.com/associations/ahedna/adhesions/adhesion-annuelle';
  helloAssoDonUrl = 'https://www.helloasso.com/associations/ahedna/formulaires/1';

  // Stripe (à venir)
  stripeEnabled = false;

  selectDonationAmount(amount: number): void {
    this.customAmount = amount.toString();
  }

  handleDonation(): void {
    if (!this.customAmount || parseFloat(this.customAmount) <= 0) {
      return;
    }
    
    if (this.stripeEnabled) {
      // TODO: Implémenter Stripe
      console.log('Stripe donation:', this.customAmount);
    } else {
      // Redirection vers HelloAsso avec le montant
      const url = `${this.helloAssoDonUrl}?amount=${this.customAmount}`;
      window.open(url, '_blank');
    }
  }

  handleAdhesion(): void {
    window.open(this.helloAssoAdhesionUrl, '_blank');
  }

  isValidAmount(): boolean {
    if (!this.customAmount) return false;
    const amount = parseFloat(this.customAmount);
    return !isNaN(amount) && amount > 0;
  }
}
