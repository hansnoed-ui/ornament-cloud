# Meisseln, Kerbschnitt in Marmor (Blender Cycles, echte Geometrie). 28. November 2026, zweiter Versuch auf gemieteter Grafikkarte.
# Christian zum ersten Versuch (formen/stein-meisseln.js): «Meisseln scheint mehr Überblenden» und «Ihn zu bearbeiten scheint so nicht zu
# klappen». Hier ist jede Kerbe echte Geometrie: eine dreiseitige Pyramide, in zwei Schlägen in den Stein getrieben (Höhenkarte, jedes Bild
# neu gerechnet, Cycles verschiebt die fein unterteilte Fläche). Bei jedem Schlag fliegen Splitter, prallen auf und bleiben liegen. Das
# Muster ist ein Wolfszahn-Fries aus zwei Reihen Dreiecken, wie im Kerbschnitt der Alpen und an romanischen Gesimsen *(G)*.
# Die Platte gleitet langsam nach links unter dem Werkzeug durch; nach 30 s ist sie genau eine Musterlänge und eine Kachel des
# Marmorscans weiter, darum schliesst die Schleife. Bezug: 7/1 (Material als Widerstand), 7/2 (Herstellen), 3/2 (Rapport).
#   blender -b -P meisseln.py -- --bilder 1-900 --aus /w/meisseln/f
import argparse, math, random, sys
import bpy
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--bilder', default='1')
ap.add_argument('--proben', type=int, default=128)
ap.add_argument('--b', type=int, default=1080)
ap.add_argument('--h', type=int, default=1350)
ap.add_argument('--aus', default='/w/aus/f')
ap.add_argument('--stoff', default='/w/stoff/')
ap.add_argument('--nah', action='store_true')   # Prüfblick: flach von der Seite auf das Band
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
BILDER, TAU, ZEIT = 900, math.tau, 30.0
KACHEL = 2.6                 # Kachel des Marmorscans = Weg der Platte in einer Schleife
S = KACHEL / 10              # Seite eines Dreiecks; 10 Dreieckspaare je Reihe und Schleife
HD = S * math.sqrt(3) / 2    # Höhe eines Dreiecks
TIEF = 0.058                 # Tiefe der Pyramide (m); Flanken rund 45°, wie im Kerbschnitt
V = KACHEL / ZEIT            # Geschwindigkeit der Platte
LANG, BAND, PX = 10.0, 0.9, 700   # Platte 10 m lang (nur die Mitte im Bild), Band ±0,45 m (Fries und Inschrift), 700 Punkte je Meter
YI, HI, IMAX = 0.36, 0.1, 0.0065  # Inschrift: Mitte, Höhe, Tiefe des Keilschnitts (45°)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'OPTIX'; pr.get_devices()
for d in pr.devices: d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'
sc.cycles.samples = a.proben; sc.cycles.use_adaptive_sampling = True
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPTIX'
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = a.b, a.h, 100
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 93
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'

def bild(name, farbig=True):
    i = bpy.data.images.load(a.stoff + name); i.colorspace_settings.name = 'sRGB' if farbig else 'Non-Color'; return i

w = bpy.data.worlds.new('raum'); sc.world = w; w.use_nodes = True; n = w.node_tree.nodes; l = w.node_tree.links; n.clear()
tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value[2] = math.radians(35)
env = n.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(a.stoff + 'sepulchral_chapel_rotunda_4k.hdr')
hg = n.new('ShaderNodeBackground'); hg.inputs['Strength'].default_value = 0.18
dunkel = n.new('ShaderNodeBackground'); dunkel.inputs['Color'].default_value = (0.003, 0.003, 0.0032, 1)
lp = n.new('ShaderNodeLightPath'); mx = n.new('ShaderNodeMixShader'); out = n.new('ShaderNodeOutputWorld')
l.new(tc.outputs['Generated'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], env.inputs['Vector']); l.new(env.outputs['Color'], hg.inputs['Color'])
l.new(lp.outputs['Is Camera Ray'], mx.inputs['Fac']); l.new(hg.outputs['Background'], mx.inputs[1]); l.new(dunkel.outputs['Background'], mx.inputs[2])
l.new(mx.outputs['Shader'], out.inputs['Surface'])

