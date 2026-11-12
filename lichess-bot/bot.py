#!/usr/bin/env python3
"""Bot Lichess propulsé par Stockfish.

Usage :
    python3 bot.py --upgrade   # une seule fois : transforme le compte en compte BOT
    python3 bot.py             # lance le bot (accepte les défis et joue)
"""
import json
import os
import sys
import threading
import time

import chess
import chess.engine
import requests

API = "https://lichess.org"


def load_config():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.env")
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())
    token = os.environ.get("LICHESS_TOKEN", "")
    if not token or token == "COLLE_TON_TOKEN_ICI":
        sys.exit("❌ Mets ton token Lichess dans config.env (voir README.md).")
    return {
        "token": token,
        "stockfish": os.environ.get("STOCKFISH_PATH", "stockfish"),
        "max_time": float(os.environ.get("MAX_MOVE_TIME", "5")),
        "threads": int(os.environ.get("THREADS", "2")),
        "hash": int(os.environ.get("HASH", "256")),
        "accept_rated": os.environ.get("ACCEPT_RATED", "true").lower() == "true",
    }


CFG = load_config()
S = requests.Session()
S.headers["Authorization"] = f"Bearer {CFG['token']}"


def stream(path):
    """Lit un flux NDJSON de l'API Lichess, ligne par ligne."""
    with S.get(API + path, stream=True, timeout=(10, 120)) as r:
        r.raise_for_status()
        for line in r.iter_lines():
            if line:
                yield json.loads(line)


def post(path, data=None):
    r = S.post(API + path, data=data, timeout=15)
    if r.status_code >= 400:
        print(f"⚠️  {path} -> {r.status_code} {r.text[:200]}")
    return r


# --------------------------------------------------------------------------- #
#  Partie
# --------------------------------------------------------------------------- #
def play_game(game_id, my_id):
    print(f"♟️  Partie {game_id} : https://lichess.org/{game_id}")
    engine = chess.engine.SimpleEngine.popen_uci(CFG["stockfish"])
    engine.configure({"Threads": CFG["threads"], "Hash": CFG["hash"]})
    my_color = chess.WHITE
    initial_fen = chess.STARTING_FEN
    try:
        for ev in stream(f"/api/bot/game/stream/{game_id}"):
            if ev["type"] == "gameFull":
                my_color = chess.WHITE if ev["white"].get("id") == my_id else chess.BLACK
                if ev.get("initialFen") not in (None, "startpos"):
                    initial_fen = ev["initialFen"]
                state = ev["state"]
                post(f"/api/bot/game/{game_id}/chat",
                     {"room": "player", "text": "Bonne partie ! (bot Stockfish)"})
            elif ev["type"] == "gameState":
                state = ev
            else:
                continue

            if state["status"] != "started":
                print(f"🏁 Partie {game_id} terminée ({state['status']})")
                break

            board = chess.Board(initial_fen)
            for uci in state["moves"].split():
                board.push_uci(uci)
            if board.turn != my_color or board.is_game_over():
                continue

            move = choose_move(engine, board, state, my_color)
            post(f"/api/bot/game/{game_id}/move/{move.uci()}")
    except Exception as e:
        print(f"⚠️  Erreur dans la partie {game_id} : {e}")
    finally:
        engine.quit()


def choose_move(engine, board, state, color):
    """Gère le temps : ~1/30 du temps restant + incrément, plafonné."""
    t_key, i_key = ("wtime", "winc") if color == chess.WHITE else ("btime", "binc")
    remaining = state.get(t_key, 60000) / 1000
    inc = state.get(i_key, 0) / 1000
    think = min(CFG["max_time"], remaining / 30 + inc * 0.8)
    think = max(0.05, min(think, remaining - 0.5))  # ne jamais perdre au temps
    result = engine.play(board, chess.engine.Limit(time=think))
    return result.move


# --------------------------------------------------------------------------- #
#  Boucle principale
# --------------------------------------------------------------------------- #
def handle_challenge(ch):
    variant = ch["variant"]["key"]
    speed = ch.get("speed")
    ok_variant = variant in ("standard", "fromPosition", "chess960")
    ok_speed = speed != "correspondence"
    ok_rated = CFG["accept_rated"] or not ch.get("rated")
    who = ch["challenger"]["name"]
    if ok_variant and ok_speed and ok_rated:
        print(f"✅ Défi accepté de {who} ({speed}, {variant})")
        post(f"/api/challenge/{ch['id']}/accept")
    else:
        reason = "variant" if not ok_variant else "timeControl" if not ok_speed else "casual"
        print(f"🚫 Défi refusé de {who} ({reason})")
        post(f"/api/challenge/{ch['id']}/decline", {"reason": reason})


def main():
    me = S.get(API + "/api/account", timeout=15)
    if me.status_code == 401:
        sys.exit("❌ Token invalide. Recrée-le avec le scope « bot:play ».")
    me = me.json()

    if "--upgrade" in sys.argv:
        r = post("/api/bot/account/upgrade")
        sys.exit("🤖 Compte transformé en BOT !" if r.ok else "❌ Échec de l'upgrade.")

    if me.get("title") != "BOT":
        sys.exit("❌ Ce compte n'est pas encore un BOT. Lance d'abord : python3 bot.py --upgrade")

    print(f"🤖 Connecté en tant que {me['username']}. En attente de défis…")
    while True:
        try:
            for ev in stream("/api/stream/event"):
                if ev["type"] == "challenge":
                    handle_challenge(ev["challenge"])
                elif ev["type"] == "gameStart":
                    threading.Thread(target=play_game,
                                     args=(ev["game"]["gameId"], me["id"]),
                                     daemon=True).start()
        except KeyboardInterrupt:
            print("\n👋 Bot arrêté.")
            return
        except Exception as e:
            print(f"🔌 Connexion perdue ({e}), reconnexion dans 5 s…")
            time.sleep(5)


if __name__ == "__main__":
    main()
