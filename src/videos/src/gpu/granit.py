# Polierter Granit, der spiegelt (Blender Cycles). 28. November 2026, auf gemieteter Grafikkarte.
# Die Probe ohne Grafikkarte (formschleifen/formen/stein-granit.js) zeigte keine Spiegelung. Hier: eine schwarze, polierte Granitplatte
# liegt in der Rotunde; die Kamera gleitet flach darüber, und im Stein läuft das Spiegelbild des Raums mit. In die Platte ist Zettel 3/4
# gehauen («Man kehrt zurück, wo man nicht fertig geworden ist»), Keilschnitt mit Blattgold, darunter das Signet von ornament.cloud
# (Re-entry-Schlaufe) und der Name, wie auf einer Gedenktafel. Spiegelung als Beobachtung (3/4, 6/1): der Stein zeigt, was vor ihm steht.
# Stoffe: ambientCG Granite002A (CC0, abgedunkelt), Rotunde (Poly Haven, CC0), Inschrift aus tafel.mjs + keil.py (tafel-netz.png).
#   blender -b -P granit.py -- --bilder 1-900 --aus /w/granit/f
import argparse, math, sys
import bpy
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--bilder', default='1')
ap.add_argument('--proben', type=int, default=128)
ap.add_argument('--b', type=int, default=1080)
ap.add_argument('--h', type=int, default=1350)
ap.add_argument('--aus', default='/w/aus/f')
ap.add_argument('--stoff', default='/w/stoff/')
a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
BILDER, TAU = 900, math.tau
TB, TH = 2.0, 1.5             # Feld der Inschrift (m)
TIEF = 20 / 3000              # Tiefe des Keilschnitts bei voller Stärke (keil.py mit TIEFSTE=20 bei 3000 px/m, 45°)
PB, PH = 4.0, 3.4             # Platte

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
pr = bpy.context.preferences.addons['cycles'].preferences
pr.compute_device_type = 'OPTIX'; pr.get_devices()
for d in pr.devices: d.use = d.type == 'OPTIX'
sc.cycles.device = 'GPU'
sc.cycles.samples = a.proben; sc.cycles.use_adaptive_sampling = True
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPTIX'
sc.cycles.max_bounces = 12; sc.cycles.glossy_bounces = 12
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = a.b, a.h, 100
sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 93
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'

def bild(name, farbig=True):
    i = bpy.data.images.load(a.stoff + name); i.colorspace_settings.name = 'sRGB' if farbig else 'Non-Color'; return i

w = bpy.data.worlds.new('raum'); sc.world = w; w.use_nodes = True; n = w.node_tree.nodes; l = w.node_tree.links; n.clear()
tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value[2] = math.radians(20)
env = n.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(a.stoff + 'sepulchral_chapel_rotunda_4k.hdr')
hg = n.new('ShaderNodeBackground'); hg.inputs['Strength'].default_value = 1.0
dunkel = n.new('ShaderNodeBackground'); dunkel.inputs['Color'].default_value = (0, 0, 0, 1)
lp = n.new('ShaderNodeLightPath'); mx = n.new('ShaderNodeMixShader'); out = n.new('ShaderNodeOutputWorld')
l.new(tc.outputs['Generated'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], env.inputs['Vector']); l.new(env.outputs['Color'], hg.inputs['Color'])
l.new(lp.outputs['Is Camera Ray'], mx.inputs['Fac']); l.new(hg.outputs['Background'], mx.inputs[1]); l.new(dunkel.outputs['Background'], mx.inputs[2])
l.new(mx.outputs['Shader'], out.inputs['Surface'])

