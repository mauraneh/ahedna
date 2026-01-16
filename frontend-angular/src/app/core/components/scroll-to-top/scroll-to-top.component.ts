import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scroll-to-top',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showButton) {
      <button
        (click)="scrollToTop()"
        class="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-paper-600 to-paper-700 text-white p-4 rounded-full shadow-paper-xl hover:shadow-paper-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 group"
        aria-label="Retour en haut">
        <svg class="w-6 h-6 transform group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
        </svg>
      </button>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ScrollToTopComponent implements OnInit, OnDestroy {
  showButton = false;
  private scrollListener?: () => void;

  ngOnInit(): void {
    this.setupScrollListener();
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  setupScrollListener(): void {
    this.scrollListener = () => {
      this.checkScrollPosition();
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
    // Vérifier la position initiale
    this.checkScrollPosition();
  }

  checkScrollPosition(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    this.showButton = scrollTop > 300; // Afficher après 300px de scroll
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
