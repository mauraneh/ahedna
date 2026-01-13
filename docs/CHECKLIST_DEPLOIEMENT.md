# ✅ Checklist Complète - Déploiement Cloud

Guide pas à pas pour déployer AHEDNA.

---

## 📋 Stack Choisie

- **Frontend** : Vercel (Angular)
- **Backend** : Render (Next.js)
- **Base de données** : Neon (PostgreSQL)

---

## 📋 Étape 1 : Créer les comptes (5 minutes)

- [ ] **Neon** : https://neon.tech (gratuit)
  - Créez un compte
  - Créez un projet `ahedna`
  - Copiez la Connection String

- [ ] **Render** : https://render.com (gratuit)
  - Connectez votre GitHub

- [ ] **Vercel** : https://vercel.com (gratuit)
  - Connectez votre GitHub

---

## 📋 Étape 2 : Configurer Neon (Base de données)

### 2.1 Créer un projet

1. Dans Neon Dashboard : **Create Project**
2. Configurez :
   - **Name** : `ahedna`
   - **Region** : Choisissez la plus proche (ex: Europe)
   - **PostgreSQL Version** : `15` ou `16`
3. Cliquez **Create Project**

### 2.2 Récupérer la Connection String

Une fois créé, la Connection String s'affiche automatiquement.

**Format** : `postgresql://[user]:[password]@[hostname]/[database]?sslmode=require`

✅ **Copiez cette URL complète** pour l'étape suivante.

---

## 📋 Étape 3 : Déployer le Backend sur Render

### 3.1 Créer le service

1. Dans Render Dashboard : **New +** → **Web Service**
2. Connectez votre repository GitHub `Ahedna`
3. Configurez :

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

### 3.2 Variables d'environnement

Dans **Environment Variables**, ajoutez :

```env
DATABASE_URL=postgresql://[user]:[password]@[hostname]/[database]?sslmode=require
JWT_SECRET=votre_secret_jwt_aleatoire_64_caracteres_securise
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://votre-frontend.vercel.app,http://localhost:4200
NODE_ENV=production
PORT=10000
```

⚠️ **Important** :
- Remplacez `DATABASE_URL` par la connection string de Neon (étape 2)
- Générez un `JWT_SECRET` aléatoire (64 caractères)
- Pour `CORS_ORIGINS`, vous mettrez l'URL Vercel après l'étape 5

### 3.3 Déployer

1. Cliquez **Create Web Service**
2. ⏳ Attendez 2-3 minutes
3. Notez l'URL : `https://ahedna-backend.onrender.com`

### 3.4 Tester

```bash
curl https://ahedna-backend.onrender.com/api/health
```

✅ Si ça fonctionne : Backend déployé !

---

## 📋 Étape 4 : Modifier le Frontend

### 4.1 Fichier à modifier

**`frontend-angular/src/environments/environment.prod.ts`**

Remplacez par :
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://ahedna-backend.onrender.com/api' // ← URL de votre backend Render
};
```

### 4.2 Commit et push

```bash
git add frontend-angular/src/environments/environment.prod.ts
git commit -m "Configure API URL for production"
git push origin main
```

---

## 📋 Étape 5 : Déployer le Frontend sur Vercel

### 5.1 Créer le projet

1. Dans Vercel Dashboard : **Add New Project**
2. Importez votre repository `Ahedna`
3. Configurez :

```
Framework Preset: Other
Root Directory: frontend-angular
Build Command: yarn build
Output Directory: dist/frontend-angular/browser
Install Command: yarn install
```

### 5.2 Déployer

1. Cliquez **Deploy**
2. ⏳ Attendez le déploiement
3. Notez l'URL : `https://ahedna.vercel.app` (ou similaire)

### 5.3 Mettre à jour CORS dans Render

Retournez dans Render → votre service backend → Environment Variables

**Mettez à jour** `CORS_ORIGINS` :

```env
CORS_ORIGINS=https://ahedna.vercel.app,http://localhost:4200
```

⚠️ Render redéploiera automatiquement.

---

## 📋 Étape 6 : Vérifier que tout fonctionne

### 6.1 Tester le backend

```bash
# Health check
curl https://ahedna-backend.onrender.com/api/health

# Test login
curl -X POST https://ahedna-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ahedna.fr","password":"admin123"}'
```

### 6.2 Tester le frontend

1. Ouvrez l'URL Vercel dans votre navigateur
2. Testez la connexion :
   - Email : `admin@ahedna.fr`
   - Mot de passe : `admin123`
3. Vérifiez que les données se chargent

---

## 🔑 Identifiants de test

```
Email: admin@ahedna.fr
Mot de passe: admin123
Rôle: admin
```

⚠️ Changez ce mot de passe en production !

---

## 📊 URLs importantes à noter

- **Frontend Vercel** : `https://ahedna.vercel.app`
- **Backend Render** : `https://ahedna-backend.onrender.com`
- **Neon Dashboard** : https://console.neon.tech

---

## ✅ Checklist finale

- [ ] Compte Neon créé et projet configuré
- [ ] Connection String Neon copiée
- [ ] Backend déployé sur Render
- [ ] Variables d'environnement configurées dans Render
- [ ] Backend testé et fonctionnel
- [ ] `environment.prod.ts` modifié avec l'URL backend
- [ ] Frontend déployé sur Vercel
- [ ] `CORS_ORIGINS` mis à jour dans Render avec l'URL Vercel
- [ ] Frontend testé et fonctionnel
- [ ] Login fonctionne
- [ ] Données se chargent correctement

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

**🎉 Votre application est maintenant en ligne !**
