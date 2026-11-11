# Construit agent.html (page 2D) à partir de agent.src.html et des modules communs.
import pathlib
here = pathlib.Path(__file__).parent
page = (here / 'agent.src.html').read_text(encoding='utf-8')
for tag, name in (('/*BRAIN*/', 'brain.js'), ('/*SCREEN*/', 'screen.js'), ('/*GOALS*/', 'goals.js')):
    page = page.replace(tag, (here / name).read_text(encoding='utf-8'))
(here / 'agent.html').write_text(page, encoding='utf-8')
print('agent.html construit')
