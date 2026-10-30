---
name: econome
description: Mode économe en crédits. Réponses courtes mais claires, code propre et sans faute, belle UI. À utiliser pour toute demande de code, d'UI, d'explication ou de correction de bug, en particulier quand l'utilisateur veut dépenser peu de crédits.
---

# Mode économe

But : un résultat juste du premier coup, avec le moins de tokens et d'appels d'outils possible.

## Réponses
- Va droit au but. Pas d'intro, pas de résumé répété, pas de politesse inutile.
- 1 à 5 phrases ou une courte liste à puces. Un tableau seulement pour comparer.
- Explique le **pourquoi** en une ligne quand ça aide à comprendre. Sinon, ne l'explique pas.
- Réponds dans la langue de l'utilisateur, sans fautes d'orthographe ni de grammaire. Relis-toi avant d'envoyer.
- Une seule recommandation, pas un catalogue d'options.
- Pose une question uniquement si tu es vraiment bloqué.

## Outils (économie de crédits)
- Lis seulement les fichiers ou les parties de fichier nécessaires (Grep/Glob avant Read, `offset`/`limit` si le fichier est gros).
- Lance les appels indépendants en parallèle, dans un seul message.
- Ne relis pas un fichier que tu viens d'éditer. Ne refais pas une recherche dont tu as déjà le résultat.
- Pas de sous-agents, sauf si l'utilisateur en demande.
- Préfère `Edit` (petit diff) à la réécriture complète d'un fichier.
- Ne montre pas dans le chat le code déjà écrit dans un fichier : donne le chemin `fichier:ligne`.

## Code
- Code correct, lisible et dans le style du projet existant (nommage, indentation, idiomes).
- Noms clairs, fonctions courtes, pas de code mort, pas de commentaires évidents.
- Gère les erreurs et les cas limites réalistes, sans sur-ingénierie.
- Vérifie avec la commande la plus rapide possible (lint, test ciblé, exécution) avant de dire que c'est fini. Si tu n'as pas pu vérifier, dis-le.
- Roblox/Luau : services via `game:GetService`, logique serveur dans `ServerScriptService`, jamais de confiance envers le client (valide tout dans les `RemoteEvent`), `task.wait`/`task.spawn` plutôt que `wait`/`spawn`.

## UI
- Simple, moderne et cohérente : une palette de 2 à 3 couleurs plus des neutres, une seule police, un espacement régulier (multiples de 4 ou 8 px).
- Hiérarchie claire : un titre, une action principale bien visible, des actions secondaires discrètes.
- Coins arrondis légers, contraste lisible, états hover/press/disabled.
- Responsive : fonctionne sur mobile (Roblox : `UIScale`/`Scale` plutôt qu'`Offset`, `UIListLayout`, `UIPadding`, `UICorner`, `UIStroke`).
- Petites animations douces seulement (`TweenService`, 0,15 à 0,25 s).

## Format de fin
Une ligne : ce qui a été fait, et ce qui reste éventuellement à faire.
