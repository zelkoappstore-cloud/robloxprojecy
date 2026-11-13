"""Coque 3D pour Flipper Zero, construite autour du modele officiel
(github.com/flipperdevices/flipperzero-3d-models, GPL-3.0, copie dans reference/).

Repere du modele officiel : x = largeur (-x = bord GPIO), y = longueur
(-y = pointe IR), z = epaisseur (+z = face ecran).
Conseil : imprimer en TPU orange, dos sur le plateau, sans supports."""
import numpy as np, trimesh
from manifold3d import Manifold

CLR, WALL, LIP = 0.3, 1.8, 2.55    # jeu, paroi, rebord avant qui retient l'appareil
ORANGE = [1.0, 0.51, 0.0, 1.0]

dev = trimesh.load("reference/flipper-zero-body-3d.stl")
(x0, y0, z0), (x1, y1, z1) = dev.bounds          # 40.1 x 100.3 x 25.6 mm
xc = (x0 + x1) / 2

hull_pts = dev.convex_hull.vertices
sphere = trimesh.creation.icosphere(1).vertices    # 42 directions

def offset_hull(r):
    pts = (hull_pts[:, None, :] + r * sphere[None, :, :]).reshape(-1, 3)
    pts = np.unique(np.round(pts, 2), axis=0)
    return Manifold.hull_points(pts)

def box(xa, xb, ya, yb, za, zb):
    return Manifold.cube([xb - xa, yb - ya, zb - za]).translate([xa, ya, za])

outer = offset_hull(CLR + WALL)
cavity = offset_hull(CLR)
# Ouverture avant : contour de la face ecran, retreci du rebord
sec = cavity.slice(z1 - 0.4)
from manifold3d import CrossSection, JoinType
front = Manifold.extrude(sec.offset(-LIP, JoinType.Round), 10).translate([0, 0, z1 - 2])
case = outer - cavity - front

E = 6  # profondeur de coupe a travers la paroi
cuts = {
    # bord GPIO (-x) : 18 broches de y=-1.5 a 57.5, axe z=-8.3 (plan officiel 14.75 mm depuis le dos)
    "GPIO":     box(x0 - E, x0 + 2, -4.5, 60.5, -12.0, -4.6),
    # bord oppose (+x) : fente microSD y 47.5..59.5, z -9.5..-7.5
    "microSD":  box(x1 - 2, x1 + E, 45.5, 61.5, -11.5, -5.5),
    # extremite plate (+y) : USB-C x -13..-6, z -9.5..-7.5
    "USB-C":    box(-15.0, -4.0, y1 - 2, y1 + E, -12.0, -5.0),
    # oeillet de dragonne (coin +x/+y)
    "dragonne": box(-1.0, x1 + E, 68.5, y1 + E, -15.0, -9.5),
    # pointe (-y) : fenetre infrarouge, 5.7..14.1 mm depuis le dos sur le plan
    "IR":       box(xc - 7.5, xc + 7.5, y0 - E, y0 + 7, -18.5, -6.5),
    # dos : contact iButton (1-Wire) pres de la pointe
    "iButton":  box(-19.0, -1.5, -21.0, -8.5, z0 - E, z0 + 1.5),
}
for c in cuts.values():
    case = case - c

def tm(man):
    m = man.to_mesh()
    t = trimesh.Trimesh(m.vert_properties[:, :3], m.tri_verts)
    t.merge_vertices(); return t

mesh = tm(case.set_tolerance(0.01))
mesh.apply_translation([-xc, -(y0 + y1) / 2, -z0 + CLR + WALL])   # centre, dos a z=0
mesh.export("flipper_zero_case.stl")

pbr = trimesh.visual.material.PBRMaterial
mesh.visual = trimesh.visual.TextureVisuals(material=pbr(baseColorFactor=ORANGE, roughnessFactor=0.55))
ghost = dev.copy(); ghost.apply_translation([-xc, -(y0 + y1) / 2, -z0 + CLR + WALL])
ghost.visual = trimesh.visual.TextureVisuals(material=pbr(baseColorFactor=[0.93, 0.93, 0.92, 1], roughnessFactor=0.7))
trimesh.Scene({"coque": mesh}).export("flipper_zero_case_orange.glb")
trimesh.Scene({"coque": mesh, "flipper": ghost}).export("apercu_avec_flipper.glb")
print("etanche:", mesh.is_watertight, "dims:", np.round(mesh.extents, 1), "vol cm3:", round(mesh.volume / 1000, 1))
