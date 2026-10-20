# Tiny Empires 3D models, built in Blender from code (no hand modelling, no paid assets).
# Organic forms (bodies, heads, animals) are metaballs, so limbs melt smoothly into bodies like sculpted clay; hard
# props (spears, shields, bows) are simple solids. Each part carries a colour; ambient occlusion is baked into the
# vertex colours by ray casting, so the models read well under the game's soft toon light.
# Team colour: vertex alpha 0 marks the parts the game paints in the owner's colour (tunics, shields, banners).
#
# Usage (Blender 4.2+ as a Python module, `pip install bpy`, or `blender -b -P`):
#   python tools/blender/models.py [--out godot/models] [--preview previews.png] [--only horse,warrior]
# Writes one JSON per model: { p: [x,y,z...], n: [...], c: [r,g,b,a...] } in game units (y up), the batch format
# godot/main.js turns into meshes.
import bpy, bmesh, math, json, os, sys, random
from mathutils import Vector, Quaternion, Matrix
from mathutils.bvhtree import BVHTree

def rgb(h, a=1.0):
    h = h.lstrip('#'); return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a)

TEAM = (0.85, 0.2, 0.2, 0.0)  # placeholder red; alpha 0 = owner's colour in game

# ---------------------------------------------------------------- building blocks
class Model:
    """A model under construction: metaball elements (with colours) plus solid parts."""
    def __init__(self, name):
        self.name, self.balls, self.solids = name, [], []
    def ball(self, co, r, col, scale=(1, 1, 1), rot=None, kind='BALL'):
        self.balls.append(dict(co=Vector(co), r=r, col=col, scale=scale, rot=rot, kind=kind)); return self
    def capsule(self, a, b, r, col):
        a, b = Vector(a), Vector(b); d = b - a; L = d.length
        q = Vector((1, 0, 0)).rotation_difference(d.normalized())
        self.balls.append(dict(co=(a + b) / 2, r=r, col=col, half=L / 2, rot=q, kind='CAPSULE')); return self
    def solid(self, obj, col):
        self.solids.append((obj, col)); return self

def new_obj(mesh, name='part'):
    o = bpy.data.objects.new(name, mesh); bpy.context.scene.collection.objects.link(o); return o

def prim_cylinder(a, b, r0, r1=None, seg=12):
    """a frustum from point a to point b"""
    r1 = r0 if r1 is None else r1
    a, b = Vector(a), Vector(b); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=(b - a).length)
    m = bpy.data.meshes.new('cyl'); bm.to_mesh(m); bm.free()
    o = new_obj(m); q = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
    o.matrix_world = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4(); return o

def prim_sphere(co, r, scale=(1, 1, 1), seg=16):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2 + 2, radius=r)
    m = bpy.data.meshes.new('sph'); bm.to_mesh(m); bm.free()
    o = new_obj(m); o.matrix_world = Matrix.Translation(co) @ Matrix.Diagonal((*scale, 1)); return o

def prim_box(co, size, rot=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    m = bpy.data.meshes.new('box'); bm.to_mesh(m); bm.free()
    o = new_obj(m); R = (rot.to_matrix().to_4x4() if rot else Matrix())
    o.matrix_world = Matrix.Translation(co) @ R @ Matrix.Diagonal((*size, 1)); return o

def prim_arc(center, radius, thick, a0, a1, axis_rot=None, seg=16):
    """a bent bar (bows): a torus segment in the xz plane"""
    bm = bmesh.new(); verts_rings = []
    for i in range(seg + 1):
        a = a0 + (a1 - a0) * i / seg; c = Vector((math.cos(a) * radius, 0, math.sin(a) * radius))
        t = Vector((-math.sin(a), 0, math.cos(a))); n = c.normalized(); bnorm = Vector((0, 1, 0))
        ring = [bm.verts.new(c + (n * math.cos(k * math.pi / 3) + bnorm * math.sin(k * math.pi / 3)) * thick) for k in range(6)]
        verts_rings.append(ring)
    for i in range(seg):
        for k in range(6):
            bm.faces.new((verts_rings[i][k], verts_rings[i][(k + 1) % 6], verts_rings[i + 1][(k + 1) % 6], verts_rings[i + 1][k]))
    m = bpy.data.meshes.new('arc'); bm.to_mesh(m); bm.free()
    o = new_obj(m); R = axis_rot.to_matrix().to_4x4() if axis_rot else Matrix()
    o.matrix_world = Matrix.Translation(center) @ R; return o

def field_owner(m, p):
    """which metaball element a surface point belongs to (smallest normalised distance)"""
    best, bc = 1e9, (1, 0, 1, 1)
    for b in m.balls:
        d = p - b['co']
        if b['kind'] == 'CAPSULE':
            axis = b['rot'] @ Vector((1, 0, 0)); t = max(-b['half'], min(b['half'], d.dot(axis))); d = d - axis * t; s = d.length / b['r']
        else:
            if b['rot'] is not None: d = b['rot'].inverted() @ d
            s = Vector((d.x / b['scale'][0], d.y / b['scale'][1], d.z / b['scale'][2])).length / b['r']
        if s < best: best, bc = s, b['col']
    return bc

def build(m, res=0.025, target_tris=2500, smooth=True, cap=100000):
    """metaballs → mesh, plus solids; returns one joined, coloured, smooth mesh object"""
    mb = bpy.data.metaballs.new(m.name); mb.resolution = res; mb.render_resolution = res; mb.threshold = 0.6
    # a lone element's surface sits where stiffness·(1 - d²/R²)² = threshold, i.e. at 0.672·R: scale R so that the
    # radius given in the model is the visible one (and neighbouring parts overlap and melt together as designed)
    K = 1 / math.sqrt(1 - math.sqrt(0.6 / 2.0))
    for b in m.balls:
        e = mb.elements.new(type=b['kind']); e.co = b['co']; e.radius = b['r'] * K; e.stiffness = 2.0
        if b['kind'] == 'CAPSULE': e.size_x = b['half']; e.rotation = b['rot']
        elif b['kind'] == 'ELLIPSOID': e.size_x, e.size_y, e.size_z = b['scale']; e.rotation = b['rot'] or Quaternion()
        elif b['rot'] is not None: e.rotation = b['rot']
    mo = new_obj(mb, m.name + '_mb')
    dg = bpy.context.evaluated_depsgraph_get()
    body = bpy.data.meshes.new_from_object(mo.evaluated_get(dg)); bpy.data.objects.remove(mo)
    parts = []
    bo = new_obj(body, m.name)
    # decimate the dense metaball surface
    if len(body.polygons) > target_tris:
        mod = bo.modifiers.new('dec', 'DECIMATE'); mod.ratio = target_tris / len(body.polygons)
        dg = bpy.context.evaluated_depsgraph_get(); dm = bpy.data.meshes.new_from_object(bo.evaluated_get(dg)); bo.modifiers.clear(); bo.data = dm
    colour_mesh(bo, lambda p: field_owner(m, p))
    parts.append(bo)
    for o, col in m.solids:
        o.data.transform(o.matrix_world); o.matrix_world = Matrix()
        colour_mesh(o, (lambda c: (lambda p: c))(col)); parts.append(o)
    # join everything into the first object
    bm = bmesh.new()
    for o in parts: bm.from_mesh(o.data)
    out = bpy.data.meshes.new(m.name); bm.to_mesh(out); bm.free()
    for o in parts: bpy.data.objects.remove(o)
    obj = new_obj(out, m.name)
    if len(obj.data.polygons) > cap:  # phones draw hundreds of these: keep each one light
        mod = obj.modifiers.new('cap', 'DECIMATE'); mod.ratio = cap / len(obj.data.polygons)
        dg = bpy.context.evaluated_depsgraph_get(); dm = bpy.data.meshes.new_from_object(obj.evaluated_get(dg)); obj.modifiers.clear(); obj.data = dm
    for p in obj.data.polygons: p.use_smooth = smooth
    bake_ao(obj)
    return obj

def colour_mesh(o, fn):
    me = o.data
    attr = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            attr.data[li].color = fn(Vector(v))

def bake_ao(obj, rays=24, dist=0.6):
    """ambient occlusion into the vertex colours (rgb only; alpha keeps the team-colour mask)"""
    me = obj.data; me.calc_loop_triangles() if hasattr(me, 'calc_loop_triangles') else None
    bm = bmesh.new(); bm.from_mesh(me); tree = BVHTree.FromBMesh(bm); bm.free()
    rnd = random.Random(7); dirs = []
    while len(dirs) < rays:
        v = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1)))
        if 0.05 < v.length <= 1: dirs.append(v.normalized())
    occ = []
    for v in me.vertices:
        n = v.normal; hit = 0; tot = 0
        for d in dirs:
            if d.dot(n) <= 0: d = -d
            w = d.dot(n); tot += w
            if tree.ray_cast(v.co + n * 0.004, d, dist)[0] is not None: hit += w
        ground = max(0.0, min(1.0, v.co.z / 0.35))  # contact shadow near the ground
        occ.append((1 - 0.75 * hit / max(tot, 1e-6)) * (0.72 + 0.28 * ground))
    attr = me.color_attributes['Col']
    for li, l in enumerate(me.loops):
        c = attr.data[li].color; k = occ[l.vertex_index]
        # team-colour corners keep only the shading (grey), which the game multiplies by the owner's colour
        attr.data[li].color = (k, k, k, 0.0) if c[3] < 0.5 else (c[0] * k, c[1] * k, c[2] * k, c[3])

