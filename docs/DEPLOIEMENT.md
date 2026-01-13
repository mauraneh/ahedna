# 🚀 Guide de Déploiement Cloud - Stack Complète

Guide simple et direct pour déployer AHEDNA sur le cloud.

## 📋 Stack Choisie (100% Gratuit)

- **Frontend** : Vercel (Angular)
- **Backend** : Render (Next.js)
- **Base de données** : Neon (PostgreSQL)

---

## 🎯 Prérequis

- Compte GitHub (gratuit)
- Compte Neon : https://neon.tech (gratuit)
- Compte Render : https://render.com (gratuit)
- Compte Vercel : https://vercel.com (gratuit)

---

## 📝 Étape 1 : Configurer Neon (Base de données)

### 1.1 Créer un compte et projet

1. Allez sur https://neon.tech
2. Créez un compte (gratuit)
3. Créez un nouveau projet :
   - **Name** : `ahedna`
   - **Region** : Choisissez la plus proche (ex: Europe)
   - **PostgreSQL Version** : `15` ou `16`
   - Cliquez **Create Project**

### 1.2 Récupérer la Connection String

Une fois le projet créé, la **Connection String** s'affiche automatiquement.

**Format** : `postgresql://[user]:[password]@[hostname]/[database]?sslmode=require`

✅ **Copiez cette URL complète**, vous en aurez besoin pour Render.

---

## 🚀 Étape 2 : Déployer le Backend sur Render

### 2.1 Créer le service

1. Allez sur https://render.com
2. Connectez votre compte GitHub
3. Cliquez **New +** → **Web Service**
4. Sélectionnez votre repository `Ahedna`

### 2.2 Configuration

**Configurez ainsi** :
```
Name: ahedna-backend
Region: Frankfurt (ou plus proche)
Branch: main
Root Directory: (laissez vide)
Runtime: Node
Build Command: yarn install && yarn build
Start Command: yarn start
Instance Type: Free
```

### 2.3 Variables d'environnement

Dans la section **Environment Variables**, ajoutez :

```env
DATABASE_URL=postgresql://[user]:[password]@[hostname]/[database]?sslmode=require
JWT_SECRET=votre_secret_jwt_aleatoire_64_caracteres_securise
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://votre-frontend.vercel.app,http://localhost:4200
NODE_ENV=production
PORT=10000
```

