import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { HistoryComponent } from './history/history.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'histoire', component: HistoryComponent },
  {
    path: 'actualites',
    loadComponent: () => import('./news/news-list/news-list.component').then(m => m.NewsListComponent)
  },
  {
    path: 'evenements',
    loadComponent: () => import('./events/events-list/events-list.component').then(m => m.EventsListComponent)
  },
  {
    path: 'forum',
    loadComponent: () => import('./forum/forum-list/forum-list.component').then(m => m.ForumListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'galerie',
    loadComponent: () => import('./gallery/gallery.component').then(m => m.GalleryComponent)
  },
  {
    path: 'adhesion',
    loadComponent: () => import('./membership/membership.component').then(m => m.MembershipComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] }
  },
  { path: '**', redirectTo: '' }
];
