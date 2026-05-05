---
title: Sécurité & auth
description: Comment purplemux protège votre tableau de bord — mot de passe haché en scrypt, données local-only, et HTTPS pour l'accès externe.
eyebrow: Mobile & distant
permalink: /fr/docs/security-auth/index.html
---
{% from "docs/callouts.njk" import callout %}

purplemux est auto-hébergé et reste sur votre machine. Pas de serveurs externes, pas de télémétrie, pas de compte cloud. Tout ce qui suit décrit les quelques pièces qui gardent réellement votre tableau de bord.

## Configuration du mot de passe

La première fois que vous ouvrez purplemux, l'écran d'onboarding vous demande de choisir un mot de passe. Après envoi :

- Le mot de passe est haché avec **scrypt** (sel aléatoire de 16 octets, clé dérivée de 64 octets).
- Le hash est écrit dans `~/.purplemux/config.json` sous la forme `scrypt:{sel}:{hash}` — le clair n'est jamais stocké.
- Un `authSecret` séparé (hex aléatoire) est généré et stocké à côté. purplemux l'utilise pour signer le cookie de session émis après login.

Les visites suivantes affichent un écran de login qui vérifie votre mot de passe avec `crypto.timingSafeEqual` contre le hash stocké.

{% call callout('note', 'Longueur du mot de passe') %}
Le minimum est court (4 caractères) pour que les setups localhost-only ne soient pas pénibles. Si vous exposez purplemux à un tailnet — ou ailleurs —, choisissez quelque chose de plus solide. Les logins échoués sont rate-limités à 16 tentatives par 15 minutes par processus.
{% endcall %}

## Réinitialiser le mot de passe

Oublié ? Il vous suffit d'un accès shell sur l'hôte :

```bash
rm ~/.purplemux/config.json
```

Redémarrez purplemux (`pnpm start`, `npx purplemux@latest`, ou la méthode que vous avez utilisée) et l'écran d'onboarding réapparaît pour que vous puissiez choisir un nouveau mot de passe.

Cela efface les autres paramètres stockés dans le même fichier (thème, locale, taille de police, toggle notifications, etc.). Vos espaces de travail et onglets vivent dans `workspaces.json` et le répertoire `workspaces/`, donc les mises en page sont préservées.

## HTTPS pour l'accès externe

Le bind par défaut est `localhost`, servi en HTTP simple. C'est OK sur la même machine — mais dès que vous atteignez purplemux depuis un autre appareil, vous devriez être en HTTPS.

- **Tailscale Serve** est le chemin recommandé : chiffrement WireGuard plus certs Let's Encrypt automatiques. Voir [Accès Tailscale](/purplemux/fr/docs/tailscale/).
- **Reverse proxy** (Nginx, Caddy, etc.) marche aussi, tant que vous transmettez les en-têtes WebSocket `Upgrade` et `Connection`.

iOS Safari demande de plus HTTPS pour l'installation PWA et l'enregistrement Web Push. Voir [Configuration PWA](/purplemux/fr/docs/pwa-setup/) et [Web Push](/purplemux/fr/docs/web-push/).

## Ce qui vit dans `~/.purplemux/`

Tout est local. Les permissions sur les fichiers sensibles sont `0600`.

| Fichier | Ce qu'il contient |
|---|---|
| `config.json` | hash scrypt du mot de passe, secret de session, préférences app |
| `workspaces.json` + `workspaces/` | liste d'espaces et mises en page volet/onglet par espace |
| `vapid-keys.json` | paire de clés VAPID Web Push (auto-générée) |
| `push-subscriptions.json` | souscriptions push par appareil |
| `cli-token` | token partagé pour que hooks/CLI parlent au serveur local |
| `pmux.lock` | lock d'instance unique (`pid`, `port`, `startedAt`) |
| `logs/` | fichiers de log pino tournants |

Pour l'inventaire complet et le tableau de reset, voir le listing source-of-truth dans [docs/DATA-DIR.md](https://github.com/subicura/purplemux/blob/main/docs/DATA-DIR.md).

## Pas de télémétrie

purplemux ne fait aucune requête sortante de lui-même. Les seuls appels réseau qu'il initie sont :

- Les notifications Web Push auxquelles vous avez souscrit, envoyées via les services push d'OS.
- Ce que fait la CLI Claude elle-même — c'est entre vous et Anthropic, pas purplemux.

Code et données de session ne quittent jamais votre machine.

## Pour aller plus loin

- **[Accès Tailscale](/purplemux/fr/docs/tailscale/)** — le chemin sûr vers le HTTPS externe.
- **[Configuration PWA](/purplemux/fr/docs/pwa-setup/)** — une fois l'auth réglée, installer sur l'écran d'accueil.
- **[Notifications Web Push](/purplemux/fr/docs/web-push/)** — alertes en arrière-plan.
