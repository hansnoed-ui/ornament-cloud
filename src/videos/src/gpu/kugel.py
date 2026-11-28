# Eine grosse Spiegelkugel auf Stein (Blender Cycles). 28. November 2026, zweite Fassung von kugeln.py.
# Christian zur ersten Fassung: «Sieht gut aus, lesen kann man es so nicht. Eine grosse Kugel.» Darum: der Hauptsatz als echter
# Keilschnitt wie in furchen.py (mit dem Signet als Steinmetzzeichen), steiler Blick von oben, flaches Streiflicht; eine Chromkugel
# Kerben rot gefasst (Rubrizierung), damit man liest. Die Kugel rollt langsam um die Inschrift und spiegelt Satz, Kuppel und Licht, ohne die Schrift zu verdecken. Schleife 30 s.
#   blender -b -P kugel.py -- --bilder 1-900 --aus /w/kugel/f
import argparse, math, sys
import bpy

ap = argparse.ArgumentParser()
ap.add_argument('--bilder', default='1')
ap.add_argument('--proben', type=int, default=128)
ap.add_argument('--b', type=int, default=1080)
ap.add_argument('--h', type=int, default=1350)
ap.add_argument('--aus', default='/w/aus/f')
ap.add_argument('--stoff', default='/w/stoff/')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
BILDER, TAU = 900, math.tau
TIEF = 0.016          # Tiefe, die eine Kerbe bei 22 px Abstand vom Rand erreicht (Keilschnitt aus keil.py; Buchstaben 13 cm hoch)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'OPTIX'; pr.get_devices()
for d in pr.devices: d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'; sc.cycles.feature_set = 'EXPERIMENTAL'
sc.cycles.dicing_rate = 1.0; sc.cycles.offscreen_dicing_scale = 8; sc.cycles.max_subdivisions = 12
sc.cycles.samples = a.proben; sc.cycles.use_adaptive_sampling = True
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPTIX'
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = a.b, a.h, 100
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 93
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'

def bild(name, farbig=True):
    i = bpy.data.images.load(a.stoff + name); i.colorspace_settings.name = 'sRGB' if farbig else 'Non-Color'; return i

# Welt: Rotunde als Licht, die Kamera sieht dahinter fast schwarz
w = bpy.data.worlds.new('raum'); sc.world = w; w.use_nodes = True; n = w.node_tree.nodes; l = w.node_tree.links; n.clear()
tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value[2] = math.radians(35)
env = n.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(a.stoff + 'sepulchral_chapel_rotunda_4k.hdr')
hg = n.new('ShaderNodeBackground'); hg.inputs['Strength'].default_value = 0.6
dunkel = n.new('ShaderNodeBackground'); dunkel.inputs['Color'].default_value = (0.003, 0.003, 0.0032, 1)
lp = n.new('ShaderNodeLightPath'); mx = n.new('ShaderNodeMixShader'); out = n.new('ShaderNodeOutputWorld')
l.new(tc.outputs['Generated'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], env.inputs['Vector']); l.new(env.outputs['Color'], hg.inputs['Color'])
l.new(lp.outputs['Is Camera Ray'], mx.inputs['Fac']); l.new(hg.outputs['Background'], mx.inputs[1]); l.new(dunkel.outputs['Background'], mx.inputs[2])
l.new(mx.outputs['Shader'], out.inputs['Surface'])

