import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
    data: {
      seo: {
        title: 'AHEDNA - Mémoire, entraide et transmission harki',
        description:
          "Association harki en Dordogne et Nouvelle-Aquitaine : histoire, entraide, actualités, événements, forum et adhésion.",
      },
    },
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
    data: {
      seo: {
        title: 'Connexion - AHEDNA',
        description: "Connexion à l'espace membre AHEDNA.",
        robots: 'noindex, nofollow',
      },
    },
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then((m) => m.RegisterComponent),
    data: {
      seo: {
        title: 'Inscription - AHEDNA',
        description: "Création d'un compte membre AHEDNA.",
        robots: 'noindex, nofollow',
      },
    },
  },
  {
    path: 'histoire',
    loadComponent: () => import('./history/history.component').then((m) => m.HistoryComponent),
    data: {
      seo: {
        title: 'Histoire des harkis - AHEDNA',
        description:
          "Comprendre l'histoire des harkis, la transmission familiale et le travail de mémoire porté par AHEDNA.",
      },
    },
  },
  {
    path: 'profil',
    loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
    data: {
      seo: {
        title: 'Mon profil - AHEDNA',
        description: "Espace personnel des membres AHEDNA.",
        robots: 'noindex, nofollow',
      },
    },
  },
  {
    path: 'contenu',
    loadComponent: () =>
      import('./content-management/content-management.component').then(
        (m) => m.ContentManagementComponent,
    ),
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['auteur', 'admin'],
      seo: {
        title: 'Gestion des contenus - AHEDNA',
        description: "Interface de gestion des actualités, événements et albums AHEDNA.",
        robots: 'noindex, nofollow',
      },
    },
  },
  {
    path: 'actualites',
    loadComponent: () => import('./news/news-list/news-list.component').then((m) => m.NewsListComponent),
    data: {
      seo: {
        title: 'Actualités - AHEDNA',
        description:
          "Actualités de l'association AHEDNA, actions de mémoire, informations membres et vie associative.",
      },
    },
  },
  {
    path: 'evenements',
    loadComponent: () =>
      import('./events/events-list/events-list.component').then((m) => m.EventsListComponent),
    data: {
      seo: {
        title: 'Événements - AHEDNA',
        description:
          "Agenda des commémorations, rencontres, ateliers et temps forts organisés par AHEDNA.",
      },
    },
  },
  {
    path: 'forum',
    loadComponent: () => import('./forum/forum-list/forum-list.component').then((m) => m.ForumListComponent),
    data: {
      seo: {
        title: 'Forum - AHEDNA',
        description:
          "Forum AHEDNA pour partager témoignages, questions et échanges autour de l'histoire harki.",
      },
    },
  },
  {
    path: 'galerie',
    loadComponent: () => import('./gallery/gallery.component').then((m) => m.GalleryComponent),
    data: {
      seo: {
        title: 'Galerie - AHEDNA',
        description:
          "Photos des événements AHEDNA et albums validés par l'association.",
      },
    },
  },
  {
    path: 'adhesion',
    loadComponent: () => import('./membership/membership.component').then((m) => m.MembershipComponent),
    data: {
      seo: {
        title: 'Adhésion - AHEDNA',
        description:
          "Adhérer à AHEDNA via HelloAsso pour soutenir la mémoire, l'entraide et les actions de l'association.",
      },
    },
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact/contact.component').then((m) => m.ContactComponent),
    data: {
      seo: {
        title: 'Contact - AHEDNA',
        description:
          "Contacter AHEDNA pour une question, un témoignage, une adhésion ou une action autour de la mémoire harki.",
      },
    },
  },
  {
    path: 'mentions-legales',
    loadComponent: () => import('./legal-notice/legal-notice.component').then((m) => m.LegalNoticeComponent),
    data: {
      seo: {
        title: 'Mentions légales - AHEDNA',
        description:
          "Mentions légales du site AHEDNA : éditeur, publication, hébergement, propriété intellectuelle et signalement.",
      },
    },
  },
  {
    path: 'politique-confidentialite',
    loadComponent: () =>
      import('./privacy-policy/privacy-policy.component').then((m) => m.PrivacyPolicyComponent),
    data: {
      seo: {
        title: 'Politique de confidentialité - AHEDNA',
        description:
          "Politique de confidentialité AHEDNA : données personnelles, finalités, sécurité, conservation et droits RGPD.",
      },
    },
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['admin'],
      seo: {
        title: 'Administration - AHEDNA',
        description: "Tableau de bord administrateur AHEDNA.",
        robots: 'noindex, nofollow',
      },
    },
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found.component').then((m) => m.NotFoundComponent),
    data: {
      seo: {
        title: 'Page introuvable - AHEDNA',
        description: "La page demandée n'existe pas ou plus sur le site AHEDNA.",
        robots: 'noindex, nofollow',
      },
    },
  },
];
