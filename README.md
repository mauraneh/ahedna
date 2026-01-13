# AHEDNA - Association des Harkis et de leurs Enfants
## Dordogne et Nouvelle-Aquitaine

Site complet pour l'Association des Harkis avec **Angular 20** en front-end et **Next.js** en back-end.

## ☁️ Application Cloud-Native

Cette application est déployée sur le cloud avec une architecture moderne utilisant **exclusivement des services gratuits** :

- **Frontend** : Vercel (Angular)
- **Backend** : Render (Next.js)
- **Base de données** : Neon (PostgreSQL)
- **CI/CD** : GitHub Actions
- **Monitoring** : Vercel Analytics & Logs


---

## 🏗️ Architecture

### **Front-end** : Angular 20
- **Port** : 4200
- **Localisation** : `/app/frontend-angular/`
- **Framework** : Angular 20 (standalone components)
- **Style** : Tailwind CSS avec palette AHEDNA (beige, rouge, vert, jaune, bleu)
- **Animations** : GSAP, AOS, Scroll-based animations

### **Back-end** : Next.js API
- **Port** : 3000
- **Localisation** : `/app/app/api/[[...path]]/route.js`
- **Base de données** : PostgreSQL (port 5432)
- **Authentification** : JWT tokens
- **API REST** : CRUD complet pour toutes les fonctionnalités

---

## 📋 Fonctionnalités

### ✅ Authentification & Autorisation
- **Inscription / Connexion** : Système complet avec JWT
- **Rôles** : membre, auteur, admin
- **Protection des routes** : Guards Angular
- **Adhésion** : Option lors de l'inscription

### ✅ Histoire Immersive
- **Frises chronologiques** : Navigation par années
- **Chapitres interactifs** : Contenu riche avec médias
- **Animations** : Scroll-based, fade-in, parallax effects
- **Cartes interactives** : Support pour coordonnées GPS (Leaflet ready)

### ✅ Actualités (News)
- **CRUD complet** : Création, lecture, mise à jour, suppression
- **Rôles** : Auteur et Admin peuvent créer
- **Images** : Support d'images pour chaque article
- **Publication** : Système de draft/publié

### ✅ Événements
- **Types** : À venir / Passés
- **Détails** : Date, lieu, description
- **Galerie** : Photos par événement
- **Gestion** : Admin uniquement

### ✅ Forum
- **Sujets** : Création par membres authentifiés
- **Messages** : Système de discussion
- **Modération** : Validation admin requise pour nouveaux sujets
- **Compteurs** : Nombre de réponses par sujet

### ✅ Galerie Photos
- **Upload** : Membres peuvent télécharger
- **Validation** : Admin valide avant publication
- **Descriptions** : Texte accompagnant chaque photo
- **Grid responsive** : Affichage optimisé

### ✅ Espace Admin
- **Dashboard** : Statistiques globales
- **Gestion utilisateurs** : Modification des rôles
- **Modération forum** : Validation/Refus des sujets
- **Modération galerie** : Validation/Refus des photos
- **Gestion événements** : CRUD complet

---

## ☁️ Architecture Cloud-Native

Ce projet est conçu pour être déployé sur le cloud avec des **services 100% gratuits**.

### Services utilisés

| Service | Usage | Plan Gratuit |
|---------|-------|--------------|
| **Vercel** | Frontend Angular | CDN global, SSL automatique |
| **Render** | Backend Next.js | Plan gratuit permanent |
| **Neon** | PostgreSQL | 0.5GB gratuit permanent |
| **GitHub Actions** | CI/CD Pipeline | 2000 min/mois (privé) |

### Architecture

```
Frontend (Angular) → Vercel CDN → Backend (Next.js) → Neon PostgreSQL
                           ↓              ↓ (Render)
                    Build statique    Serverless API
```

📖 **Documentation** :
- [Guide de déploiement](docs/DEPLOIEMENT.md) - Instructions complètes
- [Checklist de déploiement](docs/CHECKLIST_DEPLOIEMENT.md) - Liste à cocher
- [Architecture](docs/ARCHITECTURE.md) - Vue technique
- [Présentation](docs/SOUTENANCE.md) - Guide pour la soutenance

### CI/CD Pipeline

Le projet inclut une pipeline GitHub Actions automatique qui :
- ✅ Lance les tests (backend + frontend)
- ✅ Build les applications
- ✅ Déploie automatiquement

Voir [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)