def export(obj, path, size):
    """indexed triangles in game units (y up, scaled so the largest dimension is `size`): { v: [x,y,z, nx,ny,nz, r,g,b,a ...],
    i: [triangle indices] }. Corners sharing position, normal and colour share a vertex."""
    me = obj.data; bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces)
    tmp = bpy.data.meshes.new('tri'); bm.to_mesh(tmp); bm.free()
    xs = [v.co for v in tmp.vertices]; lo = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs)))
    hi = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
    k = size / max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z); cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
    attr = tmp.color_attributes['Col']; V, I, seen = [], [], {}
    for poly in tmp.polygons:
        for li in poly.loop_indices:
            v = tmp.vertices[tmp.loops[li].vertex_index]; n = v.normal if poly.use_smooth else poly.normal; c = attr.data[li].color
            key = (round((v.co.x - cx) * k, 4), round((v.co.z - lo.z) * k, 4), round(-(v.co.y - cy) * k, 4),
                   round(n.x, 2), round(n.z, 2), round(-n.y, 2), round(c[0], 2), round(c[1], 2), round(c[2], 2), round(c[3], 1))
            if key not in seen: seen[key] = len(seen); V.extend(key)
            I.append(seen[key])
    bpy.data.meshes.remove(tmp)
    with open(path, 'w') as f: json.dump({'v': V, 'i': I}, f, separators=(',', ':'))
    return len(I) // 3

# ---------------------------------------------------------------- palette
SKIN, HAIR, PANTS, BOOTS = rgb('#eaa77c'), rgb('#4e2e18'), rgb('#5a4a3a'), rgb('#4a3020')
METAL, WOOD, LEATHER, EYE, WHITE = rgb('#b9bec8'), rgb('#8a5a32'), rgb('#7a4a26'), rgb('#1e1a1c'), rgb('#ffffff')
def qy(deg): return Quaternion((0, 1, 0), math.radians(deg))
def qx(deg): return Quaternion((1, 0, 0), math.radians(deg))
def qz(deg): return Quaternion((0, 0, 1), math.radians(deg))

# ---------------------------------------------------------------- animals (face +x)
def eyes(m, x, y, z, r, col=EYE):
    for s in (-1, 1):
        m.solid(prim_sphere(Vector((x, s * y, z)), r, (0.7, 1, 1.15), 10), col)
        m.solid(prim_sphere(Vector((x + r * 0.6, s * (y + r * 0.15), z + r * 0.45)), r * 0.32, (1, 1, 1), 8), WHITE)

def quadruped(m, body, dark, legcol, hoof, *, L=1.0, legs=0.55, thick=1.0, neck=(0.0, 0.0), head=0.3, bulk=1.0, z0=None):
    z = (z0 if z0 is not None else legs + 0.45 * bulk)
    m.ball((0, 0, z), 0.58, body, scale=(1.45 * L, 0.78 * bulk, 0.82 * bulk), kind='ELLIPSOID')
    m.ball((0.55 * L, 0, z + 0.02), 0.44 * bulk, body); m.ball((-0.55 * L, 0, z + 0.05), 0.46 * bulk, body)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * 0.55 * L, sy * 0.22 * bulk
            m.capsule((x, y, z - 0.05), (x, y, legs * 0.5), 0.15 * thick, body)
            m.capsule((x, y, legs * 0.5), (x, y, 0.16), 0.11 * thick, legcol)
            m.solid(prim_cylinder((x, y, 0), (x, y, 0.15), 0.12 * thick, 0.11 * thick, 10), hoof)
    return z

