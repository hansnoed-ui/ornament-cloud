# Spiegelkugeln auf Stein (Blender Cycles, Pfadverfolgung). 28. November 2026, erster Versuch auf gemieteter Grafikkarte (Runpod, RTX 4090).
# Christian: «Eine Spiegelkugel könnte auch über eine Website rollen» und «wie wir bessere Materialdarstellungen bekommen».
# Eine Marmorplatte mit dem gravierten Hauptsatz liegt in einer Rotunde; fünf Kugeln (vier Chrom, eine Messing) rollen in gleichem
# Abstand auf einer liegenden Acht über die Inschrift. Sie spiegeln den Raum, die Schrift und einander: das kann nur echte
# Pfadverfolgung. Bezug: Beobachter (3/4, 6/1), Rapport als gleicher Abstand ungleicher Kugeln (3/2).
# Schleife: 30 s, alles aus der Phase p gerechnet, Bild 901 = Bild 1.
#
#   blender -b -P kugeln.py -- --bilder 1,450 --proben 64 --aus /w/probe/p     (Probebilder)
#   blender -b -P kugeln.py -- --bilder 1-900 --aus /w/film/f                  (Film; danach ffmpeg)
# Stoffe in --stoff: marble_rock_02 (4k, CC0), sepulchral_chapel_rotunda_4k.hdr (CC0, Poly Haven), gravur.png (Satz in Marcellus, OFL).
import argparse, math, sys
import bpy

ap = argparse.ArgumentParser()
ap.add_argument('--bilder', default='1')
ap.add_argument('--proben', type=int, default=160)
ap.add_argument('--b', type=int, default=1080)
ap.add_argument('--h', type=int, default=1350)
ap.add_argument('--aus', default='/w/aus/f')
ap.add_argument('--stoff', default='/w/stoff/')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
BILDER = 900
TAU = math.tau

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'OPTIX'; pr.get_devices()
for d in pr.devices: d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'
sc.cycles.samples = a.proben; sc.cycles.use_adaptive_sampling = True
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPTIX'
sc.cycles.max_bounces = 16; sc.cycles.glossy_bounces = 16; sc.cycles.diffuse_bounces = 4
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = a.b, a.h, 100
sc.render.use_persistent_data = True
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 93
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'

def bild(name, farbig=True):
    i = bpy.data.images.load(a.stoff + name); i.colorspace_settings.name = 'sRGB' if farbig else 'Non-Color'; return i

# Welt: die Rotunde beleuchtet und spiegelt sich, die Kamera selbst sieht dahinter fast schwarz
w = bpy.data.worlds.new('raum'); sc.world = w; w.use_nodes = True; n = w.node_tree.nodes; l = w.node_tree.links; n.clear()
tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value[2] = math.radians(35)
env = n.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(a.stoff + 'sepulchral_chapel_rotunda_4k.hdr')
hg = n.new('ShaderNodeBackground'); hg.inputs['Strength'].default_value = 0.55
dunkel = n.new('ShaderNodeBackground'); dunkel.inputs['Color'].default_value = (0.003, 0.003, 0.0032, 1)
lp = n.new('ShaderNodeLightPath'); mx = n.new('ShaderNodeMixShader'); out = n.new('ShaderNodeOutputWorld')
l.new(tc.outputs['Generated'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], env.inputs['Vector']); l.new(env.outputs['Color'], hg.inputs['Color'])
l.new(lp.outputs['Is Camera Ray'], mx.inputs['Fac']); l.new(hg.outputs['Background'], mx.inputs[1]); l.new(dunkel.outputs['Background'], mx.inputs[2])
l.new(mx.outputs['Shader'], out.inputs['Surface'])

# die Platte: 4,8 × 6,0, 12 cm dick, poliert; in der Gravur matt und heller (frisch geschnitten)
PB, PH, PD = 4.8, 6.0, 0.12
bpy.ops.mesh.primitive_cube_add(size=1); platte = bpy.context.object; platte.scale = (PB, PH, PD); platte.location = (0, 0, -PD / 2)
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.cube_project(cube_size=1.0); bpy.ops.object.mode_set(mode='OBJECT')
# Oberseite: UV exakt 0..1 über die ganze Fläche, damit die Gravur sitzt
me = platte.data; uv = me.uv_layers.active.data
for poly in me.polygons:
    if poly.normal.z > 0.9:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co; uv[li].uv = ((v.x + PB / 2) / PB, (v.y + PH / 2) / PH)
bpy.ops.object.modifier_add(type='BEVEL'); platte.modifiers['Bevel'].width = 0.012; platte.modifiers['Bevel'].segments = 3