---

## 🚀 Démarrage

### **Prérequis**
- **Option Docker** : Docker et Docker Compose installés (recommandé)
- **Option Manuelle** : PostgreSQL installé et démarré, Node.js 18+ et Yarn

---

### **🐳 Option 1 : Démarrage avec Docker Compose (Recommandé)**

Lancez tous les services (PostgreSQL, Backend, Frontend) en une seule commande :

```bash
# Lancer tous les services
docker-compose up

# Lancer en arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données PostgreSQL)
docker-compose down -v
```

**Avantages** :
- ✅ Tout se lance automatiquement (PostgreSQL, Backend, Frontend)
- ✅ Pas besoin d'installer PostgreSQL localement
- ✅ Configuration isolée et reproductible
- ✅ La base de données s'initialise automatiquement au premier appel

**Accès après démarrage** :
- Frontend Angular : http://localhost:4200
- Backend API : http://localhost:3000/api
- PostgreSQL : localhost:5432

---

### **⚙️ Option 2 : Démarrage Manuel**

### **1. Démarrer PostgreSQL**
```bash
sudo -u postgres pg_ctlcluster 15 main start
```

### **2. Vérifier la base de données**
```bash
sudo -u postgres psql -l
# La base 'ahedna_db' doit exister
```

### **3. Démarrer le backend Next.js** (déjà actif via supervisor)
```bash
cd /app
sudo supervisorctl restart nextjs
```

### **4. Démarrer le frontend Angular**
```bash
cd /app/frontend-angular
yarn install  # Si nécessaire
yarn ng serve --host 0.0.0.0 --port 4200
```

### **5. Accès**
- **Frontend Angular** : http://localhost:4200
- **Backend API** : http://localhost:3000/api

---

## 🔑 Compte Admin par Défaut

```
Email: admin@ahedna.fr
Mot de passe: admin123
Rôle: admin
```

⚠️ **Important** : Changez ce mot de passe en production !

---

## 🗄️ Base de Données

### **Tables PostgreSQL**

1. **users** : Utilisateurs et rôles
2. **memberships** : Adhésions
3. **news** : Actualités
4. **events** : Événements
5. **event_photos** : Photos d'événements
6. **gallery_photos** : Galerie générale
7. **forum_topics** : Sujets de forum
8. **forum_messages** : Messages de forum
9. **history_chapters** : Chapitres d'histoire

### **Connexion PostgreSQL**

Les variables de connexion sont configurées dans le fichier `.env` à la racine du projet.

Voir le fichier `.env` pour les valeurs de :
- `DATABASE_URL` : Connection string PostgreSQL (local ou Neon)

### **Initialisation de la Base de Données**

La base de données s'initialise automatiquement au premier appel de l'API. Le schéma est créé via `lib/db.js` qui définit toutes les tables nécessaires (users, news, events, forum, gallery, etc.).

---

## 📡 API Endpoints

### **Authentification**
- `POST /api/auth/register` : Inscription
- `POST /api/auth/login` : Connexion
- `GET /api/auth/me` : Utilisateur actuel

### **Actualités**
- `GET /api/news?published=true` : Liste des actualités publiées
- `GET /api/news/:id` : Détail d'une actualité
- `POST /api/news` : Créer (auteur/admin)
- `PUT /api/news/:id` : Modifier (auteur/admin)
- `DELETE /api/news/:id` : Supprimer (admin)

### **Événements**
- `GET /api/events?type=upcoming` : Événements à venir
- `GET /api/events?type=past` : Événements passés
- `GET /api/events/:id` : Détail avec photos
- `POST /api/events` : Créer (admin)
- `PUT /api/events/:id` : Modifier (admin)
- `DELETE /api/events/:id` : Supprimer (admin)

### **Forum**
- `GET /api/forum/topics?validated=true` : Sujets validés
- `GET /api/forum/topics/:id/messages` : Messages d'un sujet
- `POST /api/forum/topics` : Créer un sujet
- `POST /api/forum/topics/:id/messages` : Ajouter un message
- `PUT /api/forum/topics/:id/validate` : Valider (admin)
- `DELETE /api/forum/topics/:id` : Supprimer (admin)

### **Galerie**
- `GET /api/gallery?validated=true` : Photos validées
- `POST /api/gallery` : Upload photo
- `PUT /api/gallery/:id/validate` : Valider (admin)
- `DELETE /api/gallery/:id` : Supprimer (admin)

