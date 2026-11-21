// Falte · Entfalten: das Blatt als Stücke im Raum
// Jede Falte schneidet alle Stücke an ihrer Geraden; was auf der Faltseite liegt, klappt um die Gerade und kommt obenauf
// (Lage 2^(k+1) − 1 − Lage, wie stapel() im Shader). Gespeichert wird jedes Stück in Blattkoordinaten mit den Falten,
// die es umgeklappt haben. Gezeichnet wird es, indem man diese Drehungen der Reihe nach anwendet; nur die letzte Falte
// darf zwischen offen (0) und flach (PI) stehen, dann hebt sich die Klappe in den Raum.

// konvexes Vieleck an a·s + b ≤ 0 abschneiden (a: 2er-Vektor, b: Zahl), in Blattkoordinaten
function schneiden(poly, ax, ay, b, seite) {
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const P = poly[i], Q = poly[(i + 1) % n];
    const fp = seite * (ax * P[0] + ay * P[1] + b), fq = seite * (ax * Q[0] + ay * Q[1] + b);
    if (fp <= 0) out.push(P);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const u = fp / (fp - fq); out.push([P[0] + (Q[0] - P[0]) * u, P[1] + (Q[1] - P[1]) * u]); }
  }
  return out;
}
const flaeche = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const P = p[i], Q = p[(i + 1) % p.length]; a += P[0] * Q[1] - Q[0] * P[1]; } return a / 2; };

// falten: [{ nx, ny, c }] in Weltkoordinaten zur Zeit der Falte (wie im Shader)
export function stueckeBauen(falten, blatt) {
  // A: Welt = M · s + t (M 2×2 als [a, b, c, d]: x' = a x + b y, y' = c x + d y)
  let st = [{ poly: [[0, 0], [blatt, 0], [blatt, 1], [0, 1]], M: [1, 0, 0, 1], t: [0, 0], bits: 0, lage: 0 }];
  falten.forEach((F, k) => {
    const neu = [];
    for (const S of st) {
      // n · (M s + t) − c, als Gerade in Blattkoordinaten
      const [a, b, c, d] = S.M;
      const ax = F.nx * a + F.ny * c, ay = F.nx * b + F.ny * d, bb = F.nx * S.t[0] + F.ny * S.t[1] - F.c;
      const bleibt = schneiden(S.poly, ax, ay, bb, 1), klappt = schneiden(S.poly, ax, ay, bb, -1);
      if (bleibt.length >= 3 && Math.abs(flaeche(bleibt)) > 1e-7) neu.push({ ...S, poly: bleibt });
      if (klappt.length >= 3 && Math.abs(flaeche(klappt)) > 1e-7) {
        // Spiegelung an der Geraden: x − 2 (n·x − c) n
        const R = [1 - 2 * F.nx * F.nx, -2 * F.nx * F.ny, -2 * F.nx * F.ny, 1 - 2 * F.ny * F.ny];
        const M = [R[0] * a + R[1] * c, R[0] * b + R[1] * d, R[2] * a + R[3] * c, R[2] * b + R[3] * d];
        const t = [R[0] * S.t[0] + R[1] * S.t[1] + 2 * F.c * F.nx, R[2] * S.t[0] + R[3] * S.t[1] + 2 * F.c * F.ny];
        neu.push({ poly: klappt, M, t, bits: S.bits | (1 << k), lage: (1 << (k + 1)) - 1 - S.lage });
      }
    }
    st = neu;
  });
  return st;
}

// Ort und Normale eines Blattpunktes im Raum; w: Winkel je Falte (PI flach umgelegt, 0 offen)
function drehen(sx, sy, bits, falten, w, aus) {
  let x = sx, y = sy, z = 0, nx = 0, ny = 0, nz = 1;
  for (let k = 0; k < falten.length; k++) {
    if (!((bits >> k) & 1)) continue;
    const F = falten[k], cs = Math.cos(w[k]), sn = Math.sin(w[k]);
    const d = F.nx * x + F.ny * y - F.c;
    const d2 = d * cs - z * sn, z2 = d * sn + z * cs;
    x += F.nx * (d2 - d); y += F.ny * (d2 - d); z = z2;
    const e = F.nx * nx + F.ny * ny;
    const e2 = e * cs - nz * sn, nz2 = e * sn + nz * cs;
    nx += F.nx * (e2 - e); ny += F.ny * (e2 - e); nz = nz2;
  }
  aus[0] = x; aus[1] = y; aus[2] = z; aus[3] = nx; aus[4] = ny; aus[5] = nz;
}

// Dreiecke für die Grafik: je Ecke Ort (3), Blattort (2), Normale (3), Lage (1) = 9 Zahlen. Die Papierdicke rechnet
// der Shader aus der Lage (nur für Tiefe und Schatten, damit flach gestapelte Lagen sich richtig verdecken).
// Lange Kanten werden unterteilt, damit die Perspektive auch auf grossen Stücken glatt bleibt.
export function blattDreiecke(stuecke, falten, w, ziel) {
  const o = [0, 0, 0, 0, 0, 0];
  let n = 0;
  const ecke = (s, S) => {
    drehen(s[0], s[1], S.bits, falten, w, o);
    if (n + 9 > ziel.length) return;
    ziel[n++] = o[0]; ziel[n++] = o[1]; ziel[n++] = o[2];
    ziel[n++] = s[0]; ziel[n++] = s[1];
    ziel[n++] = o[3]; ziel[n++] = o[4]; ziel[n++] = o[5]; ziel[n++] = S.lage;
  };
  const TEIL = 6;
  for (const S of stuecke) {
    const p = S.poly;
    // Mittelpunkt, dann Fächer mit unterteilten Rändern und Ringen
    let mx = 0, my = 0; for (const q of p) { mx += q[0]; my += q[1]; } mx /= p.length; my /= p.length;
    for (let i = 0; i < p.length; i++) {
      const A = p[i], B = p[(i + 1) % p.length];
      for (let a = 0; a < TEIL; a++) {
        const u0 = a / TEIL, u1 = (a + 1) / TEIL;
        const P0 = [A[0] + (B[0] - A[0]) * u0, A[1] + (B[1] - A[1]) * u0], P1 = [A[0] + (B[0] - A[0]) * u1, A[1] + (B[1] - A[1]) * u1];
        for (let r = 0; r < TEIL; r++) {
          const r0 = r / TEIL, r1 = (r + 1) / TEIL;
          const m = (P, k) => [mx + (P[0] - mx) * k, my + (P[1] - my) * k];
          const a0 = m(P0, r0), a1 = m(P1, r0), b0 = m(P0, r1), b1 = m(P1, r1);
          if (r === 0) { ecke(a0, S); ecke(b0, S); ecke(b1, S); }
          else { ecke(a0, S); ecke(b0, S); ecke(b1, S); ecke(a0, S); ecke(b1, S); ecke(a1, S); }
        }
      }
    }
  }
  return n / 9;
}
