# Tiny Empires settlement models, built in Blender from code: per-culture houses, the central landmark of each city size
# and the ramparts. Hard-surface parts (bevelled blocks, roofs, domes and spires turned on a lathe), with ambient
# occlusion baked into the vertex colours like the other models (tools/blender/models.py).
# Colours: the walls, roofs and trim follow the culture's palette (AU.PALACE_STYLES) in the game, so those parts carry a
# role in the vertex alpha instead of a colour (0.2 wall, 0.4 roof, 0.6 trim, 0 owner's colour; rgb holds the shading)
# and godot/city.js paints them. Doors, windows, timber, thatch and stone keep their own colours (alpha 1).
# Modelled in game units: x right, -y toward the camera (game +z), z up; ground at z = 0 (bases sink below it for slopes).
#
# Usage: python tools/blender/buildings.py [--out godot/models] [--preview previews.png] [--only house_european_0,...]
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import models as M
from models import rgb, Model, new_obj, bake_ao, colour_mesh

WALL, ROOF, TRIM, OWNER = (0.9, 0.86, 0.78, 0.2), (0.7, 0.3, 0.22, 0.4), (0.85, 0.75, 0.45, 0.6), (0.85, 0.2, 0.2, 0.0)
DOOR, WIN, WOOD, DARKWOOD = rgb('#4a3424'), rgb('#2c3440'), rgb('#86603a'), rgb('#4e3420')
STONE, PALE, THATCH, GOLD, BARK = rgb('#a9a397'), rgb('#e9e2d2'), rgb('#bc9a5c'), rgb('#e8b84a'), rgb('#6e5236')
SINK = 0.06  # how far walls reach below the ground

# ---------------------------------------------------------------- solids
def mesh_obj(bm, smooth=False):
    me = bpy.data.meshes.new('part'); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    return new_obj(me)

