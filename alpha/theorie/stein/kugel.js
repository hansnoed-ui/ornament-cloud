// In Stein · Spiegelkugel (Probe, 28. November 2026). Christian: «Eine Spiegelkugel könnte auch über eine Website rollen.»
// Eine verchromte Kugel liegt auf der gravierten Platte und rollt, wenn man das Telefon neigt (oder man wirft sie mit dem Finger).
// Sie spiegelt, was um sie ist: in der Mitte den Raum über ihr, am Rand den Stein mit dem Satz, gestaucht und seitenverkehrt.
// Bezug: Beobachter (3/4, 6/1), der Spiegel als Ornament des Raums (die konvexen Spiegel der Malerei, van Eyck, Parmigianino *(G)*).
// Raum: Poly Haven, sepulchral_chapel_rotunda (CC0), als Panorama verkleinert (stoff/raum.jpg). Die Kugel fängt ihre Umgebung
// jedes Bild neu mit einer Würfelkamera ein; darum spiegelt sie auch die Gravur und das wandernde Licht.
// Ohne Neigung (Rechner) rollt sie von selbst langsam über den Stein.

let R = 0.1;   // Radius; die Platte ist 2 breit; im Hochformat grösser (sonst am Telefon nur ein Knopf)

export async function kugel({ T, szene, renderer, licht, platte, lade }) {
  // der Raum: Decke nach oben (+z, zur Betrachterin), der Boden liegt unter dem Stein und bleibt verdeckt
  const raum = new T.Texture(await lade('stoff/raum.jpg'));
  raum.mapping = T.EquirectangularReflectionMapping; raum.colorSpace = T.SRGBColorSpace; raum.needsUpdate = true;
  szene.background = raum; szene.backgroundRotation.set(Math.PI / 2, 0, 0); szene.backgroundIntensity = 0.9;

  const ziel = new T.WebGLCubeRenderTarget(256, { generateMipmaps: false });
  const wuerfel = new T.CubeCamera(0.01, 20, ziel); szene.add(wuerfel);

  // feine Linien in die Politur geschnitten (drei Grosskreise), damit man das Rollen sieht; ein glatter Spiegel scheint zu gleiten
  const lc = document.createElement('canvas'); lc.width = 1024; lc.height = 512; const lg = lc.getContext('2d');
  lg.fillStyle = '#fff'; lg.fillRect(0, 0, 1024, 512); lg.strokeStyle = '#3a3a3a'; lg.lineWidth = 2.2;
  lg.beginPath(); lg.moveTo(0, 256); lg.lineTo(1024, 256); for (const u of [0, 256, 512, 768]) { lg.moveTo(u + 1, 0); lg.lineTo(u + 1, 512); } lg.stroke();
  const linien = new T.CanvasTexture(lc); linien.colorSpace = T.NoColorSpace;

  const stoff = new T.MeshPhongMaterial({ color: 0x000000, specular: 0xffffff, shininess: 900, envMap: ziel.texture, reflectivity: 0.94,
    combine: T.MixOperation, specularMap: linien });
  const ball = new T.Mesh(new T.SphereGeometry(0.1, 96, 64), stoff);
  ball.castShadow = true; ball.position.z = R; szene.add(ball);

  // Schatten: nur die Kugel wirft einen, darum ohne Schattenakne auf dem Stein; im Streiflicht wird er lang
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  licht.castShadow = true; licht.shadow.mapSize.set(2048, 2048); licht.shadow.bias = -0.0005; licht.shadow.radius = 3; licht.shadow.intensity = 0.78;
  Object.assign(licht.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.1, far: 10 });
  platte.receiveShadow = true;

  let A = 1;                                   // halbe Höhe der Platte (die Breite ist 2)
  const p = new T.Vector2(-0.4, 0.2), v = new T.Vector2(0.18, -0.05), schwer = new T.Vector2();
  let geneigt = -1e9, null0 = null, gefasst = false, zug = null, vorher = 0;
  const q = new T.Quaternion(), achse = new T.Vector3();

  return {
    groesse(a) { A = a; R = a > 1 ? 0.2 : 0.1; ball.scale.setScalar(R / 0.1); },
    // Neigung des Telefons als Schwerkraft; die Haltung, in der man es gerade hält, wird mit der Zeit zur Ruhelage
    neigung(e) {
      if (e.gamma == null || e.beta == null) return;
      if (null0 === null) null0 = e.beta; null0 += (e.beta - null0) * 0.004;
      let gx = Math.sin(e.gamma * Math.PI / 180), gy = -Math.sin((e.beta - null0) * Math.PI / 180);
      const w = -((screen.orientation && screen.orientation.angle) || 0) * Math.PI / 180;
      [gx, gy] = [gx * Math.cos(w) - gy * Math.sin(w), gx * Math.sin(w) + gy * Math.cos(w)];
      schwer.set(gx, gy).multiplyScalar(3.2); geneigt = performance.now();
    },
    // mit dem Finger fassen und werfen; gibt zurück, ob der Finger die Kugel getroffen hat
    fasse(x, y) { if (Math.hypot(x - p.x, y - p.y) > R * 1.8) return false; gefasst = true; zug = [x, y, performance.now()]; v.set(0, 0); return true; },
    ziehe(x, y) {
      if (!gefasst) return false;
      const t = performance.now(), dt = Math.max(0.008, (t - zug[2]) / 1000);
      v.set((x - zug[0]) / dt, (y - zug[1]) / dt).clampLength(0, 4); zug = [x, y, t]; return true;
    },
    lass() { if (!gefasst) return false; gefasst = false; return true; },
    schritt(t) {
      const dt = Math.min(0.05, (t - (vorher || t)) / 1000); vorher = t;
      if (gefasst) { p.lerp(new T.Vector2(zug[0], zug[1]), 0.5); }
      else {
        const a = new T.Vector2();
        if (t - geneigt < 3000) a.copy(schwer);
        else {   // von selbst: langsam über den Satz, wie eine Lupe
          const s = t / 1000; a.set(0.62 * Math.sin(s * 0.17) - p.x, 0.55 * A * Math.sin(s * 0.23 + 1) - p.y).multiplyScalar(0.35).addScaledVector(v, -0.25);
        }
        v.addScaledVector(a, dt).multiplyScalar(1 - 0.35 * dt);   // Rollwiderstand
        p.addScaledVector(v, dt);
        // die Kugel prallt am Rand der Platte ab
        if (Math.abs(p.x) > 1 - R) { p.x = Math.sign(p.x) * (1 - R); v.x *= -0.5; }
        if (Math.abs(p.y) > A - R) { p.y = Math.sign(p.y) * (A - R); v.y *= -0.5; }
      }
      // rollen statt gleiten: Drehachse quer zur Bewegung, Winkel = Weg / Radius
      const weg = p.distanceTo(new T.Vector2(ball.position.x, ball.position.y));
      if (weg > 1e-6) {
        achse.set(-(p.y - ball.position.y), p.x - ball.position.x, 0).normalize();
        ball.quaternion.premultiply(q.setFromAxisAngle(achse, weg / R));
      }
      ball.position.set(p.x, p.y, R);
      // die Umgebung neu einfangen, ohne die Kugel selbst
      ball.visible = false; wuerfel.position.copy(ball.position); wuerfel.update(renderer, szene); ball.visible = true;
    },
  };
}
