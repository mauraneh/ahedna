import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'histoire',
    loadComponent: () => import('./history/history.component').then((m) => m.HistoryComponent),
  },
  {
    path: 'profil',
    loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'contenu',
    loadComponent: () =>
      import('./content-management/content-management.component').then(
        (m) => m.ContentManagementComponent,
      ),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['auteur', 'admin'] },
  },
  {
    path: 'actualites',
    loadComponent: () => import('./news/news-list/news-list.component').then((m) => m.NewsListComponent),
  },
  {
    path: 'evenements',
    loadComponent: () =>
      import('./events/events-list/events-list.component').then((m) => m.EventsListComponent),
  },
  {
    path: 'forum',
    loadComponent: () => import('./forum/forum-list/forum-list.component').then((m) => m.ForumListComponent),
  },
  {
    path: 'galerie',
    loadComponent: () => import('./gallery/gallery.component').then((m) => m.GalleryComponent),
  },
  {
    path: 'adhesion',
    loadComponent: () => import('./membership/membership.component').then((m) => m.MembershipComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
  },
  { path: '**', redirectTo: '' },
];