# --- die Dreiecke des Frieses in Koordinaten der Platte (u längs, y quer) ---
# zwei Reihen: oben zwischen y = 0 und HD, unten gespiegelt; je Reihe abwechselnd Spitze oben und unten
dreiecke = []
for reihe in (1, -1):
    for k in range(-int(LANG / 2 / (S / 2)) - 2, int(LANG / 2 / (S / 2)) + 2):
        u0 = k * S / 2; auf = (k % 2 == 0)
        if auf: ecken = [(u0 - S / 2, 0), (u0 + S / 2, 0), (u0, HD)]
        else: ecken = [(u0 - S / 2, HD), (u0 + S / 2, HD), (u0, 0)]
        ecken = [(x, y * reihe) for x, y in ecken]
        dreiecke.append({'ecken': ecken, 'u': u0, 'reihe': reihe, 'k': k})
# Werkzeug steht in der Welt bei x = 0; die Platte liegt bei −V·t, also ist das Werkzeug über u = V·t (+ Anfang)
U0 = -0.3
for i, d in enumerate(dreiecke):
    # oben vor unten, je Dreieck zwei Schläge; Zeit, zu der das Werkzeug die Mitte erreicht (mit kleinem Versatz der Reihe)
    d['t'] = (d['u'] - U0) / V + (0.0 if d['reihe'] > 0 else 0.55)
    d['schlaege'] = [round(d['t'] * 30) / 30, round((d['t'] + 0.38) * 30) / 30]

def fortschritt(t):
    """je Dreieck: wie weit es gehauen ist (0 … 1), aus den beiden Schlägen bis zur Zeit t"""
    out = np.zeros(len(dreiecke), np.float32)
    for i, d in enumerate(dreiecke):
        s1, s2 = d['schlaege']
        out[i] = (0.55 if t >= s1 else 0.0) + (0.45 if t >= s2 else 0.0)
    return out

# --- Platte: flach und poliert; darüber das Band der Kerben als dichtes Netz (1,4 mm), dessen Höhe jedes Bild direkt gesetzt wird ---
# (Verschiebung im Shader trug hier nicht: Cycles zeigte flache Böden statt Pyramidenflanken.)
# Oberseite aus Streifen, mit einer Aussparung, in der das Band der Kerben liegt (sonst deckt die Platte die Kerben zu)
BU0, BU1 = -1.6, 3.4          # nur dieser Teil des Bandes kommt in einer Schleife unter der Kamera durch
def rechteck(x0, x1, y0, y1):
    return [(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)]
teile = [rechteck(-LANG / 2, LANG / 2, BAND / 2, 1.2), rechteck(-LANG / 2, LANG / 2, -1.2, -BAND / 2),
         rechteck(-LANG / 2, BU0, -BAND / 2, BAND / 2), rechteck(BU1, LANG / 2, -BAND / 2, BAND / 2)]
