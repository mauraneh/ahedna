import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
    data: {
      seo: {
        title: 'AHEDNA - Memoire, entraide et transmission harki',
        description:
          "Association harki en Dordogne et Nouvelle-Aquitaine : histoire, entraide, actualites, evenements, forum et adhesion.",
      },
    },
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
    data: {
      seo: {
        title: 'Connexion - AHEDNA',
        description: "Connexion a l'espace membre AHEDNA.",
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
        description: "Creation d'un compte membre AHEDNA.",
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
          "Comprendre l'histoire des harkis, la transmission familiale et le travail de memoire porte par AHEDNA.",
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
        description: "Interface de gestion des actualites, evenements et albums AHEDNA.",
        robots: 'noindex, nofollow',
      },
    },
  },
  {
    path: 'actualites',
    loadComponent: () => import('./news/news-list/news-list.component').then((m) => m.NewsListComponent),
    data: {
      seo: {
        title: 'Actualites - AHEDNA',
        description:
          "Actualites de l'association AHEDNA, actions de memoire, informations membres et vie associative.",
      },
    },
  },
  {
    path: 'evenements',
    loadComponent: () =>
      import('./events/events-list/events-list.component').then((m) => m.EventsListComponent),
    data: {
      seo: {
        title: 'Evenements - AHEDNA',
        description:
          "Agenda des commemorations, rencontres, ateliers et temps forts organises par AHEDNA.",
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
          "Forum AHEDNA pour partager temoignages, questions et echanges autour de l'histoire harki.",
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
          "Photos des evenements AHEDNA et albums valides par l'association.",
      },
    },
  },
  {
    path: 'adhesion',
    loadComponent: () => import('./membership/membership.component').then((m) => m.MembershipComponent),
    data: {
      seo: {
        title: 'Adhesion - AHEDNA',
        description:
          "Adherer a AHEDNA via HelloAsso pour soutenir la memoire, l'entraide et les actions de l'association.",
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
          "Contacter AHEDNA pour une question, un temoignage, une adhesion ou une action autour de la memoire harki.",
      },
    },
  },
  {
    path: 'mentions-legales',
    loadComponent: () => import('./legal-notice/legal-notice.component').then((m) => m.LegalNoticeComponent),
    data: {
      seo: {
        title: 'Mentions legales - AHEDNA',
        description:
          "Mentions legales du site AHEDNA : editeur, publication, hebergement, propriete intellectuelle et signalement.",
      },
    },
  },
  {
    path: 'politique-confidentialite',
    loadComponent: () =>
      import('./privacy-policy/privacy-policy.component').then((m) => m.PrivacyPolicyComponent),
    data: {
      seo: {
        title: 'Politique de confidentialite - AHEDNA',
        description:
          "Politique de confidentialite AHEDNA : donnees personnelles, finalites, securite, conservation et droits RGPD.",
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
  { path: '**', redirectTo: '' },
];
