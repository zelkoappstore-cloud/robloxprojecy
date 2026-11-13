"""Coque 3D parametrique pour Flipper Zero (100.3 x 40.1 x 25.6 mm).
Genere flipper_zero_case.stl (impression) et flipper_zero_case_orange.glb (apercu couleur).
Conseil : imprimer en TPU orange, face arriere sur le plateau, sans supports."""
import numpy as np, trimesh
from manifold3d import Manifold, CrossSection

L, W, H = 100.3, 40.1, 25.6      # Flipper Zero
CLR, WALL, BACK = 0.4, 2.0, 1.8  # jeu, epaisseur parois, epaisseur dos
LIP = 3.0                         # rebord avant qui retient l'appareil
R = 9.0                           # rayon des coins
ORANGE = [255, 130, 0, 255]

def rrect(l, w, r, h, z=0):
    cs = CrossSection.square([l - 2*r, w - 2*r], center=True).offset(r, CrossSection.JoinType.Round if hasattr(CrossSection,'JoinType') else 1, circular_segments=64)
    return Manifold.extrude(cs, h).translate([0, 0, z])

def box(sx, sy, sz, cx, cy, cz):
    return Manifold.cube([sx, sy, sz], center=True).translate([cx, cy, cz])

def cyl(d, h, cx, cy, cz):
    return Manifold.cylinder(h, d/2, d/2, 64, center=True).translate([cx, cy, cz])

iL, iW = L + 2*CLR, W + 2*CLR
oL, oW, oH = iL + 2*WALL, iW + 2*WALL, H + CLR + BACK + 1.0

# Coque exterieure avec bords adoucis (hull de 3 tranches)
shell = Manifold.batch_hull([rrect(oL-2, oW-2, R, 0.01, 0),
                             rrect(oL, oW, R+1, oH-2, 1),
                             rrect(oL-2, oW-2, R, 0.01, oH-0.01)])
cavity = rrect(iL, iW, R-1, H + CLR, BACK)
front = rrect(iL - 2*LIP, iW - 2*LIP, R-3, 10, oH - 5)
case = shell - cavity - front

zc = BACK + H/2  # milieu de l'epaisseur de l'appareil
cuts = [
    box(54, 10, 9, 20, oW/2, BACK + H - 6),          # GPIO (bord superieur)
    box(10, 26, 12, -oL/2, 0, zc + 2),                # fenetre IR (cote gauche)
    box(10, 14, 8, oL/2, -4, zc),                     # USB-C (cote droit)
    box(18, 10, 6, -28, -oW/2, zc),                   # microSD (bord inferieur)
    cyl(10, 10, -34, 0, BACK/2),                      # trou dos (sortie / logo)
    box(8, 4, 10, oL/2 - 6, oW/2 - 6, BACK/2),         # passage dragonne
]
for c in cuts:
    case = case - c

m = case.to_mesh()
mesh = trimesh.Trimesh(m.vert_properties[:, :3], m.tri_verts)
mesh.export("flipper_zero_case.stl")
mesh.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(baseColorFactor=ORANGE, roughnessFactor=0.6))
mesh.export("flipper_zero_case_orange.glb")
print("watertight:", mesh.is_watertight, "dims:", np.round(mesh.extents, 1), "vol cm3:", round(mesh.volume/1000, 1))