pme = bpy.data.meshes.new('platte'); pme.from_pydata(sum(teile, []), [], [(4 * i, 4 * i + 1, 4 * i + 2, 4 * i + 3) for i in range(4)])
platte = bpy.data.objects.new('platte', pme); sc.collection.objects.link(platte)
bpy.ops.mesh.primitive_cube_add(size=1); block = bpy.context.object; block.scale = (LANG, 2.4 - 0.002, 0.05); block.location = (0, 0, -0.095)   # Deckfläche 7 cm tief, unter den Kerben (sonst füllt sie sie wie ein flacher Boden)
block.parent = platte
NU, NV = int((BU1 - BU0) * PX), int(BAND * PX)
bpy.ops.mesh.primitive_grid_add(x_subdivisions=NU, y_subdivisions=NV, size=1); band = bpy.context.object
band.scale = (BU1 - BU0, BAND, 1); band.location = ((BU0 + BU1) / 2, 0, 0)
bpy.ops.object.transform_apply(location=True, scale=True); band.parent = platte
NP = len(band.data.vertices); ko_ = np.empty(NP * 3, np.float32); band.data.vertices.foreach_get('co', ko_)
U, Y = ko_[0::3].copy(), ko_[1::3].copy()
nr = np.full(NP, -1, np.int32); form = np.zeros(NP, np.float32)
RAND = 0.012                 # schmaler Steg zwischen den Dreiecken
for i, d in enumerate(dreiecke):
    (x0, y0), (x1, y1), (x2, y2) = d['ecken']
    lo, hi = min(x0, x1, x2), max(x0, x1, x2)
    if hi < BU0 or lo > BU1: continue
    sel = np.where((U >= lo) & (U <= hi) & (np.abs(Y) <= HD + 0.001))[0]
    uS, yS = U[sel], Y[sel]
    cx, cy = (x0 + x1 + x2) / 3, (y0 + y1 + y2) / 3
    r_in = S / (2 * math.sqrt(3)) - RAND
    ab = None
    for (ax, ay), (bx, by) in (((x0, y0), (x1, y1)), ((x1, y1), (x2, y2)), ((x2, y2), (x0, y0))):
        nx, ny = by - ay, -(bx - ax); ln = math.hypot(nx, ny); nx, ny = nx / ln, ny / ln
        if nx * (cx - ax) + ny * (cy - ay) < 0: nx, ny = -nx, -ny
        dist = (uS - ax) * nx + (yS - ay) * ny - RAND
        ab = dist if ab is None else np.minimum(ab, dist)
    innen = ab > 0
    nr[sel[innen]] = i; form[sel[innen]] = np.clip(ab[innen] / r_in, 0, 1)
frisch_attr = band.data.attributes.new('frisch', 'FLOAT', 'POINT')
# die alte Inschrift über dem Fries (7/1), schon gehauen; läuft mit der Platte, eine Musterlänge lang (inschrift.mjs, keil)
ib = bpy.data.images.load(a.stoff + 'inschrift-keil.png'); ib.colorspace_settings.name = 'Non-Color'
IW, IH = ib.size; ipx = np.empty(IW * IH * 4, np.float32); ib.pixels.foreach_get(ipx); ipx = ipx.reshape(IH, IW, 4)[..., 0]
inschrift = np.zeros(NP, np.float32); im_ = np.abs(Y - YI) < HI / 2
ix = (((U[im_] % KACHEL) / KACHEL) * IW).astype(np.int32) % IW
iy = np.clip(((Y[im_] - (YI - HI / 2)) / HI * IH).astype(np.int32), 0, IH - 1)
inschrift[im_] = -IMAX * ipx[iy, ix]

def hauen(t):
    f = fortschritt(t)
    tiefe = np.where(nr >= 0, form * f[np.clip(nr, 0, None)], 0.0).astype(np.float32)
    ko_[2::3] = -TIEF * tiefe + inschrift; band.data.vertices.foreach_set('co', ko_)
    frisch_attr.data.foreach_set('value', (tiefe > 0.004).astype(np.float32))
    band.data.update(); band.update_tag(refresh={'DATA'}); bpy.context.view_layer.update()   # sonst rechnet Cycles mit dem alten Netz