def horse(col=rgb('#9a5a2e'), mane=rgb('#3b2414'), name='horse', graze=False):
    m = Model(name); D = mane
    z = quadruped(m, col, D, col, rgb('#2a2018'), legs=0.75)
    nb, ht = (Vector((0.75, 0, z + 0.25)), Vector((1.25, 0, 0.55)) if graze else Vector((1.05, 0, z + 0.85)))
    m.capsule(nb, ht, 0.24, col)
    hd = ht + Vector((0.2, 0, 0.05 if not graze else -0.12))
    m.ball(hd, 0.3, col, scale=(1.3, 0.8, 0.85), rot=qy(30 if not graze else 70), kind='ELLIPSOID')
    mz = hd + (Vector((0.28, 0, -0.16)) if not graze else Vector((0.12, 0, -0.3)))
    m.ball(mz, 0.19, rgb('#7a4626'))
    for i in range(6):  # mane along the top of the neck
        t = i / 5; p = nb.lerp(ht, t) + Vector((-0.12, 0, 0.18))
        m.ball(p, 0.12, D)
    m.capsule((-0.95, 0, z + 0.15), (-1.2, 0, z - 0.55), 0.11, D)
    ey = hd + Vector((0.12, 0, 0.1 if not graze else 0.0))
    eyes(m, ey.x, 0.2, ey.z, 0.06)
    for s in (-1, 1):
        e0 = hd + Vector((-0.08, s * 0.1, 0.22 if not graze else 0.12)); m.solid(prim_cylinder(e0, e0 + Vector((-0.04, s * 0.03, 0.22)), 0.06, 0.01, 8), col)
    return m

def cow(col=rgb('#f4efe6'), spots=rgb('#2c2624'), name='cattle', graze=False):
    m = Model(name)
    z = quadruped(m, col, spots, col, rgb('#2a2220'), legs=0.5, thick=1.25, bulk=1.15)
    if spots:
        for p, r in [((0.2, -0.45, z + 0.2), 0.2), ((-0.45, 0.42, z + 0.05), 0.22), ((-0.2, -0.4, z - 0.15), 0.16), ((0.45, 0.4, z + 0.25), 0.15)]:
            m.ball(p, r, spots)
    hd = Vector((1.05, 0, z + 0.2)) if not graze else Vector((1.05, 0, 0.45))
    m.capsule((0.7, 0, z + 0.1), hd, 0.3, col)
    m.ball(hd + Vector((0.12, 0, 0)), 0.32, col, scale=(1.05, 0.95, 1.0), kind='ELLIPSOID')
    m.ball(hd + Vector((0.36, 0, -0.14)), 0.22, rgb('#e8a8a0'), scale=(0.8, 1.05, 0.75), kind='ELLIPSOID')
    m.ball((-0.25, 0, z - 0.42), 0.13, rgb('#eaa6a0'))
    eyes(m, hd.x + 0.28, 0.2, hd.z + 0.12, 0.06)
    for s in (-1, 1):
        m.solid(prim_cylinder(hd + Vector((0.0, s * 0.2, 0.25)), hd + Vector((0.05, s * 0.42, 0.45)), 0.055, 0.012, 8), rgb('#f2e8cc'))
        m.ball(hd + Vector((-0.02, s * 0.36, 0.12)), 0.1, col, scale=(0.6, 1.3, 0.6), kind='ELLIPSOID')
    m.capsule((-0.95, 0, z + 0.2), (-1.0, 0, z - 0.45), 0.06, col); m.ball((-1.0, 0, z - 0.5), 0.1, spots or col)
    return m

def sheep(name='sheep'):
    m = Model(name); wool, face = rgb('#f6f2ea'), rgb('#3a3330')
    z = 0.62
    rnd = random.Random(3)
    for i in range(22):  # a fluffy fleece of overlapping puffs
        a = rnd.uniform(0, 2 * math.pi); u = rnd.uniform(-1, 1)
        p = Vector((u * 0.6, math.cos(a) * 0.32, z + math.sin(a) * 0.26 + 0.05))
        m.ball(p, rnd.uniform(0.2, 0.26), wool)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * 0.4, sy * 0.17
            m.capsule((x, y, z - 0.2), (x, y, 0.1), 0.07, face); m.solid(prim_cylinder((x, y, 0), (x, y, 0.1), 0.08, 0.075, 8), face)
    hd = Vector((0.85, 0, z + 0.12))
    m.ball(hd, 0.24, face, scale=(1.25, 0.85, 0.95), rot=qy(25), kind='ELLIPSOID')
    m.ball(hd + Vector((-0.12, 0, 0.2)), 0.2, wool)
    eyes(m, hd.x + 0.12, 0.16, hd.z + 0.06, 0.05, rgb('#f8e8c0'))
    for s in (-1, 1): m.ball(hd + Vector((-0.08, s * 0.25, 0.04)), 0.09, face, scale=(0.6, 1.4, 0.5), kind='ELLIPSOID')
    return m

# ---------------------------------------------------------------- fields and minerals
def wheat(name='wheat'):
    """a ripe field: golden soil with stubble, dense bunches of stalks with fat ears"""
    m = Model(name); rnd = random.Random(11)
    m.solid(prim_box((0, 0, 0.04), (1.6, 1.15, 0.08)), rgb('#b08a46'))
    for i in range(7):
        for j in range(5):
            cx, cy = -0.62 + i * 0.207 + rnd.uniform(-0.03, 0.03), -0.42 + j * 0.21 + rnd.uniform(-0.03, 0.03)
            for k in range(2):
                x, y = cx + rnd.uniform(-0.05, 0.05), cy + rnd.uniform(-0.05, 0.05)
                h = rnd.uniform(0.45, 0.6); top = Vector((x + rnd.uniform(-0.05, 0.05), y + rnd.uniform(-0.05, 0.05), h))
                m.solid(prim_cylinder((x, y, 0.07), top, 0.014, 0.01, 4), rgb('#d2a84c'))
                m.solid(prim_sphere(top + Vector((0, 0, 0.07)), 0.042, (0.85, 0.85, 2.0), 6), rgb('#f2c856') if k else rgb('#e8b444'))
    return m

def ore(vein, name, crystals=False):
    """a faceted outcrop: a few chunky boulders with ore patches breaking the surface"""
    m = Model(name); rock = rgb('#8f877c'); rnd = random.Random(len(name) * 7)
    for i in range(5):
        a = i * 1.3 + rnd.uniform(-0.2, 0.2); d = 0.0 if i == 0 else rnd.uniform(0.3, 0.42)
        r = 0.42 if i == 0 else rnd.uniform(0.22, 0.3)
        m.ball((math.cos(a) * d, math.sin(a) * d, r * 0.55), r, rock, scale=(1.1, 0.95, 0.85), rot=qz(rnd.uniform(0, 90)), kind='ELLIPSOID')
    for i in range(9):
        a = rnd.uniform(0, 6.28); d = rnd.uniform(0.15, 0.4)
        m.ball((math.cos(a) * d, math.sin(a) * d, rnd.uniform(0.3, 0.5)), rnd.uniform(0.09, 0.13), vein)
    if crystals:
        for i in range(6):
            a = i * 1.05; b = Vector((math.cos(a) * 0.2, math.sin(a) * 0.2, 0.32))
            m.solid(prim_cylinder(b, b + Vector((math.cos(a) * 0.14, math.sin(a) * 0.14, 0.45)), 0.08, 0.0, 6), vein)
    return m

