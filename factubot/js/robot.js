import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const shell = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .28, metalness: .15, clearcoat: 1, clearcoatRoughness: .15 });
const metal = new THREE.MeshStandardMaterial({ color: 0x3a414c, roughness: .35, metalness: .9 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x1e2228, roughness: .85 });
const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x05070b, roughness: .05, metalness: .3, clearcoat: 1 });

function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}

// membre articule : pivot -> segment -> articulation -> pivot suivant
function limb(parent, x, y, len, r, mat) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, 0); parent.add(pivot);
  mesh(new THREE.SphereGeometry(r * 1.25, 20, 14), metal, pivot);
  mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat, pivot, 0, -len / 2 - r * .4, 0);
  const joint = new THREE.Group(); joint.position.y = -len - r; pivot.add(joint);
  mesh(new THREE.SphereGeometry(r * 1.1, 18, 12), metal, joint);
  return { pivot, joint };
}

export class Robot {
  constructor(name, color, accent) {
    this.name = name; this.color = color;
    const body = shell(0xf4f6f9), paint = shell(color);
    const glow = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2.2 });
    this.glow = glow;
    const g = this.root = new THREE.Group();
    const hips = this.hips = new THREE.Group(); hips.position.y = 1.02; g.add(hips);
    mesh(new RoundedBoxGeometry(.62, .2, .36, 3, .08), metal, hips);

    // jambes
    this.legs = [-.2, .2].map(x => {
      const l = limb(hips, x, -.06, .34, .085, body);
      mesh(new THREE.CapsuleGeometry(.075, .3, 6, 14), paint, l.joint, 0, -.2, 0);
      const foot = mesh(new RoundedBoxGeometry(.2, .1, .32, 3, .04), rubber, l.joint, 0, -.42, .05);
      return { ...l, foot };
    });

    // torse
    const torso = this.torso = new THREE.Group(); torso.position.y = .14; hips.add(torso);
    mesh(new THREE.CylinderGeometry(.16, .2, .16, 20), metal, torso, 0, .06, 0);
    const chest = mesh(new RoundedBoxGeometry(.78, .62, .5, 5, .16), body, torso, 0, .46, 0);
    mesh(new RoundedBoxGeometry(.5, .3, .06, 3, .03), paint, chest, 0, .02, .25);
    this.core = mesh(new THREE.CircleGeometry(.07, 24), glow, chest, 0, .03, .285);
    for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(.06, .02, .01), glow, chest, -.15 + i * .15, -.2, .255);
    const pack = mesh(new RoundedBoxGeometry(.5, .46, .2, 3, .06), paint, chest, 0, 0, -.3);
    for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(.36, .025, .02), metal, pack, 0, -.14 + i * .09, -.1);

    // tete
    const neck = this.neck = new THREE.Group(); neck.position.y = .8; torso.add(neck);
    mesh(new THREE.CylinderGeometry(.08, .1, .12, 16), metal, neck, 0, .02, 0);
    const head = this.head = new THREE.Group(); head.position.y = .28; neck.add(head);
    mesh(new RoundedBoxGeometry(.6, .44, .48, 6, .18), body, head);
    mesh(new RoundedBoxGeometry(.5, .24, .1, 4, .08), visorMat, head, 0, .01, .21);
    this.eyes = [-.11, .11].map(x => mesh(new RoundedBoxGeometry(.1, .07, .02, 2, .03), glow, head, x, .02, .265));
    [-.32, .32].map(x => mesh(new THREE.CylinderGeometry(.08, .08, .06, 20), paint, head, x, 0, 0).rotation.z = Math.PI / 2);
    mesh(new THREE.CylinderGeometry(.012, .012, .26, 8), metal, head, .12, .34, -.06);
    this.tip = mesh(new THREE.SphereGeometry(.045, 16, 12), glow, head, .12, .48, -.06);

    // bras
    this.arms = [-1, 1].map(s => {
      const a = limb(torso, s * .5, .64, .28, .075, paint);
      mesh(new THREE.CapsuleGeometry(.07, .22, 6, 14), body, a.joint, 0, -.18, 0);
      const hand = new THREE.Group(); hand.position.y = -.36; a.joint.add(hand);
      mesh(new RoundedBoxGeometry(.14, .1, .14, 2, .04), metal, hand);
      [-.04, .04].forEach(z => mesh(new RoundedBoxGeometry(.04, .12, .04, 2, .015), rubber, hand, 0, -.09, z));
      a.pivot.rotation.z = s * .08;
      return a;
    });

    // objet porte
    this.cargo = mesh(new RoundedBoxGeometry(.34, .3, .34, 3, .04), new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: .7 }), torso, 0, .42, .46);
    this.cargo.visible = false;

    this.t = Math.random() * 10; this.mode = 'idle'; this.speed = 0;
  }

  update(dt) {
    this.t += dt;
    const t = this.t, w = this.speed > .05 ? 1 : 0, ph = t * 9;
    const [L, R] = this.legs, [AL, AR] = this.arms;
    const sw = Math.sin(ph) * .55 * w;
    L.pivot.rotation.x = sw; R.pivot.rotation.x = -sw;
    L.joint.rotation.x = Math.max(0, -Math.sin(ph)) * .8 * w;
    R.joint.rotation.x = Math.max(0, Math.sin(ph)) * .8 * w;
    this.hips.position.y = 1.02 + Math.abs(Math.cos(ph)) * .05 * w + Math.sin(t * 2) * .01;
    this.torso.rotation.z = Math.sin(ph) * .04 * w;
    let al = -sw * .8, ar = sw * .8, el = -.25, er = -.25;
    this.neck.rotation.set(0, Math.sin(t * .7) * .25, 0); this.head.rotation.set(0, 0, 0);
    this.torso.rotation.x = 0;
    if (this.cargo.visible) { al = ar = -1.1; el = er = -.5; }
    if (this.mode === 'work') { ar = -1.6 + Math.sin(t * 12) * .6; er = -.6; al = -.9; this.torso.rotation.x = .15; }
    if (this.mode === 'think') { ar = -2.3; er = -1.9; this.head.rotation.z = Math.sin(t * 1.5) * .18; this.neck.rotation.y = .4; }
    if (this.mode === 'fail') { this.torso.rotation.x = .35; this.head.rotation.x = .4; al = ar = .1; el = er = 0; }
    if (this.mode === 'happy') { al = ar = -2.8 + Math.sin(t * 14) * .2; el = er = 0; this.hips.position.y += Math.abs(Math.sin(t * 8)) * .22; }
    if (this.mode === 'conduct') { // chef d'orchestre : bras droit qui bat la mesure, bras gauche qui guide
      ar = -2.1 + Math.sin(t * 3.2) * .6; er = -.5 + Math.sin(t * 3.2 + 1) * .45; al = -1.2 + Math.sin(t * 1.6) * .35; el = -.9;
      this.torso.rotation.z = Math.sin(t * 1.6) * .06; this.head.rotation.x = -.1;
    }
    if (this.mode === 'sit') { // assis devant le PC : jambes pliees, mains qui tapent au clavier
      this.hips.position.y = .74; L.pivot.rotation.x = R.pivot.rotation.x = -1.5; L.joint.rotation.x = R.joint.rotation.x = 1.45;
      al = -1.05 + Math.sin(t * 16) * .08; ar = -1.05 + Math.sin(t * 16 + 2) * .08; el = er = -.55;
      this.neck.rotation.y = Math.sin(t * .9) * .15; this.head.rotation.x = .12;
    }
    AL.pivot.rotation.x = al; AR.pivot.rotation.x = ar; AL.joint.rotation.x = el; AR.joint.rotation.x = er;
    const blink = (t % 4) < .12 ? .1 : 1;
    this.eyes.forEach(e => e.scale.y = this.mode === 'fail' ? .35 : blink);
    this.glow.emissiveIntensity = this.mode === 'think' ? 1.5 + Math.sin(t * 10) : 2.2;
    this.tip.scale.setScalar(1 + Math.sin(t * 5) * .2);
  }
}