def block(c, s, bevel=0.006, z_rot=0.0):
    """a box of size s whose bottom centre is at c, edges chamfered so they catch the light"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * s[0], v.co.y * s[1], (v.co.z + 0.5) * s[2]))
    if bevel > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(s) * 0.3), segments=1, affect='EDGES', clamp_overlap=True)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ Matrix.Rotation(z_rot, 4, 'Z'), verts=bm.verts)
    return mesh_obj(bm)

def loft(rings, cap0=True, cap1=True, smooth=False):
    """a closed solid through rings of points (same count each); rings shrinking to a point close into a tip"""
    bm = bmesh.new(); R = [[bm.verts.new(p) for p in ring] for ring in rings]; n = len(rings[0])
    for a, b in zip(R, R[1:]):
        for k in range(n):
            try: bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
            except ValueError: pass
    if cap0: bm.faces.new(list(reversed(R[0])))
    if cap1: bm.faces.new(R[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(bm, smooth)

def lathe(c, prof, seg=12, smooth=True, rot=0.0):
    """surface of revolution about the vertical through c: prof = [(radius, height), ...] from the bottom up"""
    rings = [[Vector((c[0] + r * math.cos(rot + 2 * math.pi * k / seg), c[1] + r * math.sin(rot + 2 * math.pi * k / seg), c[2] + h)) for k in range(seg)] for r, h in prof]
    return loft(rings, prof[0][0] > 0, prof[-1][0] > 0, smooth)

def cyl(a, b, r0, r1=None, seg=8): return M.prim_cylinder(a, b, r0, r1, seg)

def rect(cx, cy, z, hx, hy): return [Vector((cx - hx, cy - hy, z)), Vector((cx + hx, cy - hy, z)), Vector((cx + hx, cy + hy, z)), Vector((cx - hx, cy + hy, z))]

def gable_roof(m, c, w, d, h, col, end=WALL, o=0.025, t=0.014, along_y=False):
    """two roof slabs meeting at a ridge along x (or y), gable ends filled with `end`"""
    cx, cy, z = c
    if along_y:  # ridge along y: swap the roles of the axes
        hw, hd = d / 2, w / 2
        P = lambda u, v, zz: Vector((cx + v, cy + u, zz))
    else:
        hw, hd = w / 2, d / 2
        P = lambda u, v, zz: Vector((cx + u, cy + v, zz))
    for sgn in (-1, 1):
        ring0 = [P(-hw - o, sgn * (hd + o), z - t), P(hw + o, sgn * (hd + o), z - t), P(hw + o, 0, z + h - t), P(-hw - o, 0, z + h - t)]
        ring1 = [P(-hw - o, sgn * (hd + o), z), P(hw + o, sgn * (hd + o), z), P(hw + o, 0, z + h + 0.004), P(-hw - o, 0, z + h + 0.004)]
        m.solid(loft([ring0, ring1]), col)
    for su in (-1, 1):  # gable triangles
        u = su * (hw - 0.002)
        m.solid(loft([[P(u - 0.004, -hd, z - 0.01), P(u - 0.004, hd, z - 0.01), P(u - 0.004, 0, z + h * hd / (hd + o))],
                      [P(u + 0.004, -hd, z - 0.01), P(u + 0.004, hd, z - 0.01), P(u + 0.004, 0, z + h * hd / (hd + o))]]), end)

def hip_roof(m, c, w, d, h, col, o=0.025, t=0.014, smooth=False):
    cx, cy, z = c; hx, hy = w / 2 + o, d / 2 + o; r = max(0.0, (w - d) / 2)
    ridge = [Vector((cx - r, cy, z + h)), Vector((cx + r, cy, z + h)), Vector((cx + r, cy, z + h)), Vector((cx - r, cy, z + h))]
    m.solid(loft([rect(cx, cy, z - t, hx, hy), rect(cx, cy, z, hx, hy), ridge], smooth=smooth), col)

def curved_roof(m, c, w, d, h, col, lift=0.035, o=0.04, sub=4, top=0.3):
    """an East Asian roof: concave slopes and upturned corners"""
    cx, cy, z = c; rings = []
    for f, zz, li in ((0.0, -0.012, 1.0), (0.0, 0.0, 1.0), (0.28, 0.35, 0.35), (0.55, 0.75, 0.0), (1 - top, 1.0, 0.0)):
        hx, hy = (w / 2 + o) * (1 - f) + (w / 2) * top * f * 0, (d / 2 + o) * (1 - f)
        hx = (w / 2 + o) - ((w / 2 + o) - (w / 2) * top) * f; hy = (d / 2 + o) - ((d / 2 + o) - 0.004) * f
        ring = []
        for e in range(4):
            for s in range(sub):
                t = s / sub; corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]; a, b = corners[e], corners[(e + 1) % 4]
                px, py = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                k = (2 * t - 1) ** 2  # 1 at the corners, 0 mid-edge
                ring.append(Vector((cx + px * hx, cy + py * hy, z + zz * h + li * lift * k)))
        rings.append(ring)
    m.solid(loft(rings, smooth=True), col)
    m.solid(block((cx, cy, z + h - 0.004), (w * top * 2 + 0.03, 0.022, 0.022), 0.004), col)  # ridge

def door(m, x, y, z, w, h, arch=False, col=DOOR):
    m.solid(block((x, y - 0.004, z - 0.01), (w, 0.012, h + 0.01), 0.002), col)
    if arch: m.solid(cyl((x, y - 0.01, z + h), (x, y + 0.002, z + h), w / 2, w / 2, 10), col)

def window(m, x, y, z, w, h, frame=None, shutters=None):
    if frame: m.solid(block((x, y - 0.002, z - 0.006), (w + 0.014, 0.01, h + 0.012), 0.002), frame)
    m.solid(block((x, y - 0.006, z), (w, 0.01, h), 0.0), WIN)
    if shutters: [m.solid(block((x + sd * (w / 2 + 0.008), y - 0.007, z), (0.014, 0.01, h), 0.0), shutters) for sd in (-1, 1)]

def walls(m, w, d, h, col=WALL, cx=0.0, cy=0.0, z=0.0, bevel=0.008):
    m.solid(block((cx, cy, z - SINK), (w, d, h + SINK), bevel), col)

def dome(m, c, r, h, col, seg=14, onion=False, pointed=False, finial=GOLD):
    if onion: prof = [(r * 0.8, 0), (r * 1.08, h * 0.22), (r * 1.04, h * 0.42), (r * 0.72, h * 0.64), (r * 0.3, h * 0.82), (r * 0.06, h * 0.94), (0, h)]
    elif pointed: prof = [(r, 0), (r * 0.98, h * 0.3), (r * 0.86, h * 0.58), (r * 0.6, h * 0.8), (r * 0.26, h * 0.94), (0, h)]
    else: prof = [(r, 0), (r * 0.97, h * 0.3), (r * 0.87, h * 0.58), (r * 0.66, h * 0.82), (r * 0.36, h * 0.96), (0, h)]
    m.solid(lathe(c, prof, seg), col)
    if finial: m.solid(lathe((c[0], c[1], c[2] + h - 0.005), [(0.006, 0), (0.006, 0.02), (0.012, 0.03), (0, 0.05)], 6), finial)

def cone(m, c, r, h, col, seg=12, bulge=0.0, smooth=True):
    prof = [(r, 0)] + [(r * (1 - f) * (1 + bulge * math.sin(math.pi * f)), h * f) for f in (0.25, 0.5, 0.75)] + [(0, h)]
    m.solid(lathe(c, prof, seg, smooth), col)

def flagpole(m, x, y, z, h=0.12):
    m.solid(cyl((x, y, z), (x, y, z + h), 0.004, 0.004, 5), DARKWOOD)
    m.solid(block((x + 0.028, y, z + h - 0.042), (0.05, 0.004, 0.032), 0.0), OWNER)

def columns(m, x0, x1, y, z, h, n, r=0.01, col=PALE):
    for i in range(n):
        x = x0 + (x1 - x0) * i / max(1, n - 1)
        m.solid(cyl((x, y, z), (x, y, z + h), r, r * 0.9, 8), col)

# ---------------------------------------------------------------- houses (about 0.17 wide; city.js scales them per spot)
def house_mediterranean(v):
    m = Model('h'); w, d, h = (0.17, 0.14, 0.15) if v != 1 else (0.15, 0.14, 0.24)
    walls(m, w, d, h)
    hip_roof(m, (0, 0, h), w, d, 0.06, ROOF) if v == 1 else gable_roof(m, (0, 0, h), w, d, 0.055 if v else 0.07, ROOF, along_y=(v == 0))
    door(m, -0.03 if v != 1 else 0, -d / 2, 0, 0.034, 0.055, arch=True)
    window(m, 0.045, -d / 2, 0.07, 0.024, 0.032, shutters=TRIM)
    if v == 1: [window(m, sx * 0.04, -d / 2, 0.15, 0.024, 0.03, shutters=TRIM) for sx in (-1, 1)]; m.solid(block((0, -d / 2 - 0.02, 0.12), (0.09, 0.04, 0.01), 0.002), TRIM)  # balcony
    if v == 2:  # a vine pergola beside the door
        for sx in (-0.07, 0.01): m.solid(cyl((sx, -d / 2 - 0.05, 0), (sx, -d / 2 - 0.05, 0.1), 0.006, 0.006, 6), WOOD)
        m.solid(block((-0.03, -d / 2 - 0.03, 0.1), (0.1, 0.06, 0.008), 0.002), rgb('#5e9440'))
    return m

def house_european(v):
    m = Model('h'); w, d, h = (0.15, 0.14, 0.16) if v != 2 else (0.13, 0.13, 0.24)
    walls(m, w, d, h, PALE if v != 1 else WALL)
    if v != 1:  # half-timbering on the front
        for x in (-w / 2 + 0.008, 0.0, w / 2 - 0.008): m.solid(block((x, -d / 2 - 0.003, 0), (0.01, 0.008, h), 0.0), DARKWOOD)
        m.solid(block((0, -d / 2 - 0.003, h * 0.5), (w, 0.008, 0.01), 0.0), DARKWOOD)
        m.solid(block((0, -d / 2 - 0.003, h - 0.01), (w, 0.008, 0.01), 0.0), DARKWOOD)
    gable_roof(m, (0, 0, h), w, d, 0.11, ROOF, PALE if v != 1 else WALL, along_y=(v != 1))
    door(m, -0.035, -d / 2, 0, 0.03, 0.06)
    window(m, 0.035, -d / 2, 0.035, 0.026, 0.03, frame=PALE if v == 1 else None)
    window(m, 0.035 if v != 2 else -0.035, -d / 2, h * 0.62, 0.026, 0.03)
    m.solid(block((w * 0.28, d * 0.15, h + 0.03), (0.024, 0.024, 0.1), 0.003), STONE)  # chimney
    return m

def house_new_world(v):
    m = Model('h'); w, d, h = (0.17, 0.14, 0.15) if v == 0 else (0.16, 0.14, 0.23) if v == 1 else (0.15, 0.15, 0.17)
    walls(m, w, d, h)
    m.solid(block((0, 0, h - 0.012), (w + 0.008, d + 0.008, 0.014), 0.002), TRIM)  # cornice
    gable_roof(m, (0, 0, h), w, d, 0.07 if v != 2 else 0.1, ROOF if v != 2 else STONE, TRIM if v == 2 else WALL, along_y=(v == 2))
    door(m, 0, -d / 2, 0, 0.032, 0.06); m.solid(block((0, -d / 2 - 0.003, 0.06), (0.044, 0.008, 0.01), 0.0), TRIM)
    for sx in (-1, 1):
        window(m, sx * 0.05, -d / 2, 0.045, 0.024, 0.036, frame=TRIM)
        if v == 1: window(m, sx * 0.05, -d / 2, 0.15, 0.024, 0.036, frame=TRIM)
    for sx in (-1, 1): m.solid(block((sx * w * 0.32, 0.02, h), (0.024, 0.03, 0.09), 0.003), WALL)  # end chimneys
    if v == 2:  # porch
        m.solid(block((0, -d / 2 - 0.03, 0), (w, 0.06, 0.012), 0.002), WOOD)
        columns(m, -w / 2 + 0.01, w / 2 - 0.01, -d / 2 - 0.05, 0.012, 0.09, 4, 0.006, TRIM)
        m.solid(block((0, -d / 2 - 0.03, 0.1), (w + 0.01, 0.07, 0.01), 0.002), ROOF)
    return m

def house_east_asian(v):
    m = Model('h'); w, d, h = (0.17, 0.13, 0.11) if v != 1 else (0.14, 0.12, 0.2)
    m.solid(block((0, 0, -SINK), (w + 0.02, d + 0.02, SINK + 0.02), 0.004), STONE)  # stone base
    walls(m, w, d, h, WALL, z=0.02)
    for x in (-w / 2, -w / 6, w / 6, w / 2): m.solid(block((x, -d / 2 - 0.003, 0.02), (0.012, 0.012, h), 0.0), DARKWOOD)
    for x in (-w / 3, w / 3): m.solid(block((x, -d / 2 - 0.004, 0.06), (0.04, 0.008, 0.05), 0.0), rgb('#efe6cc'))  # paper screens
    door(m, 0, -d / 2, 0.02, 0.035, 0.07, col=DARKWOOD)
    if v == 1:
        curved_roof(m, (0, 0, 0.02 + h * 0.55), w + 0.02, d + 0.02, 0.03, ROOF, 0.02, 0.03, top=0.85)
    curved_roof(m, (0, 0, 0.02 + h), w, d, 0.075 if v != 2 else 0.06, ROOF)
    return m

def house_southeast_asian(v):
    m = Model('h'); w, d, lift, h = 0.16, 0.13, 0.06 if v != 2 else 0.0, 0.1
    for sx in (-1, 1):
        for sy in (-1, 1): m.solid(cyl((sx * (w / 2 - 0.01), sy * (d / 2 - 0.01), -SINK), (sx * (w / 2 - 0.01), sy * (d / 2 - 0.01), lift + 0.01), 0.008, 0.008, 6), DARKWOOD)
    m.solid(block((0, 0, lift), (w + 0.02, d + 0.03, 0.012), 0.002), WOOD)  # platform
    walls(m, w * 0.9, d * 0.85, h, WALL, z=lift + 0.012)
    door(m, 0, -d * 0.425, lift + 0.012, 0.03, 0.06, col=DARKWOOD)
    window(m, 0.045, -d * 0.425, lift + 0.05, 0.02, 0.025)
    if lift: m.solid(loft([[Vector((-0.016, -d / 2 - 0.06, -0.01)), Vector((0.016, -d / 2 - 0.06, -0.01)), Vector((0.016, -d / 2, lift)), Vector((-0.016, -d / 2, lift))],
                          [Vector((-0.016, -d / 2 - 0.06, 0.0)), Vector((0.016, -d / 2 - 0.06, 0.0)), Vector((0.016, -d / 2, lift + 0.012)), Vector((-0.016, -d / 2, lift + 0.012))]]), WOOD)  # ladder steps
    top = lift + 0.012 + h
    if v == 1: gable_roof(m, (0, 0, top), w * 0.9, d * 0.85, 0.13, rgb('#8a5a34'), rgb('#8a5a34'), o=0.035, along_y=True)
    else: hip_roof(m, (0, 0, top), w * 0.9, d * 0.85, 0.11, THATCH if v == 2 else rgb('#9a6238'), o=0.035)
    return m

def house_south_asian(v):
    m = Model('h'); w, d, h = (0.16, 0.14, 0.16) if v != 1 else (0.14, 0.14, 0.24)
    walls(m, w, d, h)
    m.solid(block((0, 0, h), (w + 0.012, d + 0.012, 0.022), 0.003), TRIM)  # parapet
    m.solid(block((0, 0, h), (w - 0.02, d - 0.02, 0.012), 0.0), STONE)
    door(m, -0.035, -d / 2, 0, 0.034, 0.065, arch=True, col=DARKWOOD)
    window(m, 0.04, -d / 2, 0.06, 0.026, 0.04, frame=TRIM)
    if v == 1:  # jharokha balcony window
        m.solid(block((0, -d / 2 - 0.018, 0.15), (0.06, 0.036, 0.05), 0.004), TRIM)
        dome(m, (0, -d / 2 - 0.018, 0.2), 0.03, 0.03, TRIM, 10, finial=None)
    if v == 2:  # chhatri kiosk on the roof
        for sx in (-1, 1):
            for sy in (-1, 1): m.solid(cyl((0.03 + sx * 0.02, 0.02 + sy * 0.02, h), (0.03 + sx * 0.02, 0.02 + sy * 0.02, h + 0.045), 0.004, 0.004, 5), WALL)
        m.solid(block((0.03, 0.02, h + 0.045), (0.056, 0.056, 0.008), 0.002), WALL)
        dome(m, (0.03, 0.02, h + 0.053), 0.026, 0.035, WALL, 10)
    return m

def house_middle_eastern(v):
    m = Model('h'); w, d, h = (0.16, 0.14, 0.15) if v != 1 else (0.13, 0.13, 0.2)
    walls(m, w, d, h)
    m.solid(block((0, 0, h), (w + 0.006, d + 0.006, 0.014), 0.003), WALL)
    door(m, 0.03, -d / 2, 0, 0.032, 0.06, arch=True, col=DARKWOOD)
    m.solid(block((0.03, -d / 2 - 0.004, 0.062), (0.05, 0.006, 0.03), 0.0), ROOF)  # glazed tiles over the door
    window(m, -0.04, -d / 2, 0.08, 0.02, 0.03)
    if v == 1: dome(m, (0, 0.0, h + 0.012), 0.045, 0.06, ROOF, 12, pointed=True)
    if v == 2:  # wind tower
        m.solid(block((-0.04, 0.03, h), (0.04, 0.04, 0.09), 0.004), WALL)
        for sx in (-1, 1): m.solid(block((-0.04 + sx * 0.008, 0.009, h + 0.05), (0.008, 0.004, 0.03), 0.0), WIN)
    return m

def house_african(v):
    m = Model('h')
    if v == 2:  # Sahelian mud-brick house: flat roof, beam ends, rounded parapet points
        w, d, h = 0.16, 0.14, 0.15
        walls(m, w, d, h, bevel=0.016)
        for sx in (-1, 1): m.solid(lathe((sx * w / 2, -d / 2, h - 0.02), [(0.014, 0), (0.012, 0.03), (0, 0.05)], 6), WALL)
        for x in (-0.05, -0.015, 0.02, 0.055): m.solid(cyl((x, -d / 2 + 0.01, h * 0.75), (x, -d / 2 - 0.02, h * 0.75), 0.004, 0.004, 4), WOOD)
        door(m, 0, -d / 2, 0, 0.03, 0.06, col=DARKWOOD)
        return m
    r, h = (0.075, 0.1) if v == 0 else (0.06, 0.08)
    m.solid(lathe((0, 0, -SINK), [(r, 0), (r * 0.98, SINK + h)], 12, True), WALL)
    cone(m, (0, 0, h - 0.01), r * 1.35, r * 1.5, THATCH, 12, 0.12)
    m.solid(lathe((0, 0, h - 0.012), [(r * 1.36, 0), (r * 1.36, 0.01)], 12, True), rgb('#9a7a44'))  # thatch rim
    door(m, 0, -r + 0.004, 0, 0.032, 0.06, col=DARKWOOD)
    if v == 1:  # granary beside it, on stones
        for k in range(3): m.solid(M.prim_sphere(Vector((0.07 + (k - 1) * 0.02, 0.05, 0.004)), 0.012, (1, 1, 0.7), 6), STONE)
        m.solid(lathe((0.07, 0.05, 0.012), [(0.035, 0), (0.04, 0.03), (0.032, 0.06)], 10, True), WALL)
        cone(m, (0.07, 0.05, 0.065), 0.05, 0.055, THATCH, 10)
    return m

def house_mesoamerican(v):
    m = Model('h'); w, d, h = 0.16, 0.13, 0.12; base = 0.03 if v == 1 else 0.0
    if base: m.solid(block((0, 0, -SINK), (w + 0.04, d + 0.04, SINK + base), 0.006), STONE)
    walls(m, w, d, h, z=base)
    m.solid(block((0, -d / 2 - 0.002, base + h * 0.62), (w + 0.004, 0.006, 0.026), 0.0), TRIM)  # painted frieze
    door(m, 0, -d / 2, base, 0.034, 0.06, col=DARKWOOD)
    if v == 2: m.solid(block((0, 0, base + h), (w + 0.01, d + 0.01, 0.016), 0.003), WALL); m.solid(block((0, 0, base + h + 0.016), (w * 0.5, d * 0.5, 0.012), 0.002), TRIM)
    else: hip_roof(m, (0, 0, base + h), w, d, 0.1, THATCH, o=0.03)
    return m

def house_native_american(v):
    m = Model('h')
    if v == 1:  # tipi
        r = 0.08; cone(m, (0, 0, -0.01), r, 0.24, rgb('#e2d2b0'), 10, 0.0, smooth=False)
        for k in range(6):
            a = 2 * math.pi * k / 6 + 0.3; m.solid(cyl((math.cos(a) * r * 0.2, math.sin(a) * r * 0.2, 0.18), (math.cos(a) * 0.025, math.sin(a) * 0.025, 0.3), 0.003, 0.003, 4), DARKWOOD)
        m.solid(lathe((0, 0, 0.05), [(r * 0.8, 0), (r * 0.74, 0.016)], 10, True), TRIM)  # painted band
        m.solid(loft([[Vector((-0.02, -0.07, 0)), Vector((0.02, -0.07, 0)), Vector((0, -0.055, 0.07))], [Vector((-0.02, -0.075, 0)), Vector((0.02, -0.075, 0)), Vector((0, -0.06, 0.07))]]), DARKWOOD)
        return m
    if v == 2:  # earth lodge
        m.solid(lathe((0, 0, -SINK), [(0.095, 0), (0.093, SINK + 0.03), (0.08, SINK + 0.07), (0.05, SINK + 0.1), (0.0, SINK + 0.115)], 14, True), ROOF)
        m.solid(block((0, -0.08, 0), (0.04, 0.05, 0.05), 0.006), ROOF); door(m, 0, -0.105, 0, 0.026, 0.04, col=DARKWOOD)
        return m
    w, d, h = 0.12, 0.2, 0.07  # longhouse: a bark barrel roof, its end toward the camera
    walls(m, w, d, h, WALL)
    arc = [(math.cos(math.pi * k / 7) * (w / 2 + 0.012), h + math.sin(math.pi * k / 7) * (w / 2 + 0.012) * 1.1) for k in range(8)]
    inner = [(x * 0.88, h + (z - h) * 0.88) for x, z in arc]  # the roof's cross-section: outer arch, then inner arch back
    sec = arc + inner[::-1]
    m.solid(loft([[Vector((x, y, z)) for x, z in sec] for y in (-d / 2 - 0.01, d / 2 + 0.01)], smooth=True), ROOF)
    for y in (-d / 2, d / 2):  # end walls under the arch
        prof = [Vector((x * 0.9, y, z)) for x, z in arc]
        m.solid(loft([[p + Vector((0, -0.003, 0)) for p in prof], [p + Vector((0, 0.003, 0)) for p in prof]]), WALL)
    for y in (-0.05, 0.0, 0.05):  # binding poles over the roof
        pts = [Vector((x * 1.06, y, h + (z - h) * 1.06)) for x, z in arc]
        for p0, p1 in zip(pts, pts[1:]): m.solid(cyl(p0, p1, 0.004, 0.004, 4), DARKWOOD)
    door(m, 0, -d / 2, 0, 0.03, 0.055, col=DARKWOOD)
    return m

def house_polynesian(v):
    m = Model('h'); w, d = 0.17, 0.13
    m.solid(block((0, 0, -SINK), (w + 0.03, d + 0.03, SINK + 0.02), 0.008), STONE)  # stone platform
    h = 0.06 if v != 1 else 0.08
    for x in (-w / 2 + 0.01, 0, w / 2 - 0.01):
        for sy in (-1, 1): m.solid(cyl((x, sy * (d / 2 - 0.01), 0.02), (x, sy * (d / 2 - 0.01), 0.02 + h), 0.007, 0.007, 6), WALL)
    if v == 1: walls(m, w * 0.85, d * 0.8, h, rgb('#c9b28a'), z=0.02)  # woven walls
    gable_roof(m, (0, 0, 0.02 + h), w, d, 0.13, THATCH, THATCH, o=0.03, t=0.02, along_y=True)
    if v == 2:  # carved post at the door
        m.solid(cyl((0.07, -d / 2 - 0.03, 0), (0.07, -d / 2 - 0.03, 0.1), 0.012, 0.01, 8), TRIM)
        m.solid(M.prim_sphere(Vector((0.07, -d / 2 - 0.03, 0.1)), 0.016, (1, 1, 1.2), 8), TRIM)
    return m

HOUSES = {'mediterranean': house_mediterranean, 'european': house_european, 'new_world': house_new_world, 'east_asian': house_east_asian,
          'southeast_asian': house_southeast_asian, 'south_asian': house_south_asian, 'middle_eastern': house_middle_eastern,
          'african': house_african, 'mesoamerican': house_mesoamerican, 'native_american': house_native_american, 'polynesian': house_polynesian}

# ---------------------------------------------------------------- landmarks: tier 0 (village hall) to 4 (metropolis); about 0.3 across at most
def hall(culture):  # a village hall: the culture's house made bigger (city.js plants the owner's flag on every landmark)
    m = HOUSES[culture](0); scale_model(m, 1.35); return m

def scale_model(m, k):
    S = Matrix.Scale(k, 4)
    for o, c in m.solids: o.matrix_world = S @ o.matrix_world

def lm_mediterranean(t):  # a temple, then a temple before a domed basilica, then a campanile beside it
    m = Model('l'); s = 0.86 + 0.08 * t
    w, d = 0.22 * s, 0.15 * s
    for k in range(3): m.solid(block((0, -0.05 * (t >= 3), -SINK + k * 0.012 + (SINK if k else 0)), (w + 0.04 - k * 0.014, d + 0.04 - k * 0.014, (SINK if k == 0 else 0) + 0.012), 0.003), STONE if k == 0 else PALE)
    y0 = -0.05 * (t >= 3); z = 0.036; ch = 0.13 * s
    m.solid(block((0, y0 + 0.01, z), (w * 0.7, d * 0.7, ch), 0.004), WALL)  # cella
    nc = 4 + (t >= 2) * 2
    columns(m, -w / 2 + 0.012, w / 2 - 0.012, y0 - d / 2 + 0.012, z, ch, nc, 0.009 * s, PALE)
    if t >= 2: columns(m, -w / 2 + 0.012, w / 2 - 0.012, y0 + d / 2 - 0.012, z, ch, nc, 0.009 * s, PALE)
    m.solid(block((0, y0, z + ch), (w, d, 0.02), 0.003), TRIM)  # entablature
    gable_roof(m, (0, y0, z + ch + 0.02), w, d, 0.05 * s, ROOF, PALE, o=0.012, along_y=True)  # pediment to the front
    if t >= 3:  # domed basilica behind the temple
        r = 0.08 + 0.015 * (t - 3)
        m.solid(lathe((0, 0.08, -SINK), [(r, 0), (r, SINK + 0.17)], 16, True), WALL)
        m.solid(lathe((0, 0.08, 0.17), [(r + 0.006, 0), (r + 0.006, 0.014)], 16, True), TRIM)
        dome(m, (0, 0.08, 0.184), r * 0.95, r * 0.85, ROOF, 16)
    if t >= 4:  # campanile
        m.solid(block((0.15, 0.06, -SINK), (0.045, 0.045, SINK + 0.36), 0.004), WALL)
        m.solid(block((0.15, 0.06, 0.3), (0.05, 0.05, 0.012), 0.002), TRIM)
        hip_roof(m, (0.15, 0.06, 0.36), 0.045, 0.045, 0.06, ROOF, 0.008)
    return m

def gothic_tower(m, x, y, w, h, spire):
    m.solid(block((x, y, -SINK), (w, w, SINK + h), 0.005), WALL)
    m.solid(block((x, y, h - 0.005), (w + 0.012, w + 0.012, 0.016), 0.003), TRIM)
    for sx in (-1, 1):
        for sy in (-1, 1): m.solid(cyl((x + sx * w / 2, y + sy * w / 2, h), (x + sx * w / 2, y + sy * w / 2, h + 0.04), 0.006, 0.0, 4), TRIM)
    m.solid(lathe((x, y, h + 0.01), [(w * 0.5, 0), (w * 0.3, spire * 0.4), (w * 0.12, spire * 0.8), (0, spire)], 8, False, math.pi / 8), ROOF)
    window(m, x, y - w / 2, h * 0.62, w * 0.3, h * 0.16)

def lm_european(t):  # a keep, a church with a spire, a cathedral with twin towers, then a bigger one with a crossing spire
    m = Model('l')
    if t == 1:
        w, h = 0.16, 0.26; m.solid(block((0, 0, -SINK), (w, w, SINK + h), 0.006), WALL)
        for k in range(4):  # crenellations round the top
            for j in (-1, 0, 1):
                u, e = j * w / 3, w / 2 - 0.012; x, y = [(u, -e), (e, u), (u, e), (-e, u)][k]
                m.solid(block((x, y, h), (0.026, 0.026, 0.03), 0.003), WALL)
        door(m, 0, -w / 2, 0, 0.04, 0.07, arch=True); window(m, 0, -w / 2, 0.15, 0.02, 0.04)
        return m
    L, nw, nh = 0.2 + 0.04 * (t - 2), 0.11 + 0.01 * t, 0.15 + 0.02 * t
    m.solid(block((0, 0.04, -SINK), (nw, L, SINK + nh), 0.005), WALL)  # nave (along y, toward the back)
    gable_roof(m, (0, 0.04, nh), nw, L, 0.1, ROOF, WALL, o=0.012, along_y=True)
    for sx in (-1, 1):
        for k in range(3): m.solid(block((sx * (nw / 2 + 0.008), 0.0 + k * L / 3.5, -SINK), (0.018, 0.022, SINK + nh * 0.85), 0.003), WALL)  # buttresses
    if t == 2: gothic_tower(m, 0, -L / 2 + 0.04, 0.075, 0.27, 0.2)
    else:
        for sx in (-1, 1): gothic_tower(m, sx * (nw / 2 - 0.01), -L / 2 + 0.03, 0.07, 0.26 + 0.04 * (t - 3), 0.16 + 0.04 * (t - 3))
        m.solid(cyl((0, -L / 2 + 0.035, nh * 0.75), (0, -L / 2 + 0.02, nh * 0.75), 0.03, 0.03, 12), rgb('#3e5a9a'))  # rose window
    door(m, 0, -L / 2 + 0.04 - (0.0375 if t == 2 else 0.0), 0, 0.034, 0.075, arch=True)
    if t == 4:  # crossing spire
        m.solid(lathe((0, 0.08, nh + 0.08), [(0.03, 0), (0.02, 0.1), (0.008, 0.2), (0, 0.24)], 8, False, math.pi / 8), ROOF)
    return m

def lm_new_world(t):  # a town hall with a cupola, a porticoed hall, then a capitol whose dome and wings grow
    m = Model('l'); W = [0, 0.18, 0.22, 0.28, 0.32][t]; D, H = 0.13 + 0.01 * t, 0.13 + 0.02 * t
    walls(m, W, D, H); m.solid(block((0, 0, H - 0.014), (W + 0.01, D + 0.01, 0.016), 0.003), TRIM)
    for sx in (-1, 1):
        for k in range(1, 3): window(m, sx * W * (0.17 + 0.16 * k), -D / 2, H * 0.4, 0.022, 0.04, frame=TRIM)
    if t >= 2:  # portico
        pw = 0.1 + 0.01 * t
        m.solid(block((0, -D / 2 - 0.025, 0), (pw, 0.05, 0.014), 0.002), PALE)
        columns(m, -pw / 2 + 0.008, pw / 2 - 0.008, -D / 2 - 0.04, 0.014, H - 0.014, 4 + (t >= 3) * 2, 0.007, PALE)
        gable_roof(m, (0, -D / 2 - 0.02, H), pw, 0.06, 0.035, TRIM, TRIM, o=0.006)
    door(m, 0, -D / 2, 0, 0.032, 0.06, col=DARKWOOD)
    if t == 1:
        hip_roof(m, (0, 0, H), W, D, 0.05, ROOF)
        m.solid(block((0, 0, H + 0.03), (0.04, 0.04, 0.05), 0.003), TRIM); dome(m, (0, 0, H + 0.08), 0.026, 0.035, ROOF, 10)
    else:
        m.solid(block((0, 0.005, H), (W * 0.9, D * 0.85, 0.02), 0.003), WALL)
        r = 0.05 + 0.017 * t; zd = H + 0.02
        m.solid(lathe((0, 0.01, zd), [(r * 0.9, 0), (r * 0.9, 0.05 + 0.01 * t)], 16, True), WALL)  # drum
        if t >= 3: [m.solid(cyl((math.cos(a) * r * 0.95, 0.01 + math.sin(a) * r * 0.95, zd), (math.cos(a) * r * 0.95, 0.01 + math.sin(a) * r * 0.95, zd + 0.05 + 0.01 * t), 0.005, 0.005, 5), PALE) for a in [2 * math.pi * k / 12 for k in range(12)]]
        zd += 0.05 + 0.01 * t; m.solid(lathe((0, 0.01, zd), [(r * 0.95, 0), (r * 0.95, 0.008)], 16, True), TRIM)
        dome(m, (0, 0.01, zd + 0.008), r * 0.88, r * 0.95, ROOF, 16, finial=None)
        zt = zd + 0.008 + r * 0.95 - 0.005
        m.solid(lathe((0, 0.01, zt), [(0.014, 0), (0.014, 0.03), (0.0, 0.05)], 8, True), PALE)  # lantern
    return m

def lm_east_asian(t):  # a pagoda gaining a storey each size, with a hall at its foot
    m = Model('l'); n = 1 + t; w = 0.14 + 0.01 * t
    m.solid(block((0, 0, -SINK), (w + 0.05, w + 0.05, SINK + 0.025), 0.005), STONE)
    z = 0.025; ww = w
    for i in range(n):
        h = 0.07 if i == 0 else 0.05
        m.solid(block((0, 0, z), (ww * 0.78, ww * 0.78, h), 0.004), WALL)
        if i == 0: door(m, 0, -ww * 0.39, z, 0.03, 0.05, col=DARKWOOD)
        curved_roof(m, (0, 0, z + h), ww, ww, 0.045, ROOF, 0.03, 0.035, top=0.5 if i < n - 1 else 0.15)
        z += h + 0.025; ww *= 0.84
    m.solid(cyl((0, 0, z + 0.01), (0, 0, z + 0.09), 0.006, 0.003, 6), TRIM)
    for k in range(3): m.solid(lathe((0, 0, z + 0.025 + k * 0.02), [(0.012, 0), (0.012, 0.006)], 8, True), TRIM)
    if t >= 3:  # side halls
        for sx in (-1, 1):
            m.solid(block((sx * 0.16, 0.06, -SINK), (0.08, 0.07, SINK + 0.07), 0.004), WALL)
            curved_roof(m, (sx * 0.16, 0.06, 0.07), 0.08, 0.07, 0.04, ROOF, 0.02, 0.025)
    return m

def prang(m, x, y, z, w, h, col=WALL, tip=ROOF):
    """a Khmer corncob tower: stacked shrinking tiers"""
    m.solid(block((x, y, z), (w, w, h * 0.35), 0.004), col)
    door(m, x, y - w / 2, z, w * 0.3, h * 0.22, arch=True, col=DARKWOOD)
    prof, zz, r = [], h * 0.35, w * 0.55
    for k in range(5):
        prof += [(r, zz), (r * 0.93, zz + h * 0.1), (r * 0.82, zz + h * 0.1)]; zz += h * 0.1; r *= 0.82
    prof += [(0, zz + h * 0.12)]
    m.solid(lathe((x, y, z), [(w * 0.55, h * 0.35 - 0.001)] + prof, 8, False, math.pi / 8), tip)

def lm_southeast_asian(t):  # a temple tower on a terrace; corner towers join it; a second terrace for the metropolis
    m = Model('l'); w = 0.24 + 0.02 * t
    m.solid(block((0, 0, -SINK), (w, w, SINK + 0.03), 0.005), WALL)
    z = 0.03
    if t >= 4: m.solid(block((0, 0, z), (w * 0.8, w * 0.8, 0.03), 0.005), WALL); z += 0.03
    m.solid(block((0, -w / 2 - 0.02, -0.01), (0.05, 0.05, 0.03), 0.004), WALL)  # stair
    prang(m, 0, 0, z, 0.08 + 0.008 * t, 0.26 + 0.05 * t)
    if t >= 2:
        for sx in (-1, 1): prang(m, sx * w * 0.36, -w * 0.3, 0.03, 0.05, 0.16 + 0.02 * t)
    if t >= 3:
        for sx in (-1, 1): prang(m, sx * w * 0.36, w * 0.3, 0.03, 0.05, 0.16 + 0.02 * t)
    return m

def lm_mughal(t):  # a tomb-mosque: plinth, iwan block, onion dome; chhatris then minarets join
    m = Model('l'); w = 0.15 + 0.015 * t
    m.solid(block((0, 0, -SINK), (w + 0.07, w + 0.07, SINK + 0.03), 0.005), TRIM)
    walls(m, w, w, 0.11 + 0.01 * t, z=0.03)
    h = 0.03 + 0.11 + 0.01 * t
    m.solid(block((0, -w / 2 - 0.003, 0.03), (w * 0.45, 0.01, h - 0.03 + 0.012), 0.002), TRIM)  # iwan frame
    door(m, 0, -w / 2 - 0.008, 0.03, w * 0.3, (h - 0.03) * 0.7, arch=True, col=DARKWOOD)
    m.solid(lathe((0, 0, h), [(w * 0.3, 0), (w * 0.3, 0.03)], 14, True), WALL)
    dome(m, (0, 0, h + 0.03), w * 0.34, w * 0.62, ROOF, 16, onion=True)
    if t >= 2:
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * w * 0.36, sy * w * 0.36
                m.solid(lathe((x, y, h), [(0.016, 0), (0.016, 0.03)], 8, True), WALL); dome(m, (x, y, h + 0.03), 0.02, 0.035, ROOF, 8, onion=True, finial=None)
    if t >= 3:
        cs = [(-1, -1), (1, -1)] if t == 3 else [(-1, -1), (1, -1), (-1, 1), (1, 1)]
        for sx, sy in cs:
            x, y = sx * (w / 2 + 0.03), sy * (w / 2 + 0.03); mh = h + 0.1
            m.solid(lathe((x, y, 0.03), [(0.016, 0), (0.012, mh - 0.03)], 8, True), WALL)
            m.solid(lathe((x, y, mh * 0.6), [(0.02, 0), (0.02, 0.008)], 8, True), TRIM)
            m.solid(lathe((x, y, mh), [(0.016, 0), (0.016, 0.02)], 8, True), TRIM); dome(m, (x, y, mh + 0.02), 0.016, 0.03, ROOF, 8, onion=True, finial=None)
    return m

def lm_persian(t):  # a mosque: tiled dome on a cube, minarets and a great portal as it grows
    m = Model('l'); w = 0.15 + 0.015 * t
    walls(m, w, w, 0.11 + 0.012 * t); h = 0.11 + 0.012 * t
    m.solid(block((0, 0, h - 0.016), (w + 0.006, w + 0.006, 0.018), 0.003), ROOF)  # tiled band
    m.solid(lathe((0, 0.0, h), [(w * 0.38, 0), (w * 0.38, 0.035)], 16, True), ROOF)
    dome(m, (0, 0, h + 0.035), w * 0.4, w * 0.6, ROOF, 16, pointed=True)
    if t >= 3:  # iwan portal
        m.solid(block((0, -w / 2 - 0.02, -SINK), (w * 0.6, 0.04, SINK + h + 0.04), 0.004), WALL)
        m.solid(block((0, -w / 2 - 0.042, 0), (w * 0.34, 0.006, h * 0.8), 0.0), ROOF)
        door(m, 0, -w / 2 - 0.044, 0, w * 0.2, h * 0.5, arch=True, col=DARKWOOD)
    else: door(m, 0, -w / 2, 0, 0.034, 0.065, arch=True, col=DARKWOOD)
    nm = {1: [], 2: [(1, -1)], 3: [(-1, -1), (1, -1)], 4: [(-1, -1), (1, -1), (-1, 1), (1, 1)]}[t]
    for sx, sy in nm:
        x, y = sx * (w / 2 + 0.035), sy * (w / 2 + 0.02); mh = h + 0.15 + 0.02 * t
        m.solid(lathe((x, y, -SINK), [(0.017, 0), (0.013, SINK + mh)], 10, True), WALL)
        m.solid(lathe((x, y, mh * 0.75), [(0.013, 0), (0.022, 0.012), (0.022, 0.02), (0.013, 0.022)], 10, True), ROOF)  # balcony
        m.solid(lathe((x, y, mh), [(0.014, 0), (0.0, 0.035)], 10, True), ROOF)
    return m

def lm_african(t):  # a chief's round house, then a Sahelian mud mosque whose towers and timber spikes multiply
    m = Model('l')
    if t == 1:
        r = 0.1; m.solid(lathe((0, 0, -SINK), [(r, 0), (r * 0.97, SINK + 0.13)], 14, True), WALL)
        cone(m, (0, 0, 0.12), r * 1.35, 0.16, THATCH, 14, 0.12); door(m, 0, -r + 0.004, 0, 0.04, 0.07, col=DARKWOOD)
        return m
    W, D, H = 0.2 + 0.03 * (t - 2), 0.16, 0.12 + 0.02 * t
    walls(m, W, D, H, bevel=0.02)
    xs = [0] if t == 2 else [-W / 2 + 0.03, 0, W / 2 - 0.03]; tr = 0.04 if t == 2 else 0.03
    for x in xs:  # tapering mud towers on the front with a cone cap
        th = H + 0.08 + (0.04 if x == 0 else 0) + 0.01 * t
        m.solid(lathe((x, -D / 2, -SINK), [(tr, 0), (0.024, SINK + th)], 8, True, math.pi / 8), WALL)
        m.solid(lathe((x, -D / 2, th - 0.005), [(0.024, 0), (0.0, 0.04)], 8, True), WALL)
        m.solid(M.prim_sphere(Vector((x, -D / 2, th + 0.036)), 0.008, (1, 1, 1.4), 6), PALE)  # ostrich egg on the tip
        for k in range(3):
            z = (k + 1) * th / 4
            for a in (-0.6, 0.6, 0):
                m.solid(cyl((x, -D / 2, z), (x + math.sin(a) * 0.05, -D / 2 - math.cos(a) * 0.05, z), 0.003, 0.003, 4), WOOD)
    for sx in (-1, 1):
        for k in range(2): m.solid(lathe((sx * W / 2, -D / 2 + 0.05 + k * 0.07, -SINK), [(0.02, 0), (0.014, SINK + H + 0.03), (0, SINK + H + 0.05)], 6, True), WALL)  # buttress pinnacles
    for x in ([0.06] if t == 2 else [-W / 4, W / 4]): door(m, x, -D / 2, 0, 0.022, 0.055, arch=True, col=DARKWOOD)
    return m

def lm_mesoamerican(t):  # a stepped pyramid that gains steps, with a stair and a temple on top
    m = Model('l'); steps = 2 + t; base = 0.22 + 0.025 * t; sh = 0.045
    z, s = -SINK, base
    for i in range(steps):
        hh = sh + (SINK if i == 0 else 0)
        m.solid(block((0, 0, z), (s, s, hh), 0.004), WALL if i % 2 == 0 else STONE); z += hh; s *= 0.8
    m.solid(loft([rect(0, -base * 0.35, -0.01, 0.032, base * 0.17)[:2] + [Vector((0.022, -s / 2 + 0.01, z)), Vector((-0.022, -s / 2 + 0.01, z))],
                  [Vector((-0.032, -base / 2 - 0.01, -0.01)), Vector((0.032, -base / 2 - 0.01, -0.01)), Vector((0.022, -s / 2 - 0.004, z)), Vector((-0.022, -s / 2 - 0.004, z))]]), STONE)  # stair
    tw = max(0.07, s * 0.9)
    m.solid(block((0, 0.01, z), (tw, tw * 0.8, 0.06), 0.003), WALL)
    m.solid(block((0, 0.01 - tw * 0.4 - 0.002, z + 0.036), (tw + 0.004, 0.006, 0.02), 0.0), TRIM)  # painted frieze
    door(m, 0, 0.01 - tw * 0.4, z, 0.024, 0.04, col=DARKWOOD)
    m.solid(block((0, 0.01, z + 0.06), (tw + 0.01, tw * 0.8 + 0.01, 0.014), 0.003), ROOF)
    m.solid(block((0, 0.01 + tw * 0.2, z + 0.074), (tw * 0.9, 0.012, 0.05), 0.002), ROOF)  # roof comb
    return m

def totem(m, x, y, n):
    cols = [TRIM, ROOF, OWNER, TRIM, ROOF]
    for k in range(n): m.solid(block((x, y, -SINK + (SINK if k else 0) + k * 0.05), (0.04, 0.04, 0.05 + (SINK if k == 0 else 0)), 0.006), cols[k % 5] if k % 2 else DARKWOOD)
    m.solid(block((x, y, n * 0.05), (0.12, 0.022, 0.016), 0.004), TRIM)  # wings
    for sx in (-1, 1): m.solid(M.prim_sphere(Vector((x + sx * 0.009, y - 0.021, (n - 0.5) * 0.05)), 0.006, (1, 0.6, 1), 6), PALE)

def lm_native_american(t):  # a great lodge with totem poles; a palisade and a second lodge as it grows
    m = Model('l'); r = 0.1 + 0.015 * t
    m.solid(lathe((0, 0.02, -SINK), [(r, 0), (r, SINK + 0.05)], 16, True), WALL)
    m.solid(lathe((0, 0.02, 0.05), [(r * 1.08, 0), (r * 0.98, 0.04), (r * 0.75, 0.08), (r * 0.4, 0.11), (0, 0.12)], 16, True), ROOF)
    m.solid(block((0, 0.02 - r, 0), (0.05, 0.06, 0.06), 0.008), ROOF); door(m, 0, 0.02 - r - 0.03, 0, 0.028, 0.045, col=DARKWOOD)
    totem(m, r + 0.04, -0.04, 3 + t)
    if t >= 3: totem(m, -r - 0.04, -0.04, 2 + t)
    if t >= 4:
        m.solid(lathe((0.07, 0.14, -SINK), [(0.06, 0), (0.06, SINK + 0.03), (0.04, SINK + 0.07), (0, SINK + 0.08)], 12, True), ROOF)
    return m

def lm_polynesian(t):  # a marae: stone platform, a great carved meeting house, then guardian statues on the platform
    m = Model('l'); W = 0.22 + 0.02 * t
    m.solid(block((0, 0, -SINK), (W, 0.2, SINK + 0.03 + 0.01 * t), 0.008), STONE)
    z = 0.03 + 0.01 * t; hw, hd, h = 0.13 + 0.01 * t, 0.1, 0.07 + 0.01 * t
    m.solid(block((0, 0.03, z), (hw, hd, h), 0.004), WALL)
    for sx in (-1, 1): m.solid(block((sx * hw / 2, 0.03 - hd / 2 - 0.004, z), (0.016, 0.01, h + 0.02), 0.002), TRIM)  # carved bargeboard posts
    door(m, 0, 0.03 - hd / 2, z, 0.03, 0.05, col=DARKWOOD)
    gable_roof(m, (0, 0.03, z + h), hw, hd, 0.12 + 0.01 * t, THATCH, WALL, o=0.03, t=0.02, along_y=True)
    m.solid(M.prim_sphere(Vector((0, 0.03 - hd / 2 - 0.03, z + h + 0.12)), 0.016, (1, 1, 1.2), 8), TRIM)  # carved figure at the gable
    if t >= 2:
        for i in range(t - 1):  # moai-like guardians along the front
            x = -W / 2 + 0.03 + i * 0.05 if i < 2 else W / 2 - 0.03 - (i - 2) * 0.05
            m.solid(block((x, -0.08, z), (0.026, 0.024, 0.06), 0.006), STONE); m.solid(block((x, -0.08, z + 0.06), (0.03, 0.03, 0.035), 0.008), STONE)
            m.solid(block((x, -0.096, z + 0.07), (0.008, 0.008, 0.02), 0.002), rgb('#8a8478'))  # nose
            m.solid(lathe((x, -0.08, z + 0.095), [(0.016, 0), (0.016, 0.014)], 8, True), rgb('#a0503a'))  # red topknot
    return m

LANDMARKS = {'mediterranean': lm_mediterranean, 'european': lm_european, 'new_world': lm_new_world, 'east_asian': lm_east_asian,
             'southeast_asian': lm_southeast_asian, 'south_asian': lm_mughal, 'middle_eastern': lm_persian, 'african': lm_african,
             'mesoamerican': lm_mesoamerican, 'native_american': lm_native_american, 'polynesian': lm_polynesian}

# ---------------------------------------------------------------- ramparts: a wall running along x from -0.5 to 0.5 (city.js stretches it
# between corner towers), a round tower and a gatehouse; WALL here is the stone colour city.js derives from the culture
def wall_seg():
    m = Model('w'); t, h = 0.045, 0.11
    m.solid(block((0, 0, -0.1), (1.0, t, 0.1 + h), 0.004), WALL)
    m.solid(block((0, 0, h - 0.008), (1.0, t + 0.012, 0.012), 0.002), WALL)  # wall-walk lip
    for k in range(12): m.solid(block((-0.5 + (k + 0.5) / 12, -t / 2 + 0.004, h), (0.03, 0.012, 0.028), 0.003), WALL)  # merlons, outer side
    return m

def wall_tower():
    m = Model('w'); r, h = 0.055, 0.18
    m.solid(lathe((0, 0, -0.1), [(r * 1.1, 0), (r, 0.12), (r, 0.1 + h)], 12, True), WALL)
    m.solid(lathe((0, 0, h - 0.004), [(r + 0.008, 0), (r + 0.008, 0.016)], 12, True), WALL)
    cone(m, (0, 0, h + 0.012), r * 1.25, r * 1.8, ROOF, 12)
    window(m, 0, -r + 0.004, h * 0.55, 0.012, 0.024)
    flagpole(m, 0, 0, h + 0.012 + r * 1.75, 0.07)
    return m

def wall_gate():
    m = Model('w'); w, d, h = 0.16, 0.08, 0.17
    m.solid(block((0, 0, -0.1), (w, d, 0.1 + h), 0.005), WALL)
    for k in range(5): m.solid(block((-w / 2 + 0.016 + k * (w - 0.032) / 4, -d / 2 + 0.006, h), (0.024, 0.012, 0.026), 0.003), WALL)
    door(m, 0, -d / 2, 0, 0.06, 0.07, arch=True, col=DARKWOOD)
    for sx in (-1, 1): m.solid(lathe((sx * w / 2, 0, -0.1), [(0.04, 0), (0.036, 0.1 + h + 0.04)], 10, True), WALL); cone(m, (sx * w / 2, 0, h + 0.04), 0.048, 0.08, ROOF, 10)
    m.solid(block((0, -d / 2 - 0.003, h - 0.07), (0.035, 0.004, 0.05), 0.0), OWNER)  # banner over the gate
    return m

MODELS = {}
for c in HOUSES:
    for v in range(3): MODELS['house_%s_%d' % (c, v)] = (lambda c=c, v=v: HOUSES[c](v))
    MODELS['landmark_%s_0' % c] = (lambda c=c: hall(c))
    for t in range(1, 5): MODELS['landmark_%s_%d' % (c, t)] = (lambda c=c, t=t: LANDMARKS[c](t))
MODELS.update({'wall_seg': wall_seg, 'wall_tower': wall_tower, 'wall_gate': wall_gate})
CAP = 1600  # triangles per model at most (a metropolis draws 22 houses and a landmark)

def assemble(m, name, cap=CAP):
    parts = []
    for o, col in m.solids:
        o.data.transform(o.matrix_world); o.matrix_world = Matrix()
        colour_mesh(o, (lambda c: (lambda p: c))(col)); parts.append(o)
    bm = bmesh.new()
    for o in parts: bm.from_mesh(o.data)
    out = bpy.data.meshes.new(name); bm.to_mesh(out); bm.free()
    for o in parts: bpy.data.objects.remove(o)
    obj = new_obj(out, name)
    bake_ao(obj, rays=32, dist=0.25)
    return obj

def palettize(obj, pal):
    """preview only: paint the role colours the game would (one sample culture palette)"""
    attr = obj.data.color_attributes['Col']
    for d in attr.data:
        c = d.color; a = round(c[3], 1)
        if a < 0.95: base = pal.get(a, (1, 0, 1)); d.color = (base[0] * c[0], base[1] * c[1], base[2] * c[2], 1.0)

PALETTES = {  # AU.PALACE_STYLES (wall, roof, trim), for previews
    'mediterranean': ('#efe7d6', '#b0432f', '#d9c27a'), 'european': ('#c9c4bd', '#4f5a6e', '#8f8a80'), 'new_world': ('#b8624a', '#4d7d6b', '#f2ece0'),
    'east_asian': ('#b23a2c', '#3d4a5c', '#e8b84a'), 'southeast_asian': ('#c9a06b', '#e0b23f', '#7d5a33'), 'south_asian': ('#f2eadb', '#e9ecef', '#b8412f'),
    'middle_eastern': ('#e2d3b0', '#2f8fb3', '#d7b15c'), 'african': ('#c98a4a', '#8a6a3a', '#5c3d1e'), 'mesoamerican': ('#b7a889', '#c8433a', '#2f9c8a'),
    'native_american': ('#9c7248', '#5f4a30', '#d9b36a'), 'polynesian': ('#a37a4d', '#c9b26a', '#3f2a18')}

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    out = argv[argv.index('--out') + 1] if '--out' in argv else 'godot/models'
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else list(MODELS)
    prev = argv[argv.index('--preview') + 1] if '--preview' in argv else None
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(out, exist_ok=True); objs = []
    for name in only:
        o = assemble(MODELS[name](), name); n = M.export(o, os.path.join(out, name + '.json'), None)
        print('model %-30s %5d triangles' % (name, n)); objs.append(o)
        if prev:
            cul = next((c for c in PALETTES if name.startswith(('house_' + c + '_', 'landmark_' + c + '_'))), 'mediterranean'); w, r, t = (rgb(h) for h in PALETTES[cul])
            palettize(o, {0.2: w if not name.startswith('wall') else (0.72, 0.7, 0.66), 0.4: r, 0.6: t, 0.0: (0.85, 0.2, 0.2)})
            S = Matrix.Scale(5, 4); o.data.transform(S)  # preview at a readable size
    if prev: M.preview(objs, os.path.abspath(prev))
