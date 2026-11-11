# Construit station.html : la page du poste 3D, à partir du cerveau (brain.js) et du skin (skin3d.html).
# Usage : python3 build_station.py
import pathlib

here = pathlib.Path(__file__).parent
skin = (here / 'skin3d.html').read_text(encoding='utf-8')
start = skin.index('<script>\n(() => {') + len('<script>\n')
end = skin.rindex('</script>')
js = skin[start:end]

replacements = [
    # Pas de démo automatique : c'est le poste qui pilote les animations
    ("let current = 'repos', since = 0, auto = true;", "let current = 'repos', since = 0, auto = false;"),
    ("    if (fromUser) { auto = false; document.getElementById('auto').setAttribute('aria-pressed', 'false'); }\n", ""),
    ("    document.querySelectorAll('[data-a]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.a === name)));\n", ""),
    # Le clavier peut rester affiché en permanence
    ("kbSpring.step(P.keyboard ? 1 : 0.001, dt)", "kbSpring.step(P.keyboard || window.SKIN_KB ? 1 : 0.001, dt)"),
    # La caméra est placée par le poste
    ("    const dist = w / h < 0.8 ? 10.5 : 7.2;\n    camera.position.set(0, 0.5, dist);\n    camera.lookAt(0, -0.2, 0);\n",
     "    if (window.SKIN && window.SKIN.setCamera) window.SKIN.setCamera(camera, w, h);\n    else { const dist = w / h < 0.8 ? 10.5 : 7.2; camera.position.set(0, 0.5, dist); camera.lookAt(0, -0.2, 0); }\n"),
    ("  addEventListener('pointermove', e => { pointer.set(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); });\n", ""),
    ("  document.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => setAnim(b.dataset.a, true)));\n", ""),
    ("  document.getElementById('auto').addEventListener('click', ev => {\n    auto = !auto; ev.currentTarget.setAttribute('aria-pressed', String(auto)); since = 0;\n  });\n", ""),
    ("const LABEL = { repos: 'repos',", "const LABEL = { souris: 'utiliser la souris', repos: 'repos',"),
    # Le robot flotte moins quand il travaille, et sa hauteur de base peut être réglée par le poste
    ("    agent.position.y = Math.sin(t * 1.6) * 0.05 + bounceSpring.step(P.bounce || 0, dt);",
     "    agent.position.y = (window.SKIN_BASEY || 0) + Math.sin(t * 1.6) * ((P.keyboard || P.still) ? 0.012 : 0.05) + bounceSpring.step(P.bounce || 0, dt);"),
    ("  window.__skin = { setAnim };",
     "  window.SKIN = { THREE, scene, camera, renderer, agent, head, hands, keyboard, POSES, setAnim, pointer, M, V, E, resize, time: () => t };"),
]
for old, new in replacements:
    assert old in js, old[:70]
    js = js.replace(old, new)

page = (here / 'station.src.html').read_text(encoding='utf-8')
page = page.replace('/*BRAIN*/', (here / 'brain.js').read_text(encoding='utf-8'))
page = page.replace('/*SKIN*/', js)
(here / 'station.html').write_text(page, encoding='utf-8')
print('station.html construit')
