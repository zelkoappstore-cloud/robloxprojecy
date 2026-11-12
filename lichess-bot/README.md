# 🤖 Bot Lichess (Stockfish)

Un bot d'échecs très fort (plus de 3000 Elo) qui joue tout seul sur **Lichess**, via l'API officielle des bots.

## Installation sur Mac (une seule fois)

Ouvre l'app **Terminal**, puis :

```bash
# 1. Installe Homebrew si tu ne l'as pas : https://brew.sh
brew install stockfish python
cd chemin/vers/robloxprojecy/lichess-bot
pip3 install -r requirements.txt
cp config.example.env config.env
```

## Connexion à Lichess

1. Crée un **NOUVEAU compte** sur https://lichess.org.
   ⚠️ Le compte ne doit avoir joué **aucune partie**, et le passage en BOT est **définitif**. N'utilise pas ton compte perso.
2. Crée un token : https://lichess.org/account/oauth/token/create
   Coche **« Play games with the bot API » (bot:play)**, puis copie le token (`lip_…`).
3. Colle-le dans `config.env` à la ligne `LICHESS_TOKEN=`.
4. Transforme le compte en bot :
   ```bash
   python3 bot.py --upgrade
   ```

## Lancer le bot

```bash
python3 bot.py
```

Le bot attend les défis et les accepte automatiquement. Pour jouer contre lui, défie-le depuis un autre compte (va sur son profil, puis « Défier »). Pour l'arrêter : `Ctrl + C`.

## Réglages (`config.env`)

| Clé | Rôle |
|---|---|
| `MAX_MOVE_TIME` | Temps max par coup (s). Plus de temps, plus de force. |
| `THREADS` / `HASH` | Puissance de calcul de Stockfish. |
| `ACCEPT_RATED` | `false` pour n'accepter que les parties amicales. |

Le token est secret : `config.env` est ignoré par git.
