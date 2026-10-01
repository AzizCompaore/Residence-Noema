# RÉSIDENCE NOEMA — Backend Django & Django Admin

Ce répertoire contient l'architecture backend officielle Django REST Framework & Django Admin pour la **Résidence NOEMA** (Angré, Abidjan) par **Uriel Group / ImmoDiaspo**.

## 🚀 Fonctionnalités Clés du Backend

1. **Back-Office Django Admin (`/admin/`)** :
   - Gestion intégrale des appartements (prix en FCFA, surfaces, typologies, photos, statuts : *Disponible, Option, Réservé, Vendu*).
   - Modification en direct des disponibilités et prix sans redéploiement.
   - Suivi du pipeline CRM des prospects (*Nouveau prospect → Qualifié → Contacté → Rendez-vous → Étude du dossier → Réservation → Vente*).
   - Suivi d'attribution UTM (*Instagram, Facebook, TikTok, WhatsApp, Google, QR Code*).
   - Gestion de l'avancement du chantier (timeline, photos réelles distinctes des rendus 3D).
   - Gestion dynamique de la FAQ.
   - Paramétrage du simulateur financier (taux d'intérêt indicatif, seuil d'endettement).

2. **API REST JSON** :
   - `GET /api/residence/`
   - `GET /api/apartments/`
   - `GET /api/construction/`
   - `GET /api/faq/`
   - `POST /api/simulations/calculate`
   - `POST /api/leads/`

### Authentification

L'authentification utilise les sessions Django, des cookies HttpOnly, la protection CSRF, le hachage natif des mots de passe et une limitation des tentatives de connexion.

- `GET /api/auth/csrf/`
- `GET /api/auth/me/`
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `POST /api/auth/password-reset/request/`
- `POST /api/auth/password-reset/confirm/`
- `GET /api/auth/google/start/`
- `GET /api/auth/google/callback/`

Pour activer Google, renseigner `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `GOOGLE_REDIRECT_URI`. En production, définir également `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`, les origines CORS/CSRF exactes et les paramètres SMTP. Express est le point d’entrée public et relaie `/admin/`, `/static/` et l’authentification vers Django.

## 🛠️ Installation & Lancement Rapide (Local)

### 1. Prérequis
- Python 3.11+
- PostgreSQL (ou SQLite inclus par défaut)

### 2. Création de l'environnement virtuel & installation
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configuration des variables d'environnement
Créer un fichier `.env` dans `backend/` :
```env
DJANGO_SECRET_KEY="votre-cle-secrete-django"
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1,*"
# Configuration optionnelle PostgreSQL :
# POSTGRES_DB=noema_db
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=postgres
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432
```

### 4. Migrations & Création du Super-Administrateur
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createcachetable django_cache
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 5. Lancement du serveur Django
```bash
# Windows PowerShell
python manage.py runserver 127.0.0.1:8000

# Linux / macOS
python manage.py runserver 127.0.0.1:8000
```
Accédez au back-office d'administration : `http://127.0.0.1:8000/admin/`

`DJANGO_DEBUG=True` est requis dans le `.env` local pour utiliser la clé de développement. En production, laisser `DJANGO_DEBUG=False` et fournir une clé `DJANGO_SECRET_KEY` aléatoire d'au moins 50 caractères; ne jamais publier le fichier `.env`.

En production, configurer `SECURE_PROXY_SSL_HEADER` via les en-têtes `X-Forwarded-Proto` fiables du proxy et définir `TRUST_PROXY_HOPS` pour Express. Les médias téléversés doivent utiliser un volume persistant partagé ou un stockage objet; `collectstatic` ne sauvegarde pas les médias.

---

## 🏛️ Architecture Multi-Programmes & Évolution CRM

L'architecture est modulaire (`apps/residences`, `apps/apartments`, `apps/leads`, `apps/construction`). Elle est préparée pour intégrer de futurs programmes immobiliers (Programme Émergence, etc.) ou se synchroniser avec un CRM d'entreprise via les webhooks et l'abstraction `LeadService`.
