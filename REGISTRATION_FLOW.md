# Flux d'inscription et gestion des utilisateurs - FinOps

## Résumé des fonctionnalités implémentées

### 1. Inscription du propriétaire d'entreprise
- **Formulaire** : Nom entreprise, Catégorie, Email, Nom propriétaire, Téléphone (optionnel)
- La demande est envoyée à l'**Administrateur** de la plateforme
- L'admin peut **Accepter** ou **Rejeter** (motif obligatoire si rejet)

### 2. Si l'admin ACCEPTE
- Création de la **Company** et de l'**User** (rôle OWNER)
- Liaison user ↔ company
- Email envoyé au propriétaire avec **email + mot de passe temporaire**

### 3. Première connexion (sécurité)
- **Changement obligatoire** du mot de passe temporaire
- Règles : min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
- **Blocage 30 secondes** après 5 tentatives de connexion incorrectes

### 4. Si l'admin REJETTE
- Email envoyé au propriétaire avec le **motif du rejet**

### 5. Après connexion du propriétaire
- Compléter les infos entreprise : **Logo**, **Matricule fiscal** (Settings)
- Créer une nouvelle entreprise (multi-entreprises propriétaire)
- Créer des employés avec rôles (Manager, Employé, Comptable)
- Basculer entre entreprises via endpoint dédié

### 6. Gestion des employés
- Le propriétaire/manager crée des employés
- Email envoyé avec rôle, email, mot de passe temporaire
- Mêmes règles de première connexion et blocage

### 7. Technique
- Architecture NestJS + React
- Hachage bcrypt, JWT, RBAC, Validation
- Service mail (Nodemailer)
- Isolation des données par entreprise

---

## Démarrage

### Backend (port 3001)
```bash
cd backend
npm install
# Créer .env avec PORT=3001, JWT_SECRET=...
npm run start:dev
```

### Frontend (port 5173)
```bash
npm install
npm run dev
```

### Compte Admin par défaut
- **Email** : admin@finops.com
- **Mot de passe** : Admin123!

Créé automatiquement au premier lancement du backend.

---

## API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /registration | Soumettre une demande d'inscription |
| POST | /auth/login | Connexion |
| POST | /auth/change-password | Changer le mot de passe (JWT) |
| GET | /users/me | Utilisateur courant (JWT) |
| GET | /admin/registration-requests | Liste des demandes (Admin) |
| POST | /admin/registration-requests/:id/accept | Accepter (Admin) |
| POST | /admin/registration-requests/:id/reject | Rejeter (Admin) |
| GET | /companies/my-companies | Mes entreprises |
| POST | /companies | Créer une entreprise (Owner) |
| POST | /companies/:id/switch | Changer l'entreprise active |
| GET | /companies/:id | Détails entreprise (avec contrôle d'accès) |
| PUT | /companies/:id | Mettre à jour entreprise |
| GET | /companies/:id/employees | Liste employés |
| POST | /companies/:id/employees | Créer employé |