def deer(name='deer'):
    m = Model(name); col, dark = rgb('#b9783e'), rgb('#6a4022')
    z = quadruped(m, col, dark, col, rgb('#2a2018'), legs=0.85, thick=0.8, bulk=0.85)
    nb, ht = Vector((0.6, 0, z + 0.2)), Vector((0.85, 0, z + 0.85))
    m.capsule(nb, ht, 0.17, col); hd = ht + Vector((0.15, 0, 0.02))
    m.ball(hd, 0.24, col, scale=(1.3, 0.8, 0.85), rot=qy(25), kind='ELLIPSOID'); m.ball(hd + Vector((0.24, 0, -0.1)), 0.13, dark)
    eyes(m, hd.x + 0.1, 0.16, hd.z + 0.06, 0.05)
    m.ball((-0.75, 0, z + 0.2), 0.14, rgb('#f6efe2'))  # white tail
    for s in (-1, 1):  # antlers
        b = hd + Vector((-0.05, s * 0.1, 0.2)); t = b + Vector((-0.1, s * 0.2, 0.45))
        m.solid(prim_cylinder(b, t, 0.035, 0.02, 6), rgb('#e8dcc0'))
        m.solid(prim_cylinder(b.lerp(t, 0.5), b.lerp(t, 0.5) + Vector((0.15, s * 0.05, 0.2)), 0.025, 0.012, 6), rgb('#e8dcc0'))
        m.ball(hd + Vector((-0.1, s * 0.2, 0.12)), 0.08, col, scale=(0.5, 1.4, 0.7), kind='ELLIPSOID')
    return m

def elephant(name='elephant'):
    m = Model(name); col, dark = rgb('#9a9896'), rgb('#6e6c6a')
    z = quadruped(m, col, dark, col, rgb('#5a5856'), legs=0.6, thick=2.0, bulk=1.35)
    hd = Vector((0.95, 0, z + 0.35)); m.ball(hd, 0.45, col)
    for k in range(5):  # trunk curling down
        t = k / 4; m.ball(hd + Vector((0.32 + 0.12 * t, 0, -0.25 - 0.55 * t)), 0.17 - 0.06 * t, col)
    for s in (-1, 1):
        m.ball(hd + Vector((-0.12, s * 0.42, -0.12)), 0.34, dark, scale=(0.18, 0.9, 1.15), rot=qz(-s * 25), kind='ELLIPSOID')  # big flapping ears
        m.solid(prim_cylinder(hd + Vector((0.3, s * 0.18, -0.3)), hd + Vector((0.6, s * 0.22, -0.45)), 0.06, 0.012, 8), rgb('#fbf6e6'))
    eyes(m, hd.x + 0.3, 0.25, hd.z + 0.1, 0.06)
    m.capsule((-0.95, 0, z + 0.1), (-1.05, 0, z - 0.4), 0.05, col)
    return m

def fox(name='fox'):
    m = Model(name); col, dark, white = rgb('#d8742a'), rgb('#3a2418'), rgb('#f6efe2')
    z = quadruped(m, col, dark, dark, dark, legs=0.45, thick=0.75, bulk=0.75)
    hd = Vector((0.75, 0, z + 0.3)); m.capsule((0.5, 0, z + 0.1), hd, 0.17, col)
    m.ball(hd, 0.25, col); m.ball(hd + Vector((0.25, 0, -0.06)), 0.11, white, scale=(1.6, 0.8, 0.7), kind='ELLIPSOID')
    m.ball(hd + Vector((0.42, 0, -0.06)), 0.04, dark)
    eyes(m, hd.x + 0.15, 0.13, hd.z + 0.06, 0.045)
    for s in (-1, 1): m.solid(prim_cylinder(hd + Vector((-0.05, s * 0.12, 0.15)), hd + Vector((-0.08, s * 0.16, 0.42)), 0.08, 0.01, 6), col)
    m.capsule((-0.65, 0, z + 0.05), (-1.1, 0, z + 0.25), 0.16, col); m.ball((-1.2, 0, z + 0.3), 0.15, white)  # brush tail
    m.ball((0.45, 0, z - 0.05), 0.2, white)  # chest
    return m

def rice(name='rice'):
    m = Model(name); rnd = random.Random(5)
    m.solid(prim_box((0, 0, 0.03), (1.6, 1.15, 0.06)), rgb('#8a7a52'))
    m.solid(prim_box((0, 0, 0.065), (1.45, 1.0, 0.02)), rgb('#7fc6c0'))  # flooded paddy
    for i in range(7):
        for j in range(5):
            x, y = -0.6 + i * 0.2, -0.4 + j * 0.2
            for k in range(4):
                a = k * 1.57 + rnd.uniform(-0.3, 0.3)
                m.solid(prim_cylinder((x, y, 0.07), (x + math.cos(a) * 0.06, y + math.sin(a) * 0.06, rnd.uniform(0.3, 0.4)), 0.02, 0.004, 4), rgb('#6fbf4a') if k % 2 else rgb('#4e9a34'))
    return m

def bush(name, leaf, leaf2, dots, n_dots=10, size=1.0, dot_r=0.06):
    m = Model(name); rnd = random.Random(len(name) * 13)
    for i in range(7):
        a = i * 0.9; d = 0.0 if i == 0 else 0.22
        m.ball((math.cos(a) * d * size, math.sin(a) * d * size, (0.3 + rnd.uniform(-0.05, 0.08)) * size), rnd.uniform(0.2, 0.26) * size, leaf if i % 2 else leaf2)
    for i in range(n_dots):
        th = rnd.uniform(0, 6.28); ph = rnd.uniform(0.2, 1.3)
        p = Vector((math.cos(th) * math.cos(ph) * 0.4, math.sin(th) * math.cos(ph) * 0.4, 0.32 + math.sin(ph) * 0.25)) * size
        m.solid(prim_sphere(p, dot_r * size, (1, 1, 1), 7), dots)
    return m

