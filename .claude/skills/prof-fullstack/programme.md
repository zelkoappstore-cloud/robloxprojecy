# Programme des leçons

Chaque ligne est une leçon. ✱ = exercice d'architecture (sans IA) ou jalon du projet lolpanel v2.

## Module A : Apprendre à coder (point de départ)
Tout se fait à la main, sans IA. L'IA ne sert qu'à expliquer.
- A.1 C'est quoi du code ? Lancer du JavaScript (console du navigateur, puis Node)
- A.2 Variables et types : texte, nombres, vrai/faux
- A.3 Conditions : `if`, `else`, comparaisons
- A.4 Fonctions : paramètres, `return`
- A.5 Tableaux et boucles
- A.6 Objets
- A.7 `map`, `filter`, `find` : transformer des listes
- A.8 Lire une erreur et déboguer (`console.log`, messages d'erreur)
- A.9 HTML : la structure d'une page
- A.10 CSS : le style, flexbox
- A.11 JavaScript dans la page : le DOM et les événements (clic, saisie)
- ✱ Mini-projet A1 : une todo-list en HTML/CSS/JS pur
- A.12 Le terminal, npm, la structure d'un projet
- A.13 Asynchrone : `fetch`, `async`/`await`, appeler une API
- A.14 TypeScript : ajouter des types
- A.15 React : composants et props
- A.16 React : état (`useState`) et événements
- A.17 Lire du code généré par l'IA et l'expliquer ligne par ligne
- ✱ Mini-projet A2 : refaire une version simple de lolpanel (glisser des blocs, générer du HTML) avec React, presque sans IA

## Module 0 : Les modèles mentaux
- 0.1 La frontière de confiance : le client propose, le serveur décide
- 0.2 Le cycle de vie d'une requête (DNS, TLS, HTTP, réponse)
- 0.3 Méthodes HTTP, idempotence, codes de statut (401 ≠ 403, 409, 422, 429)
- 0.4 En-têtes, cache HTTP (`Cache-Control`, `ETag`)
- 0.5 Cookies (`HttpOnly`, `Secure`, `SameSite`) et stockages navigateur
- 0.6 Same-Origin Policy et CORS (ce que CORS ne protège pas)
- 0.7 Event loop, Promises, parallèle et séquentiel
- 0.8 Node.js contre runtime Edge
- 0.9 TypeScript avancé : generics, unions discriminées, narrowing, `satisfies`
- 0.10 Git pro : branches, PR, rebase, bisect, revert
- ✱ Exercice d'architecture n°1 : concevoir lolpanel v2 sur papier (voir le PDF)
- ✱ Jalon : lolpanel en TS strict + `CLAUDE.md`

## Module 1 : Front-end avancé
- 1.1 CSR, SSR, SSG, ISR, streaming : choisir le bon mode
- 1.2 Hydratation et hydration mismatch
- 1.3 Server Components et frontière `"use client"`
- 1.4 Server Actions (et pourquoi ce sont des endpoints publics)
- 1.5 Les 4 types d'état et leurs outils
- 1.6 Zustand pour l'éditeur (sélecteurs, undo/redo)
- 1.7 TanStack Query : cache serveur côté client, mutations optimistes
- 1.8 Routage App Router : layouts, route groups, routes dynamiques
- 1.9 Parallel et intercepting routes (modales avec URL)
- 1.10 Middleware et redirections d'auth
- 1.11 Core Web Vitals et mesure
- 1.12 Code splitting, images, polices, virtualisation
- 1.13 XSS, CSP, sanitization
- 1.14 Exécuter du code utilisateur en sécurité : iframe sandbox et origine séparée
- 1.15 Organisation du code par fonctionnalité
- ✱ Jalon : restructuration lolpanel + preview sandbox + Lighthouse > 90

## Module 3 (partie 1) : Modélisation
- 3.1 Entités, relations 1-N et N-N, clés étrangères, `ON DELETE`
- 3.2 Normalisation et dénormalisation
- 3.3 Contraintes, identifiants (UUID/cuid contre auto-incrément)
- 3.4 JSONB : quand c'est le bon choix
- 3.5 Prisma : schéma, migrations, client
- ✱ Jalon : PostgreSQL via Docker + projets sauvegardés en base

## Module 2 : Back-end et APIs
- 2.1 Architecture en couches : route, service, repository
- 2.2 Erreurs métier typées et traduction en HTTP
- 2.3 REST bien conçu : ressources, pagination par curseur, erreurs RFC 9457
- 2.4 Versioning, idempotency keys, OpenAPI
- 2.5 GraphQL, tRPC, Server Actions : choisir
- 2.6 Validation Zod à toutes les frontières
- 2.7 Middlewares et rate limiting
- 2.8 Sessions contre JWT
- 2.9 OAuth 2.0 / OIDC, PKCE, `state`
- 2.10 Mots de passe (argon2id), magic links, 2FA, passkeys
- 2.11 Autorisation : RBAC, vérification de propriété, IDOR, mass assignment
- 2.12 Clés API : génération, hash, préfixe, révocation
- 2.13 Files de jobs, retries, idempotence
- 2.14 Webhooks entrants et sortants (signatures HMAC)
- 2.15 Monolithe modulaire contre microservices
- ✱ Jalon : auth, partage, versions, API publique v1, jobs d'export

## Module 3 (partie 2) : Performance et stockage
- 3.6 SQL à la main : JOIN, GROUP BY, CTE, window functions, UPSERT
- 3.7 Injection SQL et requêtes paramétrées
- 3.8 Index B-tree, composites, partiels, GIN
- 3.9 `EXPLAIN ANALYZE` et problème N+1
- 3.10 Transactions, ACID, isolation, verrouillage optimiste
- 3.11 Migrations sans downtime, pooling de connexions en serverless
- 3.12 Relationnel contre MongoDB contre Redis
- 3.13 Cache : cache-aside, TTL, invalidation, clés versionnées
- 3.14 Object storage et URL pré-signées
- 3.15 Supabase/Firebase : RLS et Security Rules
- ✱ Jalon : index justifiés, conflits 409, cache Redis, uploads

## Module 4 : DevOps, sécurité, déploiement
- 4.1 Environnements, `.env`, validation Zod, gestion des secrets
- 4.2 Docker : images, conteneurs, layers, multi-étapes
- 4.3 Docker Compose pour le dev local
- 4.4 CI GitHub Actions
- 4.5 CD, previews, rollback, feature flags
- 4.6 OWASP : contrôle d'accès, injections, XSS, CSRF
- 4.7 OWASP : SSRF, uploads dangereux, mauvaise configuration
- 4.8 Supply chain : dépendances, lockfile, audit
- 4.9 En-têtes de sécurité
- 4.10 Observabilité : erreurs, logs structurés, métriques, traces
- 4.11 Sauvegardes et restauration
- 4.12 Hébergement : Vercel, Railway, Neon/Supabase, AWS, Cloudflare
- ✱ Jalon : CI/CD, worker Railway, audit OWASP, monitoring

## Module 5 : Architecture système
- 5.1 Stateless et scaling horizontal
- 5.2 Load balancer, CDN, réplicas de lecture
- 5.3 Temps réel : SSE, WebSockets, CRDT (Yjs)
- 5.4 Architecture événementielle et pattern outbox
- 5.5 CAP et cohérence à terme
- 5.6 Multi-tenant (workspaces)
- 5.7 Paiements Stripe et webhooks comme source de vérité
- 5.8 C4, ADR, estimation de capacité
- ✱ Projet final : lolpanel v2 complet + défense d'architecture
