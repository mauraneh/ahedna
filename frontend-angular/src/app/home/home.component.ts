import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
      <!-- Header Navigation -->
      <nav class="bg-white/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-20">
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0">
                <h1 class="text-2xl font-bold bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 bg-clip-text text-transparent">AHEDNA</h1>
                <p class="text-xs text-gray-600">Dordogne & Nouvelle-Aquitaine</p>
              </div>
            </div>
            
            <div class="hidden md:flex items-center space-x-6">
              <a routerLink="/histoire" class="text-gray-700 hover:text-red-600 font-medium transition-colors">Histoire</a>
              <a routerLink="/actualites" class="text-gray-700 hover:text-red-600 font-medium transition-colors">Actualités</a>
              <a routerLink="/evenements" class="text-gray-700 hover:text-red-600 font-medium transition-colors">Événements</a>
              <a routerLink="/forum" class="text-gray-700 hover:text-red-600 font-medium transition-colors">Forum</a>
              <a routerLink="/galerie" class="text-gray-700 hover:text-red-600 font-medium transition-colors">Galerie</a>
              
              @if (authService.isAuthenticated()) {
                <div class="flex items-center space-x-4">
                  @if (authService.hasRole(['admin'])) {
                    <a routerLink="/admin" class="text-blue-600 hover:text-blue-800 font-medium transition-colors">Admin</a>
                  }
                  <span class="text-sm text-gray-600">{{ authService.currentUser()?.email }}</span>
                  <button (click)="authService.logout()" 
                    class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    Déconnexion
                  </button>
                </div>
              } @else {
                <a routerLink="/login" class="text-gray-700 hover:text-red-600 font-medium transition-colors">Connexion</a>
                <a routerLink="/register" 
                  class="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md">
                  S'inscrire
                </a>
              }
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-red-100/30 via-yellow-100/30 to-green-100/30 animate-pulse"></div>
        <div class="max-w-7xl mx-auto relative">
          <div class="text-center space-y-8">
            <h2 class="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight">
              Association des Harkis
            </h2>
            <p class="text-2xl md:text-3xl text-gray-700 font-light">
              Dordogne et Nouvelle-Aquitaine
            </p>
            <p class="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Préserver la mémoire, transmettre l'histoire et soutenir les descendants des harkis
            </p>
            <div class="flex justify-center space-x-4 pt-8">
              <a routerLink="/histoire" 
                class="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-red-700 hover:to-red-800 transform hover:scale-105 transition-all shadow-2xl">
                Découvrir l'Histoire
              </a>
              <a routerLink="/adhesion" 
                class="bg-white text-red-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 border-2 border-red-600 transform hover:scale-105 transition-all shadow-xl">
                Devenir Adhérent
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div class="max-w-7xl mx-auto">
          <h3 class="text-4xl font-bold text-center text-gray-900 mb-16">Nos Actions</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Histoire -->
            <div class="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all">
              <div class="text-5xl mb-4">📜</div>
              <h4 class="text-2xl font-bold text-gray-900 mb-4">Histoire Interactive</h4>
              <p class="text-gray-700 mb-6">
                Découvrez l'histoire des harkis à travers une expérience immersive avec frises chronologiques et cartes interactives.
              </p>
              <a routerLink="/histoire" class="text-red-600 font-semibold hover:text-red-800 transition-colors">
                Explorer →
              </a>
            </div>

            <!-- Événements -->
            <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all">
              <div class="text-5xl mb-4">📅</div>
              <h4 class="text-2xl font-bold text-gray-900 mb-4">Événements</h4>
              <p class="text-gray-700 mb-6">
                Participez à nos cérémonies commémoratives, conférences et rencontres associatives.
              </p>
              <a routerLink="/evenements" class="text-yellow-700 font-semibold hover:text-yellow-900 transition-colors">
                Voir les événements →
              </a>
            </div>

            <!-- Communauté -->
            <div class="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all">
              <div class="text-5xl mb-4">🤝</div>
              <h4 class="text-2xl font-bold text-gray-900 mb-4">Communauté</h4>
              <p class="text-gray-700 mb-6">
                Échangez avec d'autres membres, partagez vos histoires et créez des liens.
              </p>
              <a routerLink="/forum" class="text-green-700 font-semibold hover:text-green-900 transition-colors">
                Rejoindre le forum →
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div class="max-w-4xl mx-auto text-center space-y-8">
          <h3 class="text-4xl md:text-5xl font-bold">Rejoignez-nous</h3>
          <p class="text-xl text-red-100">
            Ensemble, préservons la mémoire et soutenons notre communauté
          </p>
          @if (!authService.isAuthenticated()) {
            <a routerLink="/register" 
              class="inline-block bg-white text-red-600 px-10 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transform hover:scale-105 transition-all shadow-2xl">
              Créer un compte
            </a>
          }
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto text-center">
          <h4 class="text-2xl font-bold mb-4">AHEDNA</h4>
          <p class="text-gray-400 mb-6">
            Association des Harkis et de leurs Enfants<br>
            Dordogne et Nouvelle-Aquitaine
          </p>
          <div class="flex justify-center space-x-6 text-sm text-gray-400">
            <a href="#" class="hover:text-white transition-colors">Contact</a>
            <a href="#" class="hover:text-white transition-colors">Mentions légales</a>
            <a href="#" class="hover:text-white transition-colors">Politique de confidentialité</a>
          </div>
          <p class="text-gray-500 text-xs mt-8">© 2025 AHEDNA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  `
})
export class HomeComponent implements OnInit {
  authService = inject(AuthService);

  ngOnInit(): void {
    console.log('Home component loaded');
  }
}