⚠️ **Important** :
- `DATABASE_URL` : Remplacez par la connection string de Neon (copiée à l'étape 1)
- `JWT_SECRET` : Générez un secret aléatoire sécurisé (64 caractères minimum)
  - En ligne de commande : `openssl rand -base64 32`
  - Ou utilisez un générateur en ligne : https://www.random.org/strings/
- `CORS_ORIGINS` : Vous mettrez l'URL Vercel après l'étape 4 (pour l'instant mettez `http://localhost:4200`)
- `PORT` : Laissez `10000` (Render l'utilise automatiquement)

### 2.4 Déployer

1. Cliquez **Create Web Service**
2. ⏳ Attendez 2-3 minutes pour le build et déploiement
3. Notez l'URL générée : `https://ahedna-backend.onrender.com`

### 2.5 Tester

```bash
curl https://ahedna-backend.onrender.com/api/health
```

✅ Si ça fonctionne : Backend déployé !

---

## 📝 Étape 3 : Configurer le Frontend

### 3.1 Modifier le fichier

Éditez `frontend-angular/src/environments/environment.prod.ts` :

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://ahedna-backend.onrender.com/api' // ← URL de votre backend Render
};
```

Remplacez `ahedna-backend.onrender.com` par l'URL réelle de votre backend Render.

### 3.2 Commit et push

```bash
git add frontend-angular/src/environments/environment.prod.ts
git commit -m "Configure API URL for production"
git push origin main
```

---

## 🌐 Étape 4 : Déployer le Frontend sur Vercel

### 4.1 Créer le projet

1. Allez sur https://vercel.com
2. Connectez votre compte GitHub
3. Cliquez **Add New Project**
4. Importez votre repository `Ahedna`

### 4.2 Configuration

**Configurez ainsi** :
```
Framework Preset: Other
Root Directory: frontend-angular
Build Command: yarn build
Output Directory: dist/frontend-angular/browser
Install Command: yarn install
```

### 4.3 Déployer

1. Cliquez **Deploy**
2. ⏳ Attendez le déploiement
3. Notez l'URL : `https://ahedna.vercel.app` (ou similaire)

### 4.4 Mettre à jour CORS dans Render

Retournez dans Render → votre service backend → Environment Variables

**Mettez à jour** `CORS_ORIGINS` avec l'URL Vercel :

```env
CORS_ORIGINS=https://ahedna.vercel.app,http://localhost:4200
```

⚠️ Render redéploiera automatiquement après cette modification.

---

## 📝 Variables d'environnement - Récapitulatif

### Render (Backend) - 6 variables nécessaires

| Variable | Valeur | Source |
|----------|--------|--------|
| `DATABASE_URL` | `postgresql://...` | Neon (étape 1) |
| `JWT_SECRET` | Secret aléatoire 64 caractères | À générer |
| `JWT_EXPIRES_IN` | `7d` | Fixe |
| `CORS_ORIGINS` | `https://votre-frontend.vercel.app,http://localhost:4200` | Après déploiement frontend |
| `NODE_ENV` | `production` | Fixe |
| `PORT` | `10000` | Fixe |

### Vercel (Frontend) - Aucune variable nécessaire

L'URL de l'API est définie dans `frontend-angular/src/environments/environment.prod.ts`

---

## ✅ Étape 5 : Vérification

### 5.1 Tester le backend

```bash
# Health check
curl https://ahedna-backend.onrender.com/api/health

# Test login
curl -X POST https://ahedna-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ahedna.fr","password":"admin123"}'
```

### 5.2 Tester le frontend

1. Ouvrez l'URL Vercel dans votre navigateur
2. Testez la connexion avec :
   - Email : `admin@ahedna.fr`
   - Mot de passe : `admin123`
3. Vérifiez que les données se chargent

---

## 🔧 Configuration CI/CD (Optionnel)

Le fichier `.github/workflows/ci-cd.yml` est déjà configuré. Il se déclenchera automatiquement sur push.

Si vous voulez activer le déploiement automatique sur Render :

1. Dans GitHub : Settings → Secrets and variables → Actions
2. Ajoutez :
   - `RENDER_API_KEY` : https://dashboard.render.com/account/api-keys
   - `RENDER_SERVICE_ID` : Dans votre service Render → Settings

---

## 📊 URLs Importantes

Notez ces URLs :

- **Frontend** : `https://ahedna.vercel.app`
- **Backend** : `https://ahedna-backend.onrender.com`
- **Neon Dashboard** : https://console.neon.tech

---

## 🔑 Identifiants de Test

```
Email: admin@ahedna.fr
Mot de passe: admin123
Rôle: admin
```

⚠️ Changez ce mot de passe en production !

---

## 🐛 Dépannage

### Backend ne démarre pas
- Vérifiez les logs dans Render Dashboard
- Vérifiez que `DATABASE_URL` est correct
- Vérifiez que `PORT=10000` est défini

### CORS errors
- Vérifiez que `CORS_ORIGINS` dans Render contient l'URL exacte du frontend
- Pas d'espace dans l'URL

### Frontend ne se connecte pas au backend
- Vérifiez que `apiUrl` dans `environment.prod.ts` est correct
- Testez le backend avec curl
- Vérifiez les logs du navigateur (F12)

---

## ✅ Checklist Finale

- [ ] Compte Neon créé et projet configuré
- [ ] Connection String Neon copiée
- [ ] Backend déployé sur Render
- [ ] Variables d'environnement configurées dans Render
- [ ] Backend testé et fonctionnel
- [ ] `environment.prod.ts` modifié avec l'URL backend
- [ ] Frontend déployé sur Vercel
- [ ] `CORS_ORIGINS` mis à jour dans Render
- [ ] Frontend testé et fonctionnel
- [ ] Login fonctionne
- [ ] Données se chargent correctement

---

**🎉 Votre application est maintenant en ligne avec des services 100% gratuits !**