m = bpy.data.materials.new('marmor'); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
bs = n['Principled BSDF']
tc = n.new('ShaderNodeTexCoord')
mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / KACHEL, 1 / KACHEL, 1)
diff = n.new('ShaderNodeTexImage'); diff.image = bild('marble_rock_02_diff_4k.jpg')
rau = n.new('ShaderNodeTexImage'); rau.image = bild('marble_rock_02_rough_4k.jpg', False)
hoe = n.new('ShaderNodeTexImage'); hoe.image = bild('marble_rock_02_disp_4k.jpg', False)
for t in (diff, rau, hoe): l.new(mp.outputs['Vector'], t.inputs['Vector'])
l.new(tc.outputs['Object'], mp.inputs['Vector'])
# feines Relief des Marmors als Bump auf der echten Geometrie
bump = n.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = 0.0015; bump.inputs['Strength'].default_value = 0.6
l.new(hoe.outputs['Color'], bump.inputs['Height']); l.new(bump.outputs['Normal'], bs.inputs['Normal'])
# frisch gehauen: heller und matt (die Politur ist weg)
# frisch = unter der Oberfläche (Objektkoordinate z); verlässlicher als ein Attribut des Netzes
xyz = n.new('ShaderNodeSeparateXYZ'); l.new(tc.outputs['Object'], xyz.inputs['Vector'])
at = n.new('ShaderNodeMath'); at.operation = 'LESS_THAN'; at.inputs[1].default_value = -0.002; l.new(xyz.outputs['Z'], at.inputs[0])
pol = n.new('ShaderNodeMath'); pol.operation = 'MULTIPLY_ADD'; pol.inputs[1].default_value = 0.08; pol.inputs[2].default_value = 0.015; l.new(rau.outputs['Color'], pol.inputs[0])
rk = n.new('ShaderNodeMix'); rk.data_type = 'FLOAT'; rk.inputs['B'].default_value = 0.62
l.new(at.outputs['Value'], rk.inputs['Factor']); l.new(pol.outputs['Value'], rk.inputs['A']); l.new(rk.outputs['Result'], bs.inputs['Roughness'])
hell = n.new('ShaderNodeMix'); hell.data_type = 'RGBA'; hell.blend_type = 'SCREEN'
l.new(at.outputs['Value'], hell.inputs['Factor']); l.new(diff.outputs['Color'], hell.inputs['A']); hell.inputs['B'].default_value = (0.5, 0.48, 0.45, 1)
l.new(hell.outputs['Result'], bs.inputs['Base Color'])
platte.data.materials.append(m); block.data.materials.append(m); band.data.materials.append(m)

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.12)); boden = bpy.context.object
mb = bpy.data.materials.new('boden'); mb.use_nodes = True; b = mb.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (0.006, 0.0058, 0.0055, 1); b.inputs['Roughness'].default_value = 0.55; boden.data.materials.append(mb)

# --- Splitter: je Schlag einige scharfkantige Stücke; alles aus der Zeit gerechnet (gleiche Würfel je Schlag) ---
G = 9.81
splitter_me = bpy.data.meshes.new('splitter'); splitter = bpy.data.objects.new('splitter', splitter_me); sc.collection.objects.link(splitter)
ms = bpy.data.materials.new('splitter'); ms.use_nodes = True; p = ms.node_tree.nodes['Principled BSDF']
p.inputs['Base Color'].default_value = (0.78, 0.74, 0.68, 1); p.inputs['Roughness'].default_value = 0.55; splitter_me.materials.append(ms)
VORLAGEN = []
for s in range(8):
    rg = random.Random(100 + s)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=0, radius=1); o = bpy.context.object
    vs = [(v.co.x * rg.uniform(0.6, 1.5), v.co.y * rg.uniform(0.4, 1.1), v.co.z * rg.uniform(0.08, 0.3)) for v in o.data.vertices]   # flache, kantige Schuppen
    VORLAGEN.append((np.array(vs, np.float32), [tuple(f.vertices) for f in o.data.polygons])); bpy.data.objects.remove(o)

