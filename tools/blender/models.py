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

def build(m, res=0.025, target_tris=2500, smooth=True):
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
        attr.data[li].color = (c[0] * k, c[1] * k, c[2] * k, c[3])

def export(obj, path, size):
    """triangles in game units (y up, scaled so the model's height or length is `size`), as the game's batch JSON"""
    me = obj.data; bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces)
    tmp = bpy.data.meshes.new('tri'); bm.to_mesh(tmp); bm.free()
    xs = [v.co for v in tmp.vertices]; lo = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs)))
    hi = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
    k = size / max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z); cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
    attr = tmp.color_attributes['Col']; P, N, C = [], [], []
    for poly in tmp.polygons:
        for li in poly.loop_indices:
            v = tmp.vertices[tmp.loops[li].vertex_index]; n = v.normal if poly.use_smooth else poly.normal
            P += [round((v.co.x - cx) * k, 4), round((v.co.z - lo.z) * k, 4), round(-(v.co.y - cy) * k, 4)]
            N += [round(n.x, 3), round(n.z, 3), round(-n.y, 3)]
            c = attr.data[li].color; C += [round(c[0], 3), round(c[1], 3), round(c[2], 3), round(c[3], 2)]
    bpy.data.meshes.remove(tmp)
    with open(path, 'w') as f: json.dump({'p': P, 'n': N, 'c': C}, f, separators=(',', ':'))
    return len(P) // 9

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
    for i in range(8):
        for j in range(6):
            cx, cy = -0.7 + i * 0.2 + rnd.uniform(-0.03, 0.03), -0.5 + j * 0.2 + rnd.uniform(-0.03, 0.03)
            for k in range(3):
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
        m.ball((0, 0.05, hz + 0.17), 0.49, METAL, scale=(1.08, 1.05, 0.78), kind='ELLIPSOID')
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

def turn(m, q, offset=(0, 0, 0)):
    """rotate a model's parts about the origin, then move them"""
    off = Vector(offset)
    for b in m.balls:
        b['co'] = q @ b['co'] + off
        b['rot'] = q @ b['rot'] if b['rot'] is not None else (q if b['kind'] != 'BALL' else None)
    M = Matrix.Translation(off) @ q.to_matrix().to_4x4()
    for o, c in m.solids: o.matrix_world = M @ o.matrix_world
    return m

def horseman():
    m = horse(name='horseman')
    r, hz = chibi('rider', 'helmet', z=0.0, sitting=True)
    arm(r, 1, (0.45, -0.3, 0.75)); arm(r, -1, (-0.4, -0.3, 0.85))
    r.solid(prim_cylinder((0.47, -0.32, 0.15), (0.5, -0.36, 2.0), 0.035, 0.035, 8), WOOD)
    r.solid(prim_cylinder((0.5, -0.36, 2.0), (0.5, -0.36, 2.25), 0.07, 0.0, 8), METAL)
    turn(r, qz(90), (0.05, 0, 1.25))  # face along the horse, seated on its back, legs down its flanks
    m.balls += r.balls; m.solids += r.solids
    m.ball((-0.05, 0, 1.62), 0.45, TEAM, scale=(1.2, 1.15, 0.22), kind='ELLIPSOID')  # saddle cloth in the owner's colour
    return m

FACETED = {'iron', 'gems'}  # rocks: few large flat faces, like cut stone
MODELS = {
    'horse': (lambda: horse(), 0.24, 0.02), 'horse2': (lambda: horse(rgb('#ece6da'), rgb('#cfc6b4'), 'horse2', True), 0.24, 0.02),
    'cattle': (lambda: cow(), 0.24, 0.02), 'cattle2': (lambda: cow(rgb('#8a4a28'), None, 'cattle2', True), 0.24, 0.02),
    'sheep': (lambda: sheep(), 0.18, 0.02), 'wheat': (lambda: wheat(), 0.36, 0.02),
    'iron': (lambda: ore(rgb('#b8532c'), 'iron'), 0.22, 0.03), 'gems': (lambda: ore(rgb('#d83a9a'), 'gems', True), 0.22, 0.03),
    'unit_warrior': (warrior, 0.62, 0.02), 'unit_spearman': (spearman, 0.62, 0.02), 'unit_archer': (archer, 0.62, 0.02),
    'unit_horseman': (horseman, 0.7, 0.025),
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
    mixn.inputs['A'].default_value = (0.85, 0.15, 0.15, 1)  # team colour shown as red
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
        fn, size, res = MODELS[name]
        o = build(fn(), res=res, target_tris=260 if name in FACETED else 2500, smooth=name not in FACETED); n = export(o, os.path.join(out, name + '.json'), size)
        print('model %-16s %5d triangles' % (name, n)); objs.append(o)
    if prev: preview(objs, os.path.abspath(prev))
