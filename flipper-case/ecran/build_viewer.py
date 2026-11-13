"""Assemble la page d'apercu autonome (modele 3D + ecran + ressources) : apercu.html"""
import base64, os, sys
here = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(here, "viewer_template.html")).read()
t = t.replace("/*ASSETS*/", open(os.path.join(here, "assets.js")).read())
t = t.replace("/*SCREEN*/", open(os.path.join(here, "fz-screen.js")).read())
t = t.replace("/*GLB*/", base64.b64encode(open(os.path.join(here, "..", "apercu_avec_flipper.glb"), "rb").read()).decode())
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "apercu.html")
open(out, "w").write(t); print(out, len(t))
