
# Run and deploy your AI Studio app

## Architecture de déploiement

Le site public est servi par Express (frontend et routes `/api`). Django REST et Django Admin sont déployés comme service backend privé, accessible depuis Express via `DJANGO_API_URL`. Le navigateur utilise une origine unique; l’administration est disponible sous `/admin/` et ses fichiers statiques sont servis sous `/static/`.

En production, configurer HTTPS au niveau du proxy/hébergeur, `DJANGO_DEBUG=False`, une clé Django forte, `DJANGO_ALLOWED_HOSTS` avec les domaines exacts, PostgreSQL, SMTP, ainsi que les URL publiques HTTPS de `FRONTEND_URL` et `GOOGLE_REDIRECT_URI`. `TRUST_PROXY_HOPS` doit correspondre au nombre de reverse proxies fiables devant Express (1 pour un seul proxy d’hébergement).

Avant d’ouvrir le trafic, exécuter dans le service Django :

```bash
python manage.py migrate
python manage.py createcachetable django_cache
python manage.py collectstatic --noinput
python manage.py check --deploy
```

Démarrer les services séparément : Express avec `npm start` (le port `PORT` est fourni par l’hébergeur) et Django avec `gunicorn noema_project.wsgi:application --bind 0.0.0.0:$PORT` depuis `backend/`. Django doit rester privé; seul Express reçoit le trafic public et relaie les en-têtes `X-Forwarded-Host` et `X-Forwarded-Proto`.

Les images téléversées depuis l’admin sont servies sous `/media/` par Express. Monter le même volume persistant au chemin `MEDIA_ROOT` dans les services Node et Django, ou remplacer cette distribution par un stockage objet. Le disque éphémère d’un conteneur ne convient pas.

View your app in AI Studio: https://ai.studio/apps/be8ee41d-996e-42f3-b921-376e18aff944

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Connexion Google en local

1. Dans Google Cloud Console, créez un identifiant OAuth de type **Application Web**.
2. Ajoutez `http://localhost:3000/api/auth/google/callback/` dans les URI de redirection autorisées.
3. Copiez `.env.example` vers `.env`, puis renseignez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.
4. Vérifiez que `FRONTEND_URL="http://localhost:3000"`, puis démarrez Django sur le port `8000` et l’application avec `npm run dev`.

En production, remplacer l’URL de callback par l’URL publique HTTPS correspondante dans `GOOGLE_REDIRECT_URI` et Google Cloud Console.