def small_tree(name, trunk, leaf, leaf2, dots=None, n_dots=8, extra=None):
    m = Model(name); rnd = random.Random(len(name) * 17)
    m.capsule((0, 0, 0.0), (0.03, 0.02, 0.55), 0.07, trunk)
    for i in range(6):
        a = i * 1.1; d = 0.0 if i == 0 else 0.2
        m.ball((math.cos(a) * d, math.sin(a) * d, 0.72 + rnd.uniform(-0.05, 0.1)), rnd.uniform(0.2, 0.26), leaf if i % 2 else leaf2)
    if dots:
        for i in range(n_dots):
            th = rnd.uniform(0, 6.28); p = Vector((math.cos(th) * 0.33, math.sin(th) * 0.33, 0.62 + rnd.uniform(0, 0.25)))
            m.solid(prim_sphere(p, 0.05, (1, 1, 1.3), 7), dots)
    if extra: extra(m)
    return m

def banana(name='banana'):
    m = Model(name); leaf = rgb('#5fae3a')
    m.capsule((0, 0, 0), (0, 0, 0.8), 0.08, rgb('#7a8a3a'))
    for k in range(6):
        a = k * 1.05; tip = Vector((math.cos(a) * 0.55, math.sin(a) * 0.55, 0.55))
        mid = Vector((math.cos(a) * 0.3, math.sin(a) * 0.3, 0.92))
        m.ball(mid, 0.22, leaf if k % 2 else rgb('#4e9a30'), scale=(1.7, 0.55, 0.22), rot=qz(math.degrees(a)) @ qy(20), kind='ELLIPSOID')  # drooping leaves
    for k in range(5): m.solid(prim_cylinder((0.1, 0, 0.55 - k * 0.05), (0.2, math.sin(k) * 0.05, 0.62 - k * 0.05), 0.035, 0.02, 6), rgb('#f2d23a'))
    return m

def vines(name='vines'):
    m = Model(name); rnd = random.Random(9)
    for row in (-0.25, 0.25):
        for x in (-0.6, 0.0, 0.6): m.solid(prim_cylinder((x, row, 0), (x, row, 0.5), 0.025, 0.025, 6), WOOD)
        for i in range(7):
            x = -0.6 + i * 0.2; m.ball((x, row, 0.42), 0.13, rgb('#4e8a34') if i % 2 else rgb('#6aa844'))
            if i % 2 == 0:
                for k in range(5): m.solid(prim_sphere((x + rnd.uniform(-0.05, 0.05), row - 0.1, 0.3 + rnd.uniform(-0.06, 0.04)), 0.035, (1, 1, 1), 6), rgb('#5a2a6a'))
    return m

def quarry(name='stone'):
    m = Model(name); rnd = random.Random(4)
    for i in range(6):
        a = i * 1.1; d = 0 if i == 0 else rnd.uniform(0.3, 0.45)
        w = rnd.uniform(0.22, 0.32)
        m.solid(prim_box((math.cos(a) * d, math.sin(a) * d, w * 0.4), (w * 1.3, w, w * 0.8), qz(rnd.uniform(0, 60))), rgb('#c2bbb0') if i % 2 else rgb('#a8a196'))
    m.solid(prim_box((0.05, 0.02, 0.38), (0.3, 0.22, 0.2), qz(20)), rgb('#d2cbc0'))
    return m

def salt(name='salt'):
    m = Model(name)
    for (x, y, r) in [(0, 0, 0.35), (0.42, 0.18, 0.24), (-0.35, 0.25, 0.22), (0.1, -0.38, 0.2)]:
        m.solid(prim_cylinder((x, y, 0), (x, y, r * 1.1), r, 0.02, 14), rgb('#f6f4ee'))
    m.solid(prim_box((0.3, -0.25, 0.08), (0.25, 0.18, 0.16)), WOOD)  # a crate
    return m

def oil(name='oil'):
    m = Model(name)
    m.ball((0, 0, 0.0), 0.45, rgb('#121016'), scale=(1.3, 1.0, 0.12), kind='ELLIPSOID')
    m.ball((0.15, 0.1, 0.03), 0.15, rgb('#3e3a5e'), scale=(1.4, 0.8, 0.15), kind='ELLIPSOID')  # a sheen
    for a in (0, 2.1, 4.2):  # a little wooden derrick
        m.solid(prim_cylinder((0.55 + math.cos(a) * 0.15, math.sin(a) * 0.15, 0), (0.55, 0, 0.75), 0.025, 0.02, 6), WOOD)
    m.solid(prim_box((0.55, 0, 0.78), (0.1, 0.1, 0.06)), WOOD)
    return m

def fish(name='fish'):
    m = Model(name); rnd = random.Random(2)
    for k in range(4):
        a = k * 1.6; p = Vector((math.cos(a) * 0.35, math.sin(a) * 0.3, 0.05 + (0.35 if k == 0 else 0)))
        q = qz(math.degrees(a) + 90) @ (qy(-35) if k == 0 else Quaternion())
        m.ball(p, 0.16, rgb('#4a86a8'), scale=(1.4, 0.45, 0.6), rot=q, kind='ELLIPSOID')
        tail = p + q @ Vector((-0.26, 0, 0)); m.solid(prim_cylinder(p + q @ Vector((-0.15, 0, 0)), tail, 0.01, 0.1, 4), rgb('#7ab4cc'))
    return m

def crab(name='crab'):
    m = Model(name); col = rgb('#d8542a')
    m.ball((0, 0, 0.15), 0.25, col, scale=(1.2, 1.0, 0.55), kind='ELLIPSOID')
    for s in (-1, 1):
        for k in range(3): m.capsule((s * 0.15, -0.1 + k * 0.12, 0.12), (s * 0.42, -0.15 + k * 0.15, 0.0), 0.035, col)
        m.capsule((s * 0.15, -0.2, 0.15), (s * 0.3, -0.4, 0.2), 0.05, col); m.ball((s * 0.32, -0.48, 0.22), 0.11, col, scale=(0.8, 1.2, 0.8), kind='ELLIPSOID')
    eyes(m, 0.08, 0.0, 0.3, 0.04)
    return m

def whale(name='whale'):
    m = Model(name); col, belly = rgb('#3a5068'), rgb('#9ab0c0')
    m.ball((0, 0, 0.0), 0.5, col, scale=(1.9, 0.75, 0.5), kind='ELLIPSOID')
    m.capsule((-0.8, 0, 0.05), (-1.25, 0, 0.35), 0.12, col)
    m.ball((-1.35, 0, 0.42), 0.18, col, scale=(0.4, 1.8, 0.25), kind='ELLIPSOID')  # tail flukes
    eyes(m, 0.62, 0.24, 0.1, 0.05)
    for k in range(4): m.solid(prim_sphere((0.45, 0, 0.5 + k * 0.12), 0.07 + k * 0.03, (1, 1, 1), 8), rgb('#e8f4fa'))  # spout
    return m

