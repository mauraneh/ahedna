import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="bg-paper-100/95 backdrop-blur-sm shadow-paper-lg sticky top-0 z-50 border-b-2 border-paper-300/60 relative overflow-hidden">
      <!-- Effet de tache d'encre subtile -->
      <div class="absolute top-0 left-1/4 w-32 h-32 bg-red-500/5 rounded-full blur-3xl"></div>
      <div class="absolute top-0 right-1/4 w-32 h-32 bg-green-500/5 rounded-full blur-3xl"></div>
      
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="flex justify-between items-center h-20">
          <div class="flex items-center space-x-4">
            <div class="flex-shrink-0">
              <a routerLink="/" class="text-2xl font-vintage font-bold text-paper-800 hover:text-paper-900 transition-colors">
                AHEDNA
              </a>
              <p class="text-xs text-paper-600 font-serif italic">Dordogne & Nouvelle-Aquitaine</p>
            </div>
          </div>
          
          <div class="hidden md:flex items-center space-x-6">
            <a 
              routerLink="/histoire" 
              routerLinkActive="active-link"
              class="text-paper-700 hover:text-paper-900 font-vintage font-medium transition-colors relative group">
              Histoire
              <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              routerLink="/actualites" 
              routerLinkActive="active-link"
              class="text-paper-700 hover:text-paper-900 font-vintage font-medium transition-colors relative group">
              Actualités
              <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-600 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              routerLink="/evenements" 
              routerLinkActive="active-link"
              class="text-paper-700 hover:text-paper-900 font-vintage font-medium transition-colors relative group">
              Événements
              <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-green-600 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              routerLink="/forum" 
              routerLinkActive="active-link"
              class="text-paper-700 hover:text-paper-900 font-vintage font-medium transition-colors relative group">
              Forum
              <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              routerLink="/galerie" 
              routerLinkActive="active-link"
              class="text-paper-700 hover:text-paper-900 font-vintage font-medium transition-colors relative group">
              Galerie
              <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-600 group-hover:w-full transition-all duration-300"></span>
            </a>
            
            @if (authService.isAuthenticated()) {
              <div class="flex items-center space-x-4 ml-4 pl-4 border-l-2 border-paper-300/50">
                @if (authService.hasRole(['admin'])) {
                  <a 
                    routerLink="/admin" 
                    routerLinkActive="active-link"
                    class="text-paper-600 hover:text-paper-800 font-vintage font-medium transition-colors relative group">
                    Admin
                    <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-green-600 group-hover:w-full transition-all duration-300"></span>
                  </a>
                }
                <span class="text-sm text-paper-600 font-serif">{{ authService.currentUser()?.email }}</span>
                <button 
                  (click)="authService.logout()" 
                  class="bg-paper-600 text-white px-4 py-2 rounded-lg hover:bg-paper-700 transition-colors font-vintage shadow-paper text-sm">
                  Déconnexion
                </button>
              </div>
            } @else {
              <div class="flex items-center space-x-4 ml-4 pl-4 border-l-2 border-paper-300/50">
                <a 
                  routerLink="/login" 
                  class="text-paper-700 hover:text-paper-900 font-vintage font-medium transition-colors">
                  Connexion
                </a>
                <a 
                  routerLink="/register" 
                  class="bg-paper-600 text-white px-6 py-2 rounded-lg hover:bg-paper-700 transition-all shadow-paper font-vintage font-bold text-sm whitespace-nowrap">
                  S'inscrire
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .active-link {
      color: #7A6A52;
      font-weight: 600;
    }
    .active-link::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(to right, #DC2626, #16A34A);
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);
}