schlaege = [(s, d) for d in dreiecke for s in d['schlaege']]
def splitter_bei(t):
    verts, faces = [], []; basis = 0
    for nr_s, (s, d) in enumerate(schlaege):
            dt = t - s
            if dt < 0 or dt > 6: continue
            # Würfel periodisch über die Musterlänge, damit die Splitter nach 30 s dieselben sind (Naht)
            rg = random.Random((d['k'] % 20) * 7 + (d['reihe'] > 0) * 3 + d['schlaege'].index(s))
            cx = sum(e[0] for e in d['ecken']) / 3; cy = sum(e[1] for e in d['ecken']) / 3
            for j in range(6):
                gr = rg.uniform(0.003, 0.011)
                vx, vy, vz = rg.uniform(-0.6, 0.6), rg.uniform(-0.3, 0.9) * d['reihe'], rg.uniform(0.6, 1.8)
                tf = 2 * vz / G; tb = tf * 0.25        # erster Flug, dann ein kleiner Sprung
                if dt < tf: x, y, z = vx * dt, vy * dt, vz * dt - G * dt * dt / 2
                elif dt < tf + tb: e = dt - tf; x, y, z = vx * tf + 0.3 * vx * e, vy * tf + 0.3 * vy * e, 0.25 * vz * e - G * e * e / 2
                else: x, y, z = vx * tf + 0.3 * vx * tb, vy * tf + 0.3 * vy * tb, 0.0
                # Lage in der Welt: der Splitter fährt mit der Platte (u − V·t)
                wx = cx + x - U0 - V * t; wy = cy + y; wz = max(0.0, z) + gr * 0.5
                if abs(wx) > 1.6: continue
                drehung = rg.uniform(0, TAU) + (rg.uniform(10, 30) * min(dt, tf + tb))
                vs, fs = VORLAGEN[rg.randrange(len(VORLAGEN))]
                c, si = math.cos(drehung), math.sin(drehung)
                pts = vs * gr; pts = np.stack([pts[:, 0] * c - pts[:, 1] * si, pts[:, 0] * si + pts[:, 1] * c, pts[:, 2]], 1) + (wx, wy, wz)
                verts.append(pts); faces += [tuple(basis + q for q in f) for f in fs]; basis += len(pts)
    splitter_me.clear_geometry()
    if verts: splitter_me.from_pydata(np.concatenate(verts).tolist(), [], faces)

sonne = bpy.data.lights.new('sonne', 'SUN'); sonne.energy = 7.0; sonne.angle = math.radians(0.7); sonne.color = (1.0, 0.9, 0.78)
so = bpy.data.objects.new('sonne', sonne); sc.collection.objects.link(so); so.rotation_euler = (math.radians(72), 0, math.radians(112))   # flach von rechts hinten: je Pyramide eine helle, eine halbe, eine dunkle Flanke

cam = bpy.data.cameras.new('kamera'); cam.lens = 38; cam.clip_start = 0.005; cam.dof.use_dof = True; cam.dof.aperture_fstop = 5.6
ko = bpy.data.objects.new('kamera', cam); sc.collection.objects.link(ko); sc.camera = ko
ziel = bpy.data.objects.new('ziel', None); sc.collection.objects.link(ziel); ziel.location = (-0.14, 0.08, 0)
t = ko.constraints.new('TRACK_TO'); t.target = ziel; t.track_axis = 'TRACK_NEGATIVE_Z'; t.up_axis = 'UP_Y'
cam.dof.focus_object = ziel

def stelle(t):
    platte.location.x = -(U0 + V * t)            # Werkzeug bei Welt-x 0 ↔ u = U0 + V·t; der Zustand relativ dazu ist periodisch
    hauen(t)
    # kleiner Ruck der Kamera bei jedem Schlag
    ruck = sum(math.exp(-(t - s) * 22) for s, _ in schlaege if 0 <= t - s < 0.4)
    ko.location = (-0.52 + 0.003 * ruck, -0.92 - 0.002 * ruck, 0.62 + 0.004 * ruck)
    splitter_bei(t)
    if a.nah: ko.location = (-0.45, -0.32, 0.07); ziel.location = (-0.3, 0.0, -0.02)

def liste(s):
    out = []
    for teil in s.split(','):
        if '-' in teil: x, y = map(int, teil.split('-')); out += list(range(x, y + 1))
        else: out.append(int(teil))
    return out

for fr in liste(a.bilder):
    tt = ((fr - 1) % BILDER) / BILDER * ZEIT
    stelle(tt)
    sc.render.filepath = f'{a.aus}{fr:04d}.jpg'
    bpy.ops.render.render(write_still=True)
    print('BILD', fr, flush=True)