def pearl(name='pearl'):
    m = Model(name); shell = rgb('#d8ccc0')
    m.ball((0, 0, 0.05), 0.35, shell, scale=(1.0, 1.0, 0.25), kind='ELLIPSOID')
    m.ball((0, 0.22, 0.32), 0.33, rgb('#efe4ea'), scale=(1.0, 0.25, 0.9), rot=qx(-25), kind='ELLIPSOID')
    m.solid(prim_sphere((0, -0.02, 0.17), 0.12, (1, 1, 1), 12), rgb('#fbf8fc'))
    return m

# ---------------------------------------------------------------- trees (thousands stand on the map: a few hundred triangles each)
BARK = rgb('#7a4a2c')
def pine(name='tree_pine'):
    m = Model(name)
    m.solid(prim_cylinder((0, 0, 0), (0, 0, 0.5), 0.09, 0.06, 7), BARK)
    tiers = [(0.25, 0.62, 0.55, '#2c6e30'), (0.55, 0.5, 0.48, '#357a36'), (0.85, 0.38, 0.42, '#3f8a3c'), (1.12, 0.26, 0.36, '#4e9a44')]
    for z, r, h, c in tiers:  # stacked tiers, each with a slight skirt so they read as layered boughs
        m.solid(prim_cylinder((0, 0, z), (0, 0, z + h), r, 0.0, 9), rgb(c))
        m.solid(prim_cylinder((0, 0, z - 0.05), (0, 0, z + 0.02), r * 0.82, r, 9), rgb(c))
    return m

def round_tree(name='tree_round'):
    m = Model(name); rnd = random.Random(21); g1, g2 = rgb('#3e8a38'), rgb('#62a846')
    m.capsule((0, 0, 0), (0.02, 0, 0.55), 0.08, BARK); m.capsule((0.02, 0, 0.4), (0.2, 0.05, 0.62), 0.05, BARK)
    for k, (x, y, z, r) in enumerate([(0, 0, 0.82, 0.36), (0.24, 0.05, 0.7, 0.26), (-0.22, 0.08, 0.72, 0.26), (0.05, -0.2, 0.7, 0.25), (0.02, 0.22, 0.74, 0.24), (0.05, 0.0, 1.05, 0.24)]):
        m.ball((x, y, z), r, g2 if z > 0.9 or k % 2 else g1)
    return m

def palm(name='tree_palm'):
    m = Model(name); leaf, leaf2 = rgb('#4e9e36'), rgb('#6ab446')
    pts = [Vector((0.006 * k * k, 0, 0.13 * k)) for k in range(9)]  # a gently leaning trunk
    for k in range(8): m.capsule(pts[k], pts[k + 1], 0.065 - 0.003 * k, rgb('#8a6a40') if k % 2 else rgb('#a07a48'))
    top = pts[-1]
    for k in range(7):
        a = k * 2 * math.pi / 7; d = Vector((math.cos(a), math.sin(a), 0))
        m.ball(top + d * 0.32 + Vector((0, 0, 0.0)), 0.2, leaf if k % 2 else leaf2, scale=(1.9, 0.5, 0.18), rot=qz(math.degrees(a)) @ qy(22), kind='ELLIPSOID')
    for k in range(3): m.ball(top + Vector((math.cos(k * 2.1) * 0.08, math.sin(k * 2.1) * 0.08, -0.08)), 0.06, rgb('#6a4a2a'))
    return m

def shrub(name='tree_bush'):
    m = Model(name); g1, g2 = rgb('#3e8a38'), rgb('#62a846')
    for k, (x, y, z, r) in enumerate([(0, 0, 0.22, 0.24), (0.2, 0.05, 0.16, 0.18), (-0.18, 0.06, 0.16, 0.18), (0.02, -0.16, 0.15, 0.17), (0.0, 0.0, 0.36, 0.15)]):
        m.ball((x, y, z), r, g2 if k % 2 else g1)
    return m

def boulder(name='tree_rock'):
    m = Model(name); c = rgb('#8a8278')
    for k, (x, y, z, r) in enumerate([(0, 0, 0.16, 0.26), (0.2, 0.08, 0.1, 0.16), (-0.14, -0.1, 0.09, 0.14)]):
        m.ball((x, y, z), r, c if k else rgb('#9a9288'), scale=(1.1, 0.9, 0.8), rot=qz(k * 40), kind='ELLIPSOID')
    return m

# ---------------------------------------------------------------- chibi units (face -y, toward the game camera)
def chibi(name, headgear='hair', tunic=TEAM, z=0.0, sitting=False):
    m = Model(name)
    hz = z + 1.42
    nb, ns = len(m.balls), len(m.solids)
    m.ball((0, 0, hz), 0.5, SKIN)
    if headgear == 'hair':
        m.ball((0, 0.06, hz + 0.2), 0.5, HAIR, scale=(1.06, 1.02, 0.78), kind='ELLIPSOID')
        for s in (-1, 0, 1): m.ball((s * 0.2, -0.33, hz + 0.3 - abs(s) * 0.05), 0.15, HAIR)  # fringe
    elif headgear == 'helmet':
        m.ball((0, 0.06, hz + 0.2), 0.47, METAL, scale=(1.05, 1.02, 0.68), kind='ELLIPSOID')
        for k in range(4): m.ball((0, 0.18 - k * 0.14, hz + 0.52 - abs(k - 1.5) * 0.04), 0.11, TEAM)  # crest in the owner's colour
        m.solid(prim_cylinder((0, -0.5, hz + 0.25), (0, -0.53, hz - 0.02), 0.035, 0.03, 6), METAL)  # nose guard
    elif headgear == 'hood': m.ball((0, 0.12, hz + 0.08), 0.53, rgb('#3e6a3a'), scale=(1.05, 1.0, 0.95), kind='ELLIPSOID')
    eyes_c = Vector((0.17, -0.45, hz - 0.02))
    for s in (-1, 1):
        m.solid(prim_sphere(Vector((s * 0.17, -0.45, hz - 0.02)), 0.07, (0.85, 0.5, 1.3), 10), EYE)
        m.solid(prim_sphere(Vector((s * 0.15, -0.49, hz + 0.04)), 0.022, (1, 1, 1), 6), WHITE)
    m.ball((0, -0.5, hz - 0.12), 0.06, rgb('#e8a888'))  # nose
    look_up(m, nb, ns, Vector((0, 0, hz)), 24)  # the game camera looks down at 55°: tip the face up to meet it
    m.ball((0, 0, z + 0.78), 0.36, tunic, scale=(1.0, 0.85, 1.05), kind='ELLIPSOID')
    m.ball((0, 0, z + 0.6), 0.34, LEATHER, scale=(1.02, 0.9, 0.22), kind='ELLIPSOID')  # belt
    if sitting:
        for s in (-1, 1):
            m.capsule((s * 0.15, 0, z + 0.55), (s * 0.42, -0.1, z + 0.3), 0.12, PANTS)
            m.ball((s * 0.45, -0.18, z + 0.18), 0.14, BOOTS, scale=(1, 1.3, 0.8), kind='ELLIPSOID')
    else:
        for s in (-1, 1):
            m.capsule((s * 0.15, 0, z + 0.5), (s * 0.16, 0, z + 0.18), 0.12, PANTS)
            m.ball((s * 0.16, -0.05, z + 0.1), 0.14, BOOTS, scale=(1, 1.3, 0.8), kind='ELLIPSOID')
    return m, hz