### **Histoire**
- `GET /api/history/chapters` : Tous les chapitres
- `POST /api/history/chapters` : Créer (admin)

### **Admin**
- `GET /api/users` : Liste utilisateurs (admin)
- `PUT /api/users/:id/role` : Changer rôle (admin)

---

## 🎨 Design System

### **Palette de couleurs AHEDNA**
```css
Beige : #F5E6D3 (couleur de base)
Rouge : #DC2626 (accents, boutons primaires)
Vert  : #16A34A (boutons secondaires)
Jaune : #EAB308 (highlights)
Bleu  : #2563EB (liens, admin)
```

### **Composants Tailwind**
- **Gradients** : `from-red-600 to-red-700`
- **Ombres** : `shadow-xl`, `shadow-2xl`
- **Arrondis** : `rounded-xl`, `rounded-2xl`
- **Animations** : `hover:scale-105`, `transform`, `transition-all`

---

## 🔧 Configuration

### **Environment Variables**

Toutes les variables d'environnement sont configurées dans le fichier `.env` à la racine du projet.

Le fichier `.env` contient :
- `DATABASE_URL` : Connection string PostgreSQL
- `JWT_SECRET` : Secret pour les tokens JWT
- `JWT_EXPIRES_IN` : Durée de validité des tokens
- `CORS_ORIGINS` : Origines autorisées pour CORS
- Variables Vercel (pour référence locale)

⚠️ **Le fichier `.env` n'est pas commité sur GitHub** (dans `.gitignore`). 

Pour configurer le projet :
1. Copiez les variables nécessaires dans votre `.env`
2. Adaptez les valeurs selon votre environnement (local, production)

### **Angular Environment**

Les fichiers `frontend-angular/src/environments/environment.ts` et `environment.prod.ts` contiennent la configuration de l'URL de l'API.

Pour la production, configurez l'URL du backend Render dans `environment.prod.ts`.

---

## 📦 Structure des Fichiers

```
/app/
├── frontend-angular/         # Application Angular 20
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/         # Login, Register
│   │   │   ├── home/         # Page d'accueil
│   │   │   ├── history/      # Histoire immersive
│   │   │   ├── news/         # Actualités
│   │   │   ├── events/       # Événements
│   │   │   ├── forum/        # Forum
│   │   │   ├── gallery/      # Galerie
│   │   │   ├── admin/        # Espace admin
│   │   │   └── core/         # Services, Guards, Interceptors
│   │   └── environments/     # Config API
│   └── tailwind.config.js    # Tailwind CSS
│
├── app/
│   └── api/[[...path]]/      # Backend Next.js API
│       └── route.js          # Tous les endpoints
│
├── lib/
│   ├── db.js                 # PostgreSQL connection & schema
│   └── auth.js               # JWT utilities
│
└── .env                      # Variables d'environnement
```

---

## 🧪 Tests

### **Tester l'API**

```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ahedna.fr","password":"admin123"}'

# Get history chapters
curl http://localhost:3000/api/history/chapters
```

---

## 🚧 Fonctionnalités Futures

- [ ] Intégration HelloAsso pour adhésions réelles
- [ ] API actualités externes
- [ ] Cartes interactives Leaflet avec données GPS
- [ ] Upload de fichiers multimédia (images, vidéos)
- [ ] Newsletter par email
- [ ] Export PDF de l'histoire
- [ ] Multi-langue (FR/AR)

---

## 📝 Notes de Développement

### **Middleware & Guards**
- **authInterceptor** : Ajoute automatiquement le token JWT aux requêtes HTTP
- **authGuard** : Protège les routes nécessitant une authentification
- **roleGuard** : Protège les routes nécessitant un rôle spécifique

### **Validation**
- Tous les contenus générés par utilisateurs (forum, galerie) nécessitent validation admin
- Les actualités ont un système draft/publié
- Les événements sont créés uniquement par les admins

### **Sécurité**
- Mots de passe hashés avec bcrypt
- Tokens JWT avec expiration 7 jours
- Protection CSRF via CORS
- Validation des rôles côté backend

---

## 🤝 Contribution

Ce projet a été créé pour l'Association AHEDNA. Pour toute modification ou contribution, contactez l'administrateur.

---

## 📄 Licence

© 2025 AHEDNA - Association des Harkis et de leurs Enfants de Dordogne et Nouvelle-Aquitaine.
Tous droits réservés.
