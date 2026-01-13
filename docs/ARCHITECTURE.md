# 🏗️ Architecture Cloud-Native - AHEDNA

## Vue d'ensemble

Cette architecture utilise exclusivement des **services gratuits** pour héberger l'application complète.

## Architecture proposée

```
┌─────────────────────────────────────────────────────────────┐
│                        Utilisateurs                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│   Frontend    │              │    Backend    │
│   Angular     │              │   Next.js     │
│               │              │               │
│  Vercel      │              │  Render      │
│  (Build      │              │  (Next.js    │
│   Statique)  │              │   Server)    │
└───────┬───────┘              └───────┬───────┘
        │                               │
        │                               │
        │              ┌────────────────┴────────────────┐
        │              │                                  │
        │              ▼                                  ▼
        │      ┌───────────────┐
        │      │   PostgreSQL  │
        │      │   (Neon)      │
        │      │               │
        │      │   GRATUIT     │
        │      │   (0.5GB)     │
        │      └───────────────┘
        │
        │
┌───────┴───────┐
│   CI/CD       │
│               │
│ GitHub Actions│
│   (GRATUIT)   │
└───────┬───────┘
        │
        │ Build & Deploy automatique
        │
┌───────┴───────┐
│  Monitoring   │
│               │
│ Vercel Analytics│
│ CloudWatch     │
│ (GRATUIT)     │
└───────────────┘
```

## Services utilisés (100% gratuits)

### 1. **Frontend - Angular**
- **Hébergeur** : Vercel
- **Type** : Build statique Angular
- **Avantages** :
  - Gratuit illimité
  - CDN global inclus
  - SSL automatique
  - Déploiement automatique via GitHub

### 2. **Backend - Next.js API**
- **Hébergeur** : Render
- **Type** : Web Service (Node.js)
- **Avantages** :
  - Plan gratuit permanent
  - HTTPS automatique
  - Déploiement automatique via GitHub
  - Auto-scaling

### 3. **Base de données - PostgreSQL**
- **Hébergeur** : Neon
- **Type** : PostgreSQL serverless
- **Avantages** :
  - 0.5GB gratuit permanent
  - PostgreSQL 15/16
  - Connection pooling
  - Dashboard de gestion
  - Compatible avec le code existant

### 4. **Stockage de fichiers**
- **Hébergeur** : Supabase Storage
- **Limites gratuites** :
  - 1GB de stockage
  - 2GB de bande passante
- **Usage** : Images pour actualités, galerie, événements

### 5. **CI/CD**
- **Hébergeur** : GitHub Actions
- **Limites gratuites** :
  - 2000 minutes/mois pour repos privés
  - Illimité pour repos publics
- **Fonctionnalités** :
  - Tests automatiques
  - Build automatique
  - Déploiement automatique

### 6. **Monitoring & Observabilité**
- **Vercel Analytics** : Métriques de performance (gratuit)
- **Vercel Logs** : Logs d'application (gratuit)
- **Supabase Logs** : Logs de base de données (gratuit)
- **GitHub Actions** : Logs de déploiement (gratuit)

## Flux de données

### 1. Authentification
```
User → Frontend → Backend (Vercel) → Supabase Auth → JWT Token
```

### 2. Requêtes API
```
Frontend → Backend (Vercel Serverless) → Supabase PostgreSQL → Response
```

### 3. Upload de fichiers
```
Frontend → Backend (Vercel) → Supabase Storage → URL retournée
```

### 4. CI/CD Pipeline
```
Git Push → GitHub Actions → Tests → Build → Deploy Vercel/Netlify
```

## Sécurité

- **HTTPS** : Automatique via Vercel/Netlify
- **CORS** : Configuré côté backend
- **JWT** : Authentification sécurisée
- **Variables d'environnement** : Gérées via Vercel/Netlify
- **Secrets** : Gérés via GitHub Secrets

## Scalabilité

- **Auto-scaling** : Automatique via Vercel Serverless
- **CDN** : Inclus avec Vercel/Netlify
- **Cache** : Edge caching automatique
- **Database** : Supabase gère le scaling vertical

## Coûts

**Total : 0€/mois**

Tous les services utilisés sont dans leur plan gratuit et suffisent pour un projet de démonstration.

## Limites et considérations

### Limites des services gratuits

1. **Vercel** :
   - 100GB bandwidth/mois
   - Fonctions serverless limitées à 10s d'exécution
   - 100 déploiements/jour

2. **Supabase** :
   - 500MB base de données
   - 1GB stockage fichiers
   - 2GB bande passante

3. **GitHub Actions** :
   - 2000 minutes/mois (repos privés)
   - Illimité (repos publics)

### Recommandations pour la production

Si le projet grandit, considérer :
- Passage à un plan payant Supabase (dès 25$/mois)
- Passage à Vercel Pro si trafic > 100GB/mois
- Utilisation d'un CDN dédié pour assets statiques

## Diagramme de déploiement

```
┌────────────────────────────────────────────────────────────┐
│                      GitHub Repository                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Frontend    │  │   Backend    │  │   Config     │   │
│  │  Angular     │  │   Next.js    │  │   Files      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└───────────────────────┬────────────────────────────────────┘
                        │
                        │ Push/PR
                        │
                        ▼
            ┌───────────────────────┐
            │   GitHub Actions      │
            │   ┌─────────────────┐ │
            │   │ 1. Run Tests    │ │
            │   │ 2. Build        │ │
            │   │ 3. Deploy       │ │
            │   └─────────────────┘ │
            └───────┬───────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│   Vercel      │      │    Netlify    │
│  (Backend +   │      │   (Frontend   │
│   Frontend)   │      │    Option)    │
└───────┬───────┘      └───────────────┘
        │
        │ API Calls
        │
        ▼
┌───────────────┐
│   Supabase    │
│  PostgreSQL   │
│   Storage     │
└───────────────┘
```

## Avantages de cette architecture

✅ **100% gratuit** : Aucun coût  
✅ **Scalable** : Auto-scaling automatique  
✅ **Rapide** : CDN global  
✅ **Sécurisé** : HTTPS, authentification  
✅ **CI/CD** : Automatisation complète  
✅ **Monitoring** : Logs et métriques inclus  
✅ **Facile à déployer** : Configuration simple  
✅ **Respecte les exigences** : Architecture cloud-native complète