def look_up(m, nb, ns, centre, deg):
    """tip the parts added since (nb, ns) back about the head centre, so the face turns up toward the camera"""
    q = qx(-deg); M = Matrix.Translation(centre) @ q.to_matrix().to_4x4() @ Matrix.Translation(-centre)
    for b in m.balls[nb:]:
        b['co'] = M @ b['co']; b['rot'] = q @ b['rot'] if b['rot'] is not None else (q if b['kind'] != 'BALL' else None)
    for o, c in m.solids[ns:]: o.matrix_world = M @ o.matrix_world

def arm(m, side, hand, z=0.0, sleeve=TEAM):
    sh = Vector((side * 0.33, 0, z + 0.95)); hand = Vector(hand)
    m.capsule(sh, sh.lerp(hand, 0.85), 0.1, sleeve); m.ball(hand, 0.11, SKIN)

def warrior():
    m, hz = chibi('warrior', 'hair')
    arm(m, 1, (0.5, -0.12, 0.55)); arm(m, -1, (-0.5, -0.05, 0.6))
    m.solid(prim_cylinder((0.5, -0.14, 0.45), (0.62, -0.3, 1.15), 0.045, 0.12, 10), WOOD)
    m.ball((0, 0.25, 0.85), 0.3, rgb('#8a6a4a'), scale=(1.2, 0.5, 1.1), kind='ELLIPSOID')  # fur cape
    return m

def spearman():
    m, hz = chibi('spearman', 'helmet')
    arm(m, 1, (0.5, -0.12, 0.6)); arm(m, -1, (-0.45, -0.25, 0.75))
    m.solid(prim_cylinder((0.52, -0.14, 0.05), (0.56, -0.16, 2.1), 0.035, 0.035, 8), WOOD)
    m.solid(prim_cylinder((0.56, -0.16, 2.1), (0.57, -0.165, 2.38), 0.07, 0.0, 8), METAL)
    m.solid(prim_cylinder((-0.5, -0.3, 0.75), (-0.5, -0.42, 0.75), 0.4, 0.4, 20), METAL)   # shield rim
    m.solid(prim_cylinder((-0.5, -0.33, 0.75), (-0.5, -0.45, 0.75), 0.35, 0.35, 20), TEAM)  # shield face, owner's colour
    m.solid(prim_sphere(Vector((-0.5, -0.47, 0.75)), 0.08, (1, 0.6, 1), 10), METAL)
    return m

def archer():
    m, hz = chibi('archer', 'hood')
    arm(m, -1, (-0.55, -0.3, 0.85)); arm(m, 1, (0.35, -0.2, 0.85))
    m.solid(prim_arc(Vector((-0.6, -0.32, 0.85)), 0.55, 0.035, math.radians(-70), math.radians(70), qz(90) @ qy(0)), WOOD)
    m.solid(prim_cylinder((-0.6 + 0.19, -0.32, 0.85 - 0.52), (-0.6 + 0.19, -0.32, 0.85 + 0.52), 0.008, 0.008, 4), rgb('#e8e0d0'))
    m.solid(prim_cylinder((0.15, 0.3, 0.55), (0.3, 0.38, 1.25), 0.11, 0.12, 10), LEATHER)  # quiver
    for i in range(3): m.solid(prim_cylinder((0.2 + i * 0.04, 0.34, 1.2), (0.22 + i * 0.05, 0.36, 1.45), 0.012, 0.012, 4), rgb('#e8dcc0'))
    return m

def turn(m, q, offset=(0, 0, 0), scale=1.0):
    """rotate (and scale) a model's parts about the origin, then move them"""
    off = Vector(offset)
    for b in m.balls:
        b['co'] = q @ b['co'] * scale + off; b['r'] *= scale
        if 'half' in b: b['half'] *= scale
        b['rot'] = q @ b['rot'] if b['rot'] is not None else (q if b['kind'] != 'BALL' else None)
    M = Matrix.Translation(off) @ q.to_matrix().to_4x4() @ Matrix.Scale(scale, 4)
    for o, c in m.solids: o.matrix_world = M @ o.matrix_world
    return m