# Feld der Inschrift als dichtes Netz (1,2 mm), Höhe aus der Keilschnitt-Karte; rundherum die flache Platte
kb = bpy.data.images.load(a.stoff + 'tafel-netz.png'); kb.colorspace_settings.name = 'Non-Color'
KW, KH = kb.size; kp = np.empty(KW * KH * 4, np.float32); kb.pixels.foreach_get(kp); kp = kp.reshape(KH, KW, 4)[..., 0]
bpy.ops.mesh.primitive_grid_add(x_subdivisions=KW, y_subdivisions=KH, size=1); tafel = bpy.context.object
tafel.scale = (TB, TH, 1); bpy.ops.object.transform_apply(scale=True)
NP = len(tafel.data.vertices); co = np.empty(NP * 3, np.float32); tafel.data.vertices.foreach_get('co', co)
ix = np.clip(((co[0::3] / TB + 0.5) * KW).astype(np.int32), 0, KW - 1); iy = np.clip(((co[1::3] / TH + 0.5) * KH).astype(np.int32), 0, KH - 1)
co[2::3] = -TIEF * kp[iy, ix]; tafel.data.vertices.foreach_set('co', co); tafel.data.update()
def rechteck(x0, x1, y0, y1): return [(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)]
teile = [rechteck(-PB / 2, PB / 2, TH / 2, PH / 2), rechteck(-PB / 2, PB / 2, -PH / 2, -TH / 2), rechteck(-PB / 2, -TB / 2, -TH / 2, TH / 2), rechteck(TB / 2, PB / 2, -TH / 2, TH / 2)]
pme = bpy.data.meshes.new('platte'); pme.from_pydata(sum(teile, []), [], [(4 * i, 4 * i + 1, 4 * i + 2, 4 * i + 3) for i in range(4)])
platte = bpy.data.objects.new('platte', pme); sc.collection.objects.link(platte)
bpy.ops.mesh.primitive_cube_add(size=1); block = bpy.context.object; block.scale = (PB, PH, 0.12); block.location = (0, 0, -0.03 - 0.06)
# Kante der Platte: die Seiten des Blocks reichen bis zur Oberfläche
bpy.ops.mesh.primitive_cube_add(size=1); rand = bpy.context.object; rand.scale = (PB, PH, 0.03); rand.location = (0, 0, -0.015)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
for f in rand.data.polygons: f.select = abs(f.normal.z) > 0.9
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='FACE'); bpy.ops.object.mode_set(mode='OBJECT')

m = bpy.data.materials.new('granit'); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
bs = n['Principled BSDF']; ausgang = n['Material Output']
tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / 1.2, 1 / 1.2, 1)
l.new(tc.outputs['Object'], mp.inputs['Vector'])
fa = n.new('ShaderNodeTexImage'); fa.image = bild('granit-farbe.jpg'); l.new(mp.outputs['Vector'], fa.inputs['Vector'])
dk = n.new('ShaderNodeMix'); dk.data_type = 'RGBA'; dk.blend_type = 'MULTIPLY'; dk.inputs['Factor'].default_value = 1.0
l.new(fa.outputs['Color'], dk.inputs['A']); dk.inputs['B'].default_value = (0.035, 0.035, 0.037, 1); l.new(dk.outputs['Result'], bs.inputs['Base Color'])
bs.inputs['Roughness'].default_value = 0.03; bs.inputs['IOR'].default_value = 1.55
# Blattgold in der Kerbe (unter der Oberfläche)
gold = n.new('ShaderNodeBsdfPrincipled'); gold.inputs['Base Color'].default_value = (0.95, 0.7, 0.36, 1); gold.inputs['Metallic'].default_value = 1.0; gold.inputs['Roughness'].default_value = 0.3
xyz = n.new('ShaderNodeSeparateXYZ'); l.new(tc.outputs['Object'], xyz.inputs['Vector'])
lt = n.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = -0.0003; l.new(xyz.outputs['Z'], lt.inputs[0])
ms = n.new('ShaderNodeMixShader'); l.new(lt.outputs['Value'], ms.inputs['Fac']); l.new(bs.outputs['BSDF'], ms.inputs[1]); l.new(gold.outputs['BSDF'], ms.inputs[2])
l.new(ms.outputs['Shader'], ausgang.inputs['Surface'])
for o in (tafel, platte, block, rand): o.data.materials.append(m)

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.15)); boden = bpy.context.object
mb = bpy.data.materials.new('boden'); mb.use_nodes = True; b = mb.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (0, 0, 0, 1); b.inputs['Roughness'].default_value = 0.8; b.inputs['Specular IOR Level'].default_value = 0.0   # ohne Glanz, sonst grauer Streifen hinter der Platte; boden.data.materials.append(mb)

cam = bpy.data.cameras.new('kamera'); cam.lens = 34; cam.dof.use_dof = True; cam.dof.aperture_fstop = 4.0
ko = bpy.data.objects.new('kamera', cam); sc.collection.objects.link(ko); sc.camera = ko
ziel = bpy.data.objects.new('ziel', None); sc.collection.objects.link(ziel)
t = ko.constraints.new('TRACK_TO'); t.target = ziel; t.track_axis = 'TRACK_NEGATIVE_Z'; t.up_axis = 'UP_Y'
cam.dof.focus_object = ziel

def stelle(p):
    s = math.sin(TAU * p)
    ko.location = (0.75 * s, -1.6, 1.2 + 0.08 * math.cos(TAU * p))
    ziel.location = (0.3 * s, 0.05, 0.0)

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