# Oberseite der Platte: eine Fläche, beim Rechnen fein unterteilt und verschoben
PB, PH, PD = 4.8, 6.0, 0.12
bpy.ops.mesh.primitive_plane_add(size=1); platte = bpy.context.object; platte.scale = (PB, PH, 1)
bpy.ops.object.transform_apply(scale=True)
sub = platte.modifiers.new('fein', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = 1; sub.render_levels = 1
platte.cycles.use_adaptive_subdivision = True
# Seiten der Platte als Block knapp darunter
bpy.ops.mesh.primitive_cube_add(size=1); block = bpy.context.object; block.scale = (PB - 0.002, PH - 0.002, PD - 0.03); block.location = (0, 0, -PD / 2 - 0.015)   # Deckfläche 3 cm tief, unter den Kerben (sonst füllt sie sie wie ein flacher Boden)

m = bpy.data.materials.new('marmor'); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
try: m.displacement_method = 'DISPLACEMENT'
except AttributeError: m.cycles.displacement_method = 'DISPLACEMENT'
bs = n['Principled BSDF']; ausgang = n['Material Output']
tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (PB / 2.6, PH / 2.6, 1)
diff = n.new('ShaderNodeTexImage'); diff.image = bild('marble_rock_02_diff_4k.jpg')
rau = n.new('ShaderNodeTexImage'); rau.image = bild('marble_rock_02_rough_4k.jpg', False)
nor = n.new('ShaderNodeTexImage'); nor.image = bild('marble_rock_02_nor_gl_4k.jpg', False)
hoe = n.new('ShaderNodeTexImage'); hoe.image = bild('marble_rock_02_disp_4k.jpg', False)
grav = n.new('ShaderNodeTexImage'); grav.image = bild('keil-logo.png', False); grav.interpolation = 'Cubic'; grav.extension = 'CLIP'
for t in (diff, rau, nor, hoe): l.new(mp.outputs['Vector'], t.inputs['Vector'])
l.new(tc.outputs['UV'], mp.inputs['Vector']); l.new(tc.outputs['UV'], grav.inputs['Vector'])
nm = n.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.3; l.new(nor.outputs['Color'], nm.inputs['Color'])   # nicht an die Oberfläche: die Karte kennt die Verschiebung nicht und machte die Kerben flach (Schattierung ohne Tiefe)
# Höhe = Marmor (1,5 mm) − Kerbe (V-förmig, bis 16 mm)
hm = n.new('ShaderNodeMath'); hm.operation = 'MULTIPLY'; hm.inputs[1].default_value = 0.0015; l.new(hoe.outputs['Color'], hm.inputs[0])
gm = n.new('ShaderNodeMath'); gm.operation = 'MULTIPLY'; gm.inputs[1].default_value = -TIEF; l.new(grav.outputs['Color'], gm.inputs[0])
sm = n.new('ShaderNodeMath'); sm.operation = 'ADD'; l.new(hm.outputs['Value'], sm.inputs[0]); l.new(gm.outputs['Value'], sm.inputs[1])
disp = n.new('ShaderNodeDisplacement'); disp.inputs['Midlevel'].default_value = 0.0; disp.inputs['Scale'].default_value = 1.0
l.new(sm.outputs['Value'], disp.inputs['Height']); l.new(disp.outputs['Displacement'], ausgang.inputs['Displacement'])
pol = n.new('ShaderNodeMath'); pol.operation = 'MULTIPLY_ADD'; pol.inputs[1].default_value = 0.07; pol.inputs[2].default_value = 0.012
l.new(rau.outputs['Color'], pol.inputs[0])
rk = n.new('ShaderNodeMix'); rk.data_type = 'FLOAT'; rk.inputs['B'].default_value = 0.6
l.new(grav.outputs['Color'], rk.inputs['Factor']); l.new(pol.outputs['Value'], rk.inputs['A']); l.new(rk.outputs['Result'], bs.inputs['Roughness'])
hell = n.new('ShaderNodeMix'); hell.data_type = 'RGBA'; hell.blend_type = 'MIX'
fa = n.new('ShaderNodeMath'); fa.operation = 'MULTIPLY'; fa.use_clamp = True; fa.inputs[1].default_value = 5.0; l.new(grav.outputs['Color'], fa.inputs[0])   # auch flache Kerben ganz gefasst
l.new(fa.outputs['Value'], hell.inputs['Factor']); l.new(diff.outputs['Color'], hell.inputs['A']); hell.inputs['B'].default_value = (0.42, 0.07, 0.045, 1)   # Rubrizierung: die Kerben rot gefasst wie römische Inschriften (Mennige) *(G)*
l.new(hell.outputs['Result'], bs.inputs['Base Color'])
platte.data.materials.append(m); block.data.materials.append(m)

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -PD)); boden = bpy.context.object
mb = bpy.data.materials.new('boden'); mb.use_nodes = True; b = mb.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (0.006, 0.0058, 0.0055, 1); b.inputs['Roughness'].default_value = 0.55; boden.data.materials.append(mb)

# Streiflicht von links vorn, sehr flach: die Kerben werfen Schatten in sich selbst
sonne = bpy.data.lights.new('sonne', 'SUN'); sonne.energy = 6.0; sonne.angle = math.radians(0.6); sonne.color = (1.0, 0.9, 0.78)
so = bpy.data.objects.new('sonne', sonne); sc.collection.objects.link(so); so.rotation_euler = (math.radians(80), 0, math.radians(-72))

cam = bpy.data.cameras.new('kamera'); cam.sensor_fit = 'AUTO'; cam.clip_start = 0.001; cam.dof.use_dof = True
ko = bpy.data.objects.new('kamera', cam); sc.collection.objects.link(ko); sc.camera = ko
ziel = bpy.data.objects.new('ziel', None); sc.collection.objects.link(ziel)
t = ko.constraints.new('TRACK_TO'); t.target = ziel; t.track_axis = 'TRACK_NEGATIVE_Z'; t.up_axis = 'UP_Y'
cam.dof.focus_object = ziel

def sanft(x): x = min(1.0, max(0.0, x)); return x * x * (3 - 2 * x)

# die Kugel: Chrom, 42 cm Radius, auf einer Ellipse um den Satz (Mitte etwas unter der Schrift, damit das Signet umrundet wird)
R = 0.55
chrom = bpy.data.materials.new('chrom'); chrom.use_nodes = True; cp = chrom.node_tree.nodes['Principled BSDF']
cp.inputs['Base Color'].default_value = (0.93, 0.93, 0.92, 1); cp.inputs['Metallic'].default_value = 1.0; cp.inputs['Roughness'].default_value = 0.01
bpy.ops.mesh.primitive_uv_sphere_add(radius=R, segments=160, ring_count=80); kugel = bpy.context.object
bpy.ops.object.shade_smooth(); kugel.data.materials.append(chrom)
EX, EY, EM = 1.5, 2.15, -0.5

cam.lens = 40; cam.dof.aperture_fstop = 11
ziel.location = (0.0, -0.4, 0.0)

def stelle(p):
    w = TAU * p - math.pi / 2
    kugel.location = (EX * math.cos(w), EM + EY * math.sin(w), R + 0.0)
    ko.location = (0.2 * math.sin(TAU * p), -2.75, 3.8)

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
