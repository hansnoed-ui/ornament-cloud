// ORNAMENT FORMEN 0.1 – die 16 Formfamilien des Katalogs, geordnet nach Ordnung (wie sich etwas wiederholt),
// Element (was sich wiederholt) und Verfahren (wie es entsteht). Jede Familie baut aus einem Zufall mit Startwert
// eine Form; «update(t)» bewegt sie, falls sie sich in der Zeit verändert.
import { T, TAU, pick, roehre, staebe, perlen, stacheln, flaeche, knopf, polyeder } from './gemeinsam.js?v=1';

export const ABSCHNITTE = [
  { id: 'ordnung', titel: 'Ordnung', satz: 'Wie sich etwas wiederholt.' },
  { id: 'element', titel: 'Element', satz: 'Was sich wiederholt.' },
  { id: 'verfahren', titel: 'Verfahren', satz: 'Wie es entsteht.' }
];

export function familien(m) {
  return [
    // ----- Ordnung -----
    { abschnitt: 'ordnung', name: 'Rosette', text: 'Drehung um einen Punkt. Drei Ringe, jeder mit eigenem Tempo.', neigung: -0.7, start: 2471,
      bau(r) {
        const g = new T.Group(), S = 5 + Math.floor(r() * 8), verh = [1, 2 / 3, 3 / 4, 4 / 5, 3 / 5, 5 / 4, 1 / 2], ringe = [];
        for (let i = 0; i < 3; i++) {
          const Ri = 0.38 + i * 0.34, mult = (i > 0 && r() < 0.35) ? 2 : 1, k = S * mult;
          const art = i === 0 ? pick(r, ['rose', 'welle']) : pick(r, ['rose', 'welle', 'kordel']);
          const a = (0.06 + r() * 0.1) * (art === 'kordel' ? 0.55 : 1) * (mult === 2 ? 0.7 : 1);
          const b = 0.05 + r() * 0.12, ph = r() * TAU;
          const fn = (t, v) => {
            const th = t * TAU; let rr, z;
            if (art === 'rose') { rr = Ri + a * Math.cos(k * th); z = b * Math.sin(k * th + ph); }
            else if (art === 'welle') { rr = Ri + a * 0.45 * Math.cos(2 * k * th); z = b * Math.cos(k * th); }
            else { rr = Ri + a * Math.cos(2 * k * th); z = a * 1.1 * Math.sin(2 * k * th); }
            return v.set(rr * Math.cos(th), rr * Math.sin(th), z);
          };
          const rad = 0.02 * (art === 'kordel' ? 0.7 : 1);
          const mesh = roehre(fn, Math.min(1400, Math.max(200, k * (art === 'kordel' ? 56 : 30))), rad, i % 2 ? m.b : m.a);
          if (r() < 0.6) {
            const n = art === 'kordel' ? S : k, off = art === 'welle' ? 0.5 : 0, liste = [];
            for (let j = 0; j < n; j++) liste.push({ p: fn((j + off) / n, new T.Vector3()), r: rad * 2 });
            mesh.add(perlen(liste, m.perle));
          }
          g.add(mesh); ringe.push({ mesh, tempo: pick(r, verh) * (i % 2 ? -1 : 1) });
        }
        g.add(knopf(0.16, 0.1, 2, S * 6, m.beidseitig));
        return { obj: g, info: `${S}-zählig`, update: t => ringe.forEach(x => { x.mesh.rotation.z = t * 0.3 * x.tempo; }) };
      } },

    { abschnitt: 'ordnung', name: 'Fries', text: 'Wiederholung entlang einer Linie, hier um eine Säule gelegt. Es gibt genau 7 Friesgruppen.', neigung: 0.2, start: 1307,
      bau(r) {
        const g = new T.Group(), Rc = 0.5, H = 1.7, nb = 3 + Math.floor(r() * 3), namen = [];
        g.add(new T.Mesh(new T.CylinderGeometry(Rc * 0.9, Rc * 0.9, H * 1.02, 64), m.b));
        for (let j = 0; j < nb; j++) {
          const y = -H / 2 + (j + 0.5) * H / nb, bh = H / nb * 0.3;
          const k = 6 + Math.floor(r() * 9), art = pick(r, ['Welle', 'Zinnen', 'Zickzack', 'Schlaufen']);
          namen.push(art);
          const fn = (t, v) => {
            const th = t * TAU, s = k * th; let a = th, dy;
            if (art === 'Welle') dy = Math.sin(s);
            else if (art === 'Zinnen') dy = Math.tanh(3.5 * Math.sin(s)) / Math.tanh(3.5);
            else if (art === 'Zickzack') dy = (2 / Math.PI) * Math.asin(Math.sin(s));
            else { a = th - (1.7 / k) * Math.sin(s); dy = Math.cos(s); }
            return v.set(Rc * Math.cos(a), y + dy * bh, Rc * Math.sin(a));
          };
          g.add(roehre(fn, Math.min(1400, k * 48), 0.017, m.a));
        }
        for (let j = 0; j <= nb; j++) {
          const rand = new T.Mesh(new T.TorusGeometry(Rc * 0.93, 0.014, 8, 96), m.perle);
          rand.rotation.x = Math.PI / 2; rand.position.y = -H / 2 + j * H / nb; g.add(rand);
        }
        return { obj: g, info: namen.join(' · ') };
      } },

    { abschnitt: 'ordnung', name: 'Fläche', text: 'Ein Flächenmuster, auf einen Torus gelegt. Es gibt genau 17 Flächengruppen.', neigung: -0.55, start: 5821,
      bau(r) {
        const mu = pick(r, [10, 12, 14, 16, 18, 20, 24]), nu = pick(r, [3, 4, 5, 6]);
        const art = pick(r, ['Quadrat', 'Raute', 'Sechseck']), amp = 0.05, R = 0.62, rr = 0.26;
        const geo = flaeche(280, 100, true, true, (u, v, out) => {
          const U = TAU * u, V = TAU * v, a = mu * U, b = nu * V;
          const f = art === 'Quadrat' ? Math.cos(a) * Math.cos(b)
            : art === 'Raute' ? Math.cos(a + b) * Math.cos(a - b)
            : (Math.cos(a) + Math.cos(b) + Math.cos(a + b)) / 1.5 - 0.33;
          const d = amp * Math.sign(f) * Math.pow(Math.abs(f), 0.7);
          const cu = Math.cos(U), su = Math.sin(U), cv = Math.cos(V), sv = Math.sin(V);
          return out.set((R + (rr + d) * cv) * cu, (rr + d) * sv, (R + (rr + d) * cv) * su);
        });
        return { obj: new T.Mesh(geo, m.a), info: `${art}, ${mu} × ${nu}` };
      } },

    { abschnitt: 'ordnung', name: 'Körper', text: 'Symmetrie eines Polyeders: jede Ecke ist gleichwertig. Radiolarien, Sterne, Kugelornamente.', neigung: -0.3, start: 911,
      bau(r) {
        const art = pick(r, ['Ikosaeder', 'Oktaeder', 'Dodekaeder']);
        const fein = art === 'Dodekaeder' ? 0 : (r() < 0.5 ? 0 : 1);
        const geo = art === 'Ikosaeder' ? new T.IcosahedronGeometry(1, fein)
          : art === 'Oktaeder' ? new T.OctahedronGeometry(1, fein) : new T.DodecahedronGeometry(1, 0);
        const { ecken, kanten } = polyeder(geo); geo.dispose();
        const g = new T.Group(), er = 0.022;
        g.add(staebe(kanten.map(([a, b]) => [ecken[a], ecken[b], er]), m.a));
        g.add(perlen(ecken.map(p => ({ p, r: 0.05 })), m.perle));
        g.add(stacheln(ecken, 0.25 + r() * 0.5, 0.045, m.b));
        if (r() < 0.65) {
          const innen = ecken.map(p => p.clone().multiplyScalar(0.45));
          g.add(staebe(kanten.map(([a, b]) => [innen[a], innen[b], er * 0.8]), m.b));
          g.add(staebe(ecken.map((p, i) => [innen[i], p, er * 0.55]), m.a));
        }
        return { obj: g, info: art + (fein ? ', unterteilt' : '') };
      } },

    { abschnitt: 'ordnung', name: 'Raumgitter', text: 'Wiederholung in drei Richtungen, aus einer Grundform geschnitten. Es gibt 230 Raumgruppen.', neigung: -0.45, drehung: 0.6, start: 4402,
      bau(r) {
        const art = pick(r, ['kubisch', 'raumzentriert', 'flächenzentriert']);
        const form = pick(r, ['Kugel', 'Oktaeder', 'Würfel']);
        const drin = p => form === 'Kugel' ? p.length() <= 2.6
          : form === 'Oktaeder' ? Math.abs(p.x) + Math.abs(p.y) + Math.abs(p.z) <= 3.6
          : Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) <= 2.01;
        const pts = [], N = 3;
        for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) for (let k = -N; k <= N; k++) {
          if (art === 'flächenzentriert' && ((i + j + k) & 1)) continue;
          const p = new T.Vector3(i, j, k); if (drin(p)) pts.push(p);
          if (art === 'raumzentriert' && i < N && j < N && k < N) {
            const q = new T.Vector3(i + 0.5, j + 0.5, k + 0.5); if (drin(q)) pts.push(q);
          }
        }
        const dmin = art === 'kubisch' ? 1 : art === 'raumzentriert' ? Math.sqrt(3) / 2 : Math.SQRT2;
        const st = [];
        for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++)
          if (Math.abs(pts[a].distanceTo(pts[b]) - dmin) < 0.01) st.push([pts[a], pts[b], 0.05]);
        const g = new T.Group();
        g.add(staebe(st, m.a));
        g.add(perlen(pts.map(p => ({ p, r: 0.11 })), m.perle));
        return { obj: g, info: `${art}, ${form}` };
      } },

    { abschnitt: 'ordnung', name: 'Quasiperiodisch', text: 'Geordnet, aber nie exakt wiederholt. Wellen aus n Richtungen überlagert, wie bei Quasikristallen.', neigung: -0.95, start: 7319,
      bau(r) {
        const N = pick(r, [5, 7, 8, 9, 12]), f = 18 + r() * 14, sym = r() < 0.6, amp = 0.05;
        const ph = [], dirs = [];
        for (let k = 0; k < N; k++) { const al = Math.PI * k / N; dirs.push([Math.cos(al), Math.sin(al)]); ph.push(sym ? 0 : r() * TAU); }
        const geo = flaeche(100, 360, false, true, (u, v, out) => {
          const x = u * Math.cos(TAU * v), y = u * Math.sin(TAU * v);
          let s = 0; for (let k = 0; k < N; k++) s += Math.cos(f * (x * dirs[k][0] + y * dirs[k][1]) + ph[k]);
          return out.set(x, y, amp * (s / N) * 2 * (1 - Math.pow(u, 8)));
        });
        const g = new T.Group();
        g.add(new T.Mesh(geo, m.beidseitig));
        g.add(new T.Mesh(new T.TorusGeometry(1, 0.022, 10, 180), m.perle));
        return { obj: g, info: `${N} Richtungen${sym ? ', symmetrische Mitte' : ''}` };
      } },

    { abschnitt: 'ordnung', name: 'Ähnlichkeit', text: 'Wiederholung mit Massstabswechsel: Sonnenblume, Schnecke, Spirale.', neigung: -0.5, start: 3156,
      bau(r) {
        if (r() < 0.5) {
          const n = 460, gold = Math.PI * (3 - Math.sqrt(5)), h = 0.3 + r() * 0.4, par = pick(r, [8, 13, 21]);
          const A = [], B = [];
          for (let i = 1; i <= n; i++) {
            const rr = Math.sqrt(i / n), th = i * gold;
            const b = { p: new T.Vector3(rr * Math.cos(th), rr * Math.sin(th), h * (1 - rr * rr)), r: 0.012 + 0.04 * rr };
            (i % par === 0 ? B : A).push(b);
          }
          const g = new T.Group(); g.add(perlen(A, m.a)); g.add(perlen(B, m.perle));
          g.position.z = -h / 2;
          const w = new T.Group(); w.add(g);
          return { obj: w, info: `Sonnenblume, Spiralen zu ${par}` };
        }
        const wind = 3.2 + r() * 2, bb = 0.11 + r() * 0.07, rippen = 8 + Math.floor(r() * 10);
        const geo = flaeche(420, 48, false, true, (u, v, out) => {
          const th = -wind * TAU * (1 - u), e = Math.exp(bb * th), V = TAU * v;
          const rip = 1 + 0.05 * Math.sin(rippen * th);
          return out.set(e * (1.1 + Math.cos(V) * rip) * Math.cos(th), e * (1.1 + Math.cos(V) * rip) * Math.sin(th), e * (Math.sin(V) * rip - 1.5));
        });
        geo.center();
        return { obj: new T.Mesh(geo, m.beidseitig), info: `Schnecke, ${wind.toFixed(1)} Windungen` };
      } },

    // ----- Element -----
    { abschnitt: 'element', name: 'Linie', text: 'Eine Kurve wird zum Körper. Knoten, die sich nicht lösen lassen.', neigung: -0.3, start: 6643,
      bau(r) {
        if (r() < 0.5) {
          const [p, q] = pick(r, [[2, 3], [2, 5], [3, 4], [3, 5], [3, 7], [4, 5], [5, 6], [2, 7]]);
          return { obj: new T.Mesh(new T.TorusKnotGeometry(0.7, 0.07, 900, 16, p, q), m.a), info: `Torusknoten (${p}, ${q})` };
        }
        const [nx, ny, nz] = pick(r, [[3, 2, 5], [3, 2, 7], [2, 3, 7], [3, 4, 5], [2, 5, 7], [4, 3, 5]]);
        const px = r() * TAU, py = r() * TAU, pz = r() * TAU;
        const fn = (t, v) => v.set(Math.cos(nx * TAU * t + px), Math.cos(ny * TAU * t + py), Math.cos(nz * TAU * t + pz));
        return { obj: roehre(fn, 1000, 0.045, m.a), info: `Lissajousknoten (${nx}, ${ny}, ${nz})` };
      } },

    { abschnitt: 'element', name: 'Band', text: 'Eine Fläche entlang einer Kurve. Mit einer halben Drehung wird es zum Möbiusband.', neigung: -0.7, start: 2210,
      bau(r) {
        const k = 3 + Math.floor(r() * 6), hd = pick(r, [1, 2, 3, 5]), w = 0.1 + r() * 0.1;
        const a = 0.08 + r() * 0.1, b = 0.1 + r() * 0.15;
        const C = (u, v) => { const th = TAU * u, rr = 0.7 + a * Math.cos(k * th); return v.set(rr * Math.cos(th), rr * Math.sin(th), b * Math.sin(k * th)); };
        const c0 = new T.Vector3(), c1 = new T.Vector3(), c2 = new T.Vector3(), Tn = new T.Vector3(), N = new T.Vector3(), Bn = new T.Vector3();
        const geo = flaeche(700, 8, false, false, (u, v, out) => {
          C(u, c0); C(u + 1e-3, c1); C(u - 1e-3, c2);
          Tn.subVectors(c1, c2).normalize();
          N.set(Math.cos(TAU * u), Math.sin(TAU * u), 0); N.addScaledVector(Tn, -N.dot(Tn)).normalize();
          Bn.crossVectors(Tn, N);
          const phi = Math.PI * hd * u, s = (v * 2 - 1) * w;
          return out.copy(c0).addScaledVector(N, Math.cos(phi) * s).addScaledVector(Bn, Math.sin(phi) * s);
        });
        return { obj: new T.Mesh(geo, m.beidseitig), info: `${hd} halbe Drehung${hd > 1 ? 'en' : ' (Möbius)'}, ${k}-zählig` };
      } },

    { abschnitt: 'element', name: 'Volumen', text: 'Ein gedrechselter Körper mit Kanneluren. Geschlossen, darum druck- und giessbar.', neigung: 0.15, start: 8807,
      bau(r) {
        const nB = 3 + Math.floor(r() * 3), wuelste = [];
        for (let i = 0; i < nB; i++) wuelste.push({ c: (i + 0.5) / nB + (r() - 0.5) * 0.12, a: 0.08 + r() * 0.24, w: 0.04 + r() * 0.08 });
        const fl = pick(r, [0, 8, 12, 16, 24]), tw = r() < 0.4 ? Math.PI * 0.8 : 0;
        const geo = flaeche(240, 160, false, true, (u, v, out) => {
          let rad = 0.1; wuelste.forEach(b => { rad += b.a * Math.exp(-Math.pow((u - b.c) / b.w, 2)); });
          rad *= Math.pow(Math.sin(Math.PI * u), 0.35);
          const phi = TAU * v + tw * u;
          if (fl) rad *= 1 - 0.06 * Math.pow(Math.abs(Math.sin(fl * TAU * v / 2)), 2);
          return out.set(rad * Math.cos(phi), (u - 0.5) * 1.8, rad * Math.sin(phi));
        });
        return { obj: new T.Mesh(geo, m.a), info: `${nB} Wülste${fl ? `, ${fl} Kanneluren` : ''}${tw ? ', gedreht' : ''}` };
      } },

    { abschnitt: 'element', name: 'Punkte', text: 'Staub auf einer Fläche aus der Superformel. Gut für Licht und Projektion.', neigung: -0.3, punkte: true, start: 1599,
      bau(r) {
        const m1 = pick(r, [3, 4, 5, 6, 7, 8, 10, 12]), m2 = pick(r, [2, 3, 4, 6]);
        const n1 = 0.3 + r() * 1.2, n2 = 0.4 + r() * 1.4, n3 = r() < 0.5 ? n2 : 0.4 + r() * 1.4;
        const sf = (ang, mm) => Math.pow(Math.pow(Math.abs(Math.cos(mm * ang / 4)), n2) + Math.pow(Math.abs(Math.sin(mm * ang / 4)), n3), -1 / n1);
        const n = 42000, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const th = (r() * 2 - 1) * Math.PI, ph = Math.asin(r() * 2 - 1);
          const r1 = sf(th, m1), r2 = sf(ph, m2);
          pos[i * 3] = r1 * Math.cos(th) * r2 * Math.cos(ph);
          pos[i * 3 + 1] = r2 * Math.sin(ph);
          pos[i * 3 + 2] = r1 * Math.sin(th) * r2 * Math.cos(ph);
        }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
        return { obj: new T.Points(g, m.punkte), info: `Superformel, ${m1} / ${m2}` };
      } },

    // ----- Verfahren -----
    { abschnitt: 'verfahren', name: 'Wachstum', text: 'Jeder Ast schliesst an den vorigen an. Die Form entsteht in der Zeit.', neigung: -0.35, start: 4731,
      bau(r) {
        const triebe = pick(r, [1, 3, 5, 6]), tiefe = triebe >= 5 ? 4 : 5, nb = pick(r, [2, 3]);
        const winkel = 0.35 + r() * 0.45, verh = 0.62 + r() * 0.12, roll = r() * TAU, gold = Math.PI * (3 - Math.sqrt(5));
        const reihe = [], segs = [], spitzen = [];
        if (triebe === 1) reihe.push({ p: new T.Vector3(0, -1, 0), d: new T.Vector3(0, 1, 0), len: 0.6, tief: tiefe, rad: 0.05 });
        else for (let s = 0; s < triebe; s++) {
          const a = TAU * s / triebe;
          reihe.push({ p: new T.Vector3(), d: new T.Vector3(Math.cos(a), Math.sin(a), 0.25).normalize(), len: 0.45, tief: tiefe, rad: 0.04 });
        }
        const OBEN = new T.Vector3(0, 1, 0), X = new T.Vector3(1, 0, 0), p1 = new T.Vector3(), p2 = new T.Vector3();
        while (reihe.length) {
          const it = reihe.shift();
          const e = it.p.clone().addScaledVector(it.d, it.len);
          segs.push([it.p, e, it.rad]);
          if (it.tief === 0) { spitzen.push({ p: e, r: 0.03 }); continue; }
          p1.crossVectors(it.d, Math.abs(it.d.y) < 0.9 ? OBEN : X).normalize();
          p2.crossVectors(it.d, p1);
          for (let b = 0; b < nb; b++) {
            const ang = roll + b * TAU / nb + it.tief * gold;
            const achse = p1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(p2, Math.sin(ang)).normalize();
            const nd = it.d.clone().applyAxisAngle(achse, winkel * (1 + 0.2 * (r() - 0.5)));
            reihe.push({ p: e, d: nd, len: it.len * verh, tief: it.tief - 1, rad: it.rad * 0.72 });
          }
        }
        const box = new T.Box3(); segs.forEach(s => { box.expandByPoint(s[0]); box.expandByPoint(s[1]); });
        const mitte = box.getCenter(new T.Vector3());
        const st = staebe(segs, m.a), sp = perlen(spitzen, m.perle);
        const g = new T.Group(); g.add(st); g.add(sp); g.position.copy(mitte).negate();
        const w = new T.Group(); w.add(g);
        const alle = segs.length, innen = alle - spitzen.length;
        return {
          obj: w, info: `${triebe} Trieb${triebe > 1 ? 'e' : ''}, ${nb}er-Verzweigung`,
          update: t => {
            const ph = (t * 0.11) % 1.35, fort = Math.min(1, ph);
            const c = Math.max(1, Math.floor(fort * fort * (3 - 2 * fort) * alle));
            st.count = c; sp.count = Math.max(0, c - innen);
          }
        };
      } },

    { abschnitt: 'verfahren', name: 'Reaktion–Diffusion', text: 'Zwei Stoffe reagieren und breiten sich aus. Daraus entstehen Fell-, Korallen- und Labyrinthmuster.', neigung: -0.55, start: 3388,
      bau(r, karte = {}) {
        const fein = karte.fein || 1;   // feineres Raster (mehr Zellen, mehr Keime) für den Film «Formenfahrt»; im Katalog 1
        const P = pick(r, [
          { n: 'Korallen', F: 0.0545, k: 0.062 }, { n: 'Flecken', F: 0.0367, k: 0.0649 },
          { n: 'Labyrinth', F: 0.029, k: 0.057 }, { n: 'Würmer', F: 0.046, k: 0.063 }]);
        const W = 192 * fein, H = 72 * fein, N = W * H;
        let A = new Float32Array(N).fill(1), B = new Float32Array(N), A2 = new Float32Array(N), B2 = new Float32Array(N);
        for (let s = 0; s < 14 * fein * fein; s++) {
          const cx = Math.floor(r() * W), cy = Math.floor(r() * H);
          for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) B[((cy + dy + H) % H) * W + (cx + dx + W) % W] = 1;
        }
        const R0 = 0.6, rr = 0.3, amp = 0.07 / Math.sqrt(fein);
        const geo = flaeche(W, H, true, true, (u, v, out) => {
          const U = TAU * u, V = TAU * v;
          return out.set((R0 + rr * Math.cos(V)) * Math.cos(U), rr * Math.sin(V), (R0 + rr * Math.cos(V)) * Math.sin(U));
        });
        const pos = geo.attributes.position, grund = pos.array.slice(), nrm = new Float32Array(N * 3);
        for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) {
          const U = TAU * i / W, V = TAU * j / H, k = (i * H + j) * 3;
          nrm[k] = Math.cos(U) * Math.cos(V); nrm[k + 1] = Math.sin(V); nrm[k + 2] = Math.sin(U) * Math.cos(V);
        }
        const SCHRITTE = 5200 * fein; let fertig = 0, bild = 0;
        function rechne(n) {
          for (let s = 0; s < n; s++) {
            for (let y = 0; y < H; y++) {
              const ym = ((y - 1 + H) % H) * W, y0 = y * W, yp = ((y + 1) % H) * W;
              for (let x = 0; x < W; x++) {
                const xm = (x - 1 + W) % W, xp = (x + 1) % W, i = y0 + x;
                const a = A[i], b = B[i];
                const la = 0.2 * (A[y0 + xm] + A[y0 + xp] + A[ym + x] + A[yp + x]) + 0.05 * (A[ym + xm] + A[ym + xp] + A[yp + xm] + A[yp + xp]) - a;
                const lb = 0.2 * (B[y0 + xm] + B[y0 + xp] + B[ym + x] + B[yp + x]) + 0.05 * (B[ym + xm] + B[ym + xp] + B[yp + xm] + B[yp + xp]) - b;
                const re = a * b * b;
                A2[i] = Math.min(1, Math.max(0, a + la - re + P.F * (1 - a)));
                B2[i] = Math.min(1, Math.max(0, b + 0.5 * lb + re - (P.k + P.F) * b));
              }
            }
            let t = A; A = A2; A2 = t; t = B; B = B2; B2 = t;
          }
          fertig += n;
        }
        function schreibe() {
          const arr = pos.array;
          for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) {
            const k = (i * H + j) * 3, d = amp * Math.min(1, B[j * W + i] * 2.6);
            arr[k] = grund[k] + nrm[k] * d; arr[k + 1] = grund[k + 1] + nrm[k + 1] * d; arr[k + 2] = grund[k + 2] + nrm[k + 2] * d;
          }
          pos.needsUpdate = true; geo.computeVertexNormals();
        }
        return {
          obj: new T.Mesh(geo, m.a), info: P.n, radius: R0 + rr + amp,
          update: () => {
            if (fertig >= SCHRITTE) return;
            rechne(50 * fein); bild++;
            if (bild % 3 === 0 || fertig >= SCHRITTE) schreibe();
          }
        };
      } },

    { abschnitt: 'verfahren', name: 'Verflechtung', text: 'Stränge laufen abwechselnd über- und untereinander, wie im Flechtband.', neigung: -0.75, start: 9052,
      bau(r) {
        const g = new T.Group(), reihe = [m.a, m.b, m.perle];
        if (r() < 0.5) {
          const k = 4 + Math.floor(r() * 6), a = 0.14, b = 0.08, R = 0.7;
          for (let i = 0; i < 3; i++) {
            const fn = (t, v) => {
              const th = TAU * t, s = k * th + TAU * i / 3, rr = R + a * Math.sin(s);
              return v.set(rr * Math.cos(th), rr * Math.sin(th), b * Math.sin(2 * s));
            };
            g.add(roehre(fn, k * 60, 0.042, reihe[i]));
          }
          return { obj: g, info: `Zopf aus 3 Strängen, ${k} Schläge` };
        }
        const n = 2 + Math.floor(r() * 3), k = 3 + Math.floor(r() * 6), R = 0.7, a = 0.2, b = 0.08;
        for (let j = 0; j < n; j++) {
          const fn = (t, v) => {
            const th = TAU * t, s = k * th + TAU * j / n, rr = R + a * Math.cos(s);
            return v.set(rr * Math.cos(th), rr * Math.sin(th), b * Math.sin(s));
          };
          g.add(roehre(fn, k * 60, 0.036, reihe[j % 3]));
        }
        return { obj: g, info: `Flechtwerk aus ${n} Strängen, ${k}-zählig` };
      } },

    { abschnitt: 'verfahren', name: 'Feld', text: 'Feldlinien zwischen Ladungen. Die Form ist die Spur einer Kraft.', neigung: -0.65, start: 5167,
      bau(r) {
        const n = 2 + Math.floor(r() * 4), Rq = 0.6, ladungen = [];
        for (let i = 0; i < 2 * n; i++) { const a = TAU * i / (2 * n); ladungen.push({ c: new T.Vector3(Rq * Math.cos(a), Rq * Math.sin(a), 0), q: i % 2 ? -1 : 1 }); }
        const d = new T.Vector3();
        const E = (p, out) => {
          out.set(0, 0, 0);
          for (const ch of ladungen) { d.subVectors(p, ch.c); const l = d.length(); out.addScaledVector(d, ch.q / (l * l * l + 1e-6)); }
          return out;
        };
        const g = new T.Group(), M = 14, rot = r() * TAU, e1 = new T.Vector3(), mid = new T.Vector3();
        for (const ch of ladungen) {
          if (ch.q < 0) continue;
          for (let s = 0; s < M; s++) {
            const y = 1 - 2 * (s + 0.5) / M, rad = Math.sqrt(1 - y * y), th = s * Math.PI * (3 - Math.sqrt(5)) + rot;
            const p = ch.c.clone().add(new T.Vector3(rad * Math.cos(th), rad * Math.sin(th), y).multiplyScalar(0.04));
            const linie = [p.clone()];
            for (let st = 0; st < 700; st++) {
              E(p, e1).normalize();
              mid.copy(p).addScaledVector(e1, 0.006);
              E(mid, e1).normalize();
              p.addScaledVector(e1, 0.012);
              if (st % 3 === 0) linie.push(p.clone());
              if (p.length() > 2.0) break;
              if (ladungen.some(c2 => c2.q < 0 && c2.c.distanceTo(p) < 0.035)) { linie.push(p.clone()); break; }
            }
            if (linie.length < 4) continue;
            g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(linie), Math.min(260, linie.length * 2), 0.011, 5, false), m.a));
          }
        }
        g.add(perlen(ladungen.filter(c => c.q > 0).map(c => ({ p: c.c, r: 0.055 })), m.perle));
        g.add(perlen(ladungen.filter(c => c.q < 0).map(c => ({ p: c.c, r: 0.055 })), m.b));
        return { obj: g, info: `${2 * n} Ladungen, ${M} Linien je Quelle` };
      } },

    { abschnitt: 'verfahren', name: 'Gekoppelte Tempi', text: 'Vier Ringe, jeder mit eigenem Tempo. Mit gemeinsamer Uhr kehrt die ganze Figur zurück, ohne sie nie.', neigung: -0.75, uhr: true, start: 1203,
      bau(r, karte) {
        const RAT = [[1, '1'], [3 / 2, '3/2'], [4 / 3, '4/3'], [5 / 4, '5/4']];
        const IRR = [[1, '1'], [(1 + Math.sqrt(5)) / 2, 'φ'], [Math.SQRT2, '√2'], [Math.sqrt(3), '√3']];
        const folge = [0, 1, 2, 3].sort(() => r() - 0.5);
        const satz = karte.gemeinsam ? RAT : IRR;
        const g = new T.Group(), ringe = [];
        folge.forEach((o, i) => {
          const R = 0.32 + i * 0.22, k = 6 + i * 4, ring = new T.Group();
          ring.add(new T.Mesh(new T.TorusGeometry(R, 0.012, 8, 160), m.b));
          const liste = [];
          for (let j = 1; j < k; j++) { const a = TAU * j / k; liste.push({ p: new T.Vector3(R * Math.cos(a), R * Math.sin(a), 0), r: 0.026 }); }
          ring.add(perlen(liste, m.a));
          ring.add(perlen([{ p: new T.Vector3(R, 0, 0), r: 0.055 }], m.perle));
          g.add(ring); ringe.push({ ring, tempo: satz[o][0] * (i % 2 ? -1 : 1) });
        });
        // Mit gemeinsamer Uhr (Nenner 2, 3, 4): Grundtempo 0,5 rad/s, kgV 12 → 2π · 12 / 0,5 s ≈ 2 min 31 s
        const verh = folge.map(o => satz[o][1]).join(' : ');
        const info = karte.gemeinsam
          ? `Tempi ${verh}. Die Gesamtfigur kehrt alle 2 min 31 s genau zurück.`
          : `Tempi ${verh}. Jeder Ring kehrt wieder, die Gesamtfigur nie.`;
        return { obj: g, info, update: t => ringe.forEach(x => { x.ring.rotation.z = t * 0.5 * x.tempo; }) };
      } }
  ];
}