m = bpy.data.materials.new('marmor'); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
bs = n['Principled BSDF']
tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (PB / 2.6, PH / 2.6, 1)
diff = n.new('ShaderNodeTexImage'); diff.image = bild('marble_rock_02_diff_4k.jpg')
rau = n.new('ShaderNodeTexImage'); rau.image = bild('marble_rock_02_rough_4k.jpg', False)
nor = n.new('ShaderNodeTexImage'); nor.image = bild('marble_rock_02_nor_gl_4k.jpg', False)
grav = n.new('ShaderNodeTexImage'); grav.image = bild('gravur.png', False); grav.interpolation = 'Cubic'; grav.extension = 'CLIP'
for t in (diff, rau, nor): l.new(mp.outputs['Vector'], t.inputs['Vector'])
l.new(tc.outputs['UV'], mp.inputs['Vector']); l.new(tc.outputs['UV'], grav.inputs['Vector'])
nm = n.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.35; l.new(nor.outputs['Color'], nm.inputs['Color'])
bump = n.new('ShaderNodeBump'); bump.invert = True; bump.inputs['Distance'].default_value = 0.02; bump.inputs['Strength'].default_value = 1.0
l.new(grav.outputs['Color'], bump.inputs['Height']); l.new(nm.outputs['Normal'], bump.inputs['Normal']); l.new(bump.outputs['Normal'], bs.inputs['Normal'])
# Politur: Rauheit des Scans stark verkleinert; in der Kerbe matt
pol = n.new('ShaderNodeMath'); pol.operation = 'MULTIPLY_ADD'; pol.inputs[1].default_value = 0.07; pol.inputs[2].default_value = 0.012
l.new(rau.outputs['Color'], pol.inputs[0])
rk = n.new('ShaderNodeMix'); rk.data_type = 'FLOAT'; rk.inputs['B'].default_value = 0.7
l.new(grav.outputs['Color'], rk.inputs['Factor']); l.new(pol.outputs['Value'], rk.inputs['A']); l.new(rk.outputs['Result'], bs.inputs['Roughness'])
hell = n.new('ShaderNodeMix'); hell.data_type = 'RGBA'; hell.blend_type = 'SCREEN'
l.new(grav.outputs['Color'], hell.inputs['Factor']); l.new(diff.outputs['Color'], hell.inputs['A']); hell.inputs['B'].default_value = (0.32, 0.31, 0.29, 1)
l.new(hell.outputs['Result'], bs.inputs['Base Color'])
platte.data.materials.append(m)

# Boden: dunkler, matter Stein, damit die Platte als Gegenstand liegt
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -PD)); boden = bpy.context.object
mb = bpy.data.materials.new('boden'); mb.use_nodes = True; b = mb.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (0.006, 0.0058, 0.0055, 1); b.inputs['Roughness'].default_value = 0.55; boden.data.materials.append(mb)

# Kugeln
def metall(name, farbe, rau):
    mm = bpy.data.materials.new(name); mm.use_nodes = True; p = mm.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*farbe, 1); p.inputs['Metallic'].default_value = 1.0; p.inputs['Roughness'].default_value = rau; return mm
chrom, messing = metall('chrom', (0.93, 0.93, 0.92), 0.012), metall('messing', (0.91, 0.66, 0.34), 0.06)
RADIEN = [0.3, 0.18, 0.24, 0.13, 0.2]
kugeln = []
for i, r in enumerate(RADIEN):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=128, ring_count=64); k = bpy.context.object
    bpy.ops.object.shade_smooth(); k.data.materials.append(messing if i == 2 else chrom); kugeln.append(k)

# die liegende Acht (Lemniskate), längs der Platte, nach Bogenlänge gleichmässig unterteilt
A8 = 1.95
def acht(t): s = math.sin(t); c = math.cos(t); q = 1 + s * s; return (A8 * s * c / q * 0.9, A8 * c / q)
N = 6000; pts = [acht(TAU * i / N) for i in range(N + 1)]; lang = [0.0]
for i in range(N): lang.append(lang[-1] + math.dist(pts[i], pts[i + 1]))
L = lang[-1]
def auf(s):
    s = (s % 1.0) * L; lo, hi = 0, N
    while hi - lo > 1:
        mi = (lo + hi) // 2
        if lang[mi] <= s: lo = mi
        else: hi = mi
    f = (s - lang[lo]) / max(1e-9, lang[hi] - lang[lo]); return (pts[lo][0] + f * (pts[hi][0] - pts[lo][0]), pts[lo][1] + f * (pts[hi][1] - pts[lo][1]))

# Prüfen, ob sich zwei Kugeln je berühren
eng = min(math.dist(auf(p + i / 5), auf(p + j / 5)) - RADIEN[i] - RADIEN[j] for p in [k / 900 for k in range(900)] for i in range(5) for j in range(i + 1, 5))
print('kleinster Abstand zwischen Kugeln', round(eng, 3))

sonne = bpy.data.lights.new('sonne', 'SUN'); sonne.energy = 5.5; sonne.angle = math.radians(0.8); sonne.color = (1.0, 0.9, 0.78)
so = bpy.data.objects.new('sonne', sonne); sc.collection.objects.link(so); so.rotation_euler = (math.radians(77), 0, math.radians(-62))

cam = bpy.data.cameras.new('kamera'); cam.lens = 50; cam.sensor_fit = 'AUTO'; cam.dof.use_dof = True; cam.dof.aperture_fstop = 5.6
ko = bpy.data.objects.new('kamera', cam); sc.collection.objects.link(ko); sc.camera = ko
ziel = bpy.data.objects.new('ziel', None); sc.collection.objects.link(ziel); ziel.location = (0, 0.2, 0.0)
t = ko.constraints.new('TRACK_TO'); t.target = ziel; t.track_axis = 'TRACK_NEGATIVE_Z'; t.up_axis = 'UP_Y'
cam.dof.focus_object = ziel

def stelle(p):
    for i, k in enumerate(kugeln):
        x, y = auf(p + i / 5); k.location = (x, y, RADIEN[i])
    ko.location = (0.4 * math.sin(TAU * p), -3.6 + 0.2 * math.cos(TAU * p), 3.4)

def liste(s):
    out = []
    for teil in s.split(','):
        if '-' in teil: x, y = map(int, teil.split('-')); out += list(range(x, y + 1))
        else: out.append(int(teil))
    return out

for f in liste(a.bilder):
    stelle(((f - 1) % BILDER) / BILDER)
    sc.render.filepath = f'{a.aus}{f:04d}.jpg'
    bpy.ops.render.render(write_still=True)
    print('BILD', f, flush=True)