def horseman():
    m = horse(name='horseman')
    r, hz = chibi('rider', 'helmet', z=0.0, sitting=True)
    arm(r, 1, (0.45, -0.3, 0.75)); arm(r, -1, (-0.4, -0.3, 0.85))
    r.solid(prim_cylinder((0.47, -0.32, 0.15), (0.5, -0.36, 2.0), 0.035, 0.035, 8), WOOD)
    r.solid(prim_cylinder((0.5, -0.36, 2.0), (0.5, -0.36, 2.25), 0.07, 0.0, 8), METAL)
    turn(r, qz(90), (0.0, 0, 1.38), 0.72)  # face along the horse, seated on its back, legs down its flanks, rider to horse scale
    m.balls += r.balls; m.solids += r.solids
    m.ball((-0.05, 0, 1.6), 0.45, TEAM, scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')  # saddle cloth in the owner's colour
    return m

# triangle caps for the whole model (body, eyes and props): many instances of these stand on the map
CAPS = {'tree_pine': 220, 'tree_round': 300, 'tree_palm': 300, 'tree_bush': 150, 'tree_rock': 80, 'whale': 900, 'fish': 400, 'crab': 600, 'pearl': 500, 'wheat': 2000, 'vines': 1800, 'cotton': 900, 'spices': 900, 'dyes': 900,
        'silk': 900, 'incense': 900, 'rubber': 900, 'banana': 900, 'rice': 1400, 'unit_warrior': 3500, 'unit_spearman': 3500, 'unit_archer': 3500, 'unit_horseman': 4200}
FACETED = {'tree_rock', 'iron', 'gems', 'gems2', 'copper', 'coal', 'niter', 'aluminum', 'uranium'}  # rocks: few large flat faces, like cut stone
G, G2 = rgb('#3e7a32'), rgb('#5e9e44')
# name: (builder, size in game units (largest dimension), metaball resolution, triangle budget)
MODELS = {
    'horse': (lambda: horse(), 0.2, 0.025, 1400), 'horse2': (lambda: horse(rgb('#ece6da'), rgb('#cfc6b4'), 'horse2', True), 0.2, 0.025, 1400),
    'cattle': (lambda: cow(), 0.2, 0.025, 1400), 'cattle2': (lambda: cow(rgb('#8a4a28'), None, 'cattle2', True), 0.2, 0.025, 1400),
    'sheep': (lambda: sheep(), 0.14, 0.025, 1200), 'deer': (deer, 0.18, 0.025, 1200), 'elephant': (elephant, 0.3, 0.03, 1400), 'fox': (fox, 0.13, 0.025, 1000),
    'wheat': (lambda: wheat(), 0.36, 0.03, 1000), 'rice': (rice, 0.36, 0.03, 1000), 'banana': (banana, 0.24, 0.03, 900), 'vines': (vines, 0.3, 0.03, 1000),
    'cotton': (lambda: bush('cotton', G, G2, rgb('#ffffff')), 0.17, 0.03, 700), 'spices': (lambda: bush('spices', G, G2, rgb('#d8301a'), dot_r=0.05), 0.17, 0.03, 700),
    'dyes': (lambda: bush('dyes', G, G2, rgb('#7a3ac8')), 0.17, 0.03, 700),
    'silk': (lambda: small_tree('silk', WOOD, G, G2, rgb('#f6f2e2')), 0.22, 0.03, 800),
    'incense': (lambda: small_tree('incense', rgb('#9a7a5a'), rgb('#8a9a5a'), rgb('#b0bc7a'), rgb('#e8d8a8'), 5), 0.22, 0.03, 800),
    'rubber': (lambda: small_tree('rubber', rgb('#7a6a5a'), rgb('#2a6a2e'), rgb('#3e8a3e'), None, 0,
        lambda m: m.solid(prim_cylinder((0.07, -0.05, 0.15), (0.07, -0.05, 0.25), 0.05, 0.06, 8), METAL)), 0.22, 0.03, 800),
    'iron': (lambda: ore(rgb('#b8532c'), 'iron'), 0.22, 0.03, 260), 'copper': (lambda: ore(rgb('#3aa88a'), 'copper'), 0.22, 0.03, 260),
    'coal': (lambda: ore(rgb('#1e1e22'), 'coal'), 0.22, 0.03, 260), 'niter': (lambda: ore(rgb('#f2eee2'), 'niter'), 0.22, 0.03, 260),
    'aluminum': (lambda: ore(rgb('#d8dce4'), 'aluminum'), 0.22, 0.03, 260), 'uranium': (lambda: ore(rgb('#7af04a'), 'uranium', True), 0.22, 0.03, 300),
    'gems': (lambda: ore(rgb('#d83a9a'), 'gems', True), 0.22, 0.03, 300), 'gems2': (lambda: ore(rgb('#3a8ae8'), 'gems2', True), 0.22, 0.03, 300),
    'stone': (quarry, 0.22, 0.03, 400), 'salt': (salt, 0.2, 0.03, 500), 'oil': (oil, 0.26, 0.03, 500),
    'fish': (fish, 0.18, 0.025, 600), 'crab': (crab, 0.1, 0.02, 700), 'whale': (whale, 0.36, 0.03, 900), 'pearl': (pearl, 0.1, 0.02, 600),
    'unit_warrior': (warrior, 0.62, 0.02, 2500), 'unit_spearman': (spearman, 0.62, 0.02, 2500), 'unit_archer': (archer, 0.62, 0.02, 2500),
    'unit_horseman': (horseman, 0.7, 0.025, 2800),
    'tree_pine': (pine, 0.62, 0.03, 200), 'tree_round': (round_tree, 0.7, 0.04, 220), 'tree_palm': (palm, 0.6, 0.035, 220),
    'tree_bush': (shrub, 0.42, 0.035, 120), 'tree_rock': (boulder, 0.25, 0.04, 60),
}

# ---------------------------------------------------------------- preview render
def preview(objs, path):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.render.resolution_x, sc.render.resolution_y = 1800, 900
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    mat = bpy.data.materials.new('vc'); mat.use_nodes = True; nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']; att = nt.nodes.new('ShaderNodeVertexColor'); att.layer_name = 'Col'
    mixn = nt.nodes.new('ShaderNodeMix'); mixn.data_type = 'RGBA'
    nt.links.new(att.outputs['Alpha'], mixn.inputs['Factor'])
    team = nt.nodes.new('ShaderNodeMix'); team.data_type = 'RGBA'; team.blend_type = 'MULTIPLY'; team.inputs['Factor'].default_value = 1.0
    team.inputs['A'].default_value = (0.85, 0.15, 0.15, 1); nt.links.new(att.outputs['Color'], team.inputs['B'])  # team colour shown as red
    nt.links.new(team.outputs['Result'], mixn.inputs['A'])
    nt.links.new(att.outputs['Color'], mixn.inputs['B']); nt.links.new(mixn.outputs['Result'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.85
    x, row, rows, per = 0.0, 0, [], (len(objs) + 1) // 2
    for i, o in enumerate(objs):
        o.data.materials.append(mat)
        if i == per: rows.append(x); x = 0.0; row = 1
        xs = [v.co.x for v in o.data.vertices]; w = max(xs) - min(xs)
        o.location.x = x - min(xs); o.location.y = -row * 3.0; x += w + 0.6
    rows.append(x); x = max(rows)
    gm = bpy.data.meshes.new('ground'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60); bm.to_mesh(gm); bm.free()
    g = new_obj(gm, 'ground'); gmat = bpy.data.materials.new('g'); gmat.use_nodes = True
    gmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.35, 0.6, 0.25, 1); g.data.materials.append(gmat)
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 2.6; sun.angle = math.radians(8)
    so = new_obj(sun, 'sun'); so.rotation_euler = (math.radians(45), math.radians(15), math.radians(-35))
    w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.7, 0.9, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9; sc.world = w
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = x + 0.8; co = new_obj(cam, 'cam'); sc.camera = co
    cx = x / 2 - 0.3; dist = 30
    co.location = (cx, -1.2 - dist * math.cos(math.radians(55)), 0.9 + dist * math.sin(math.radians(55)))
    co.rotation_euler = (math.radians(35), 0, 0)
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    out = argv[argv.index('--out') + 1] if '--out' in argv else 'godot/models'
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else list(MODELS)
    prev = argv[argv.index('--preview') + 1] if '--preview' in argv else None
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(out, exist_ok=True); objs = []
    for name in only:
        fn, size, res, tris = MODELS[name]
        o = build(fn(), res=res, target_tris=tris, smooth=name not in FACETED, cap=CAPS.get(name, 1800)); n = export(o, os.path.join(out, name + '.json'), size)
        print('model %-16s %5d triangles' % (name, n)); objs.append(o)
    if prev: preview(objs, os.path.abspath(prev))
