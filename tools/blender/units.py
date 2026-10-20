# Tiny Empires 3D units, built in Blender from code in the chibi style of tools/blender/models.py (warrior, spearman,
# archer and horseman live there): big heads, big eyes, the owner's colour on tunics, banners, sails and paintwork.
# Hats, helmets, weapons, shields, wheels and hulls are separate shells (not melted into the body), so the game's ink
# outline (shaders.UNIT_OUTLINE) draws a line round each of them and they read at strategy-game zoom.
# Sideways models (mounts, vehicles, ships, aircraft) are built along +x and turned three-quarters toward the camera.
#
# Usage: python tools/blender/units.py [--out godot/models] [--preview previews.png] [--only unit_tank,unit_knight]
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix, Quaternion
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import models as M
from models import (rgb, Model, TEAM, SKIN, HAIR, PANTS, BOOTS, METAL, WOOD, LEATHER, EYE, WHITE, prim_cylinder as cyl,
                    prim_sphere as sph, prim_arc, look_up, turn, qx, qy, qz, horse, cow, elephant)
import buildings as B

GOLD, DARK, STEEL, IRON = rgb('#e8b84a'), rgb('#2a2a30'), rgb('#7d8796'), rgb('#4a4e58')
KHAKI, OLIVE, OLIVE2, NAVY, CREAM = rgb('#a8955e'), rgb('#5f6e3a'), rgb('#4b5a2e'), rgb('#2c3c6c'), rgb('#efe6cf')
STRAW, RED, BLACK, GREY, BRONZE = rgb('#d8b45a'), rgb('#c0392b'), rgb('#22202a'), rgb('#9aa0a8'), rgb('#b07a3a')
TURN = -34  # degrees: sideways models turn three-quarters toward the camera (the game used to do this for the horseman)

# ---------------------------------------------------------------- solids
def rbox(c, s, r=0.06, seg=2, rot=None):
    """a rounded box centred at c (bevelled edges, smooth-shaded: a toy-like block)"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts: v.co = Vector((v.co.x * s[0], v.co.y * s[1], v.co.z * s[2]))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(r, min(s) * 0.45), segments=seg, affect='EDGES', clamp_overlap=True)
    R = rot.to_matrix().to_4x4() if rot else Matrix()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ R, verts=bm.verts)
    me = bpy.data.meshes.new('rbox'); bm.to_mesh(me); bm.free(); return M.new_obj(me)

def wheel(m, c, r, w, col=WOOD, hub=DARK, spokes=False):
    c = Vector(c); a, b = c + Vector((0, -w / 2, 0)), c + Vector((0, w / 2, 0))
    m.solid(cyl(a, b, r, r, 18), col)
    m.solid(cyl(c + Vector((0, -w / 2 - 0.02, 0)), c + Vector((0, w / 2 + 0.02, 0)), r * 0.3, r * 0.3, 10), hub)

def tube(a, b, r, seg=10): return cyl(a, b, r, r, seg)

def disc_y(c, r, t, seg=20):  # a disc facing -y (toward the camera)
    c = Vector(c); return cyl(c + Vector((0, t / 2, 0)), c - Vector((0, t / 2, 0)), r, r, seg)

# ---------------------------------------------------------------- people
def person(name, hat='hair', top=TEAM, legs=PANTS, boots=BOOTS, belt=LEATHER, skin=SKIN, hair=HAIR, z=0.0, sitting=False,
           face=None, kneel=False, scale_head=1.0):
    """a chibi figure facing -y. hat: a headwear kind (see headwear); face(m, hz): extra parts on the head (glasses, beards)
    that tip up with it"""
    m = Model(name); hz = z + 1.42
    nb, ns = len(m.balls), len(m.solids)
    m.ball((0, 0, hz), 0.5 * scale_head, skin)
    headwear(m, hat, hz, hair)
    for s in (-1, 1):  # big chibi eyes: white, a large dark iris low in it, a highlight
        m.solid(sph(Vector((s * 0.185, -0.44, hz - 0.02)), 0.11, (0.85, 0.45, 1.2), 12), WHITE)
        m.solid(sph(Vector((s * 0.18, -0.475, hz - 0.04)), 0.075, (0.85, 0.4, 1.15), 12), EYE)
        m.solid(sph(Vector((s * 0.155, -0.51, hz + 0.0)), 0.026, (1, 0.6, 1), 6), WHITE)
    m.ball((0, -0.5, hz - 0.12), 0.06, rgb('#e8a888'))
    if face: face(m, hz)
    look_up(m, nb, ns, Vector((0, 0, hz)), 24)
    m.ball((0, 0, z + 0.78), 0.36, top, scale=(1.0, 0.85, 1.05), kind='ELLIPSOID')
    if belt: m.ball((0, 0, z + 0.6), 0.34, belt, scale=(1.02, 0.9, 0.22), kind='ELLIPSOID')
    if sitting:
        for s in (-1, 1):
            m.capsule((s * 0.15, 0, z + 0.55), (s * 0.42, -0.1, z + 0.3), 0.12, legs)
            m.ball((s * 0.45, -0.18, z + 0.18), 0.14, boots, scale=(1, 1.3, 0.8), kind='ELLIPSOID')
    elif kneel:
        m.capsule((0.15, 0, z + 0.5), (0.18, -0.3, z + 0.32), 0.12, legs); m.capsule((0.18, -0.3, z + 0.32), (0.18, -0.3, z + 0.1), 0.11, legs)
        m.ball((0.18, -0.36, z + 0.08), 0.14, boots, scale=(1, 1.3, 0.8), kind='ELLIPSOID')
        m.capsule((-0.15, 0, z + 0.5), (-0.17, 0.2, z + 0.12), 0.12, legs); m.ball((-0.17, 0.3, z + 0.08), 0.13, boots, scale=(1, 1.3, 0.8), kind='ELLIPSOID')
    else:
        for s in (-1, 1):
            m.capsule((s * 0.15, 0, z + 0.5), (s * 0.16, 0, z + 0.18), 0.12, legs)
            m.ball((s * 0.16, -0.05, z + 0.1), 0.14, boots, scale=(1, 1.3, 0.8), kind='ELLIPSOID')
    return m, hz

def headwear(m, kind, hz, hair=HAIR):
    """hats and helmets as separate shells, so the outline separates them from the face"""
    def cap_dome(col, zc=0.22, sz=0.74, r=0.5, seg=24): m.solid(sph(Vector((0, 0.05, hz + zc)), r, (1.06, 1.06, sz), seg), col)
    def hair_cap(): m.ball((0, 0.06, hz + 0.2), 0.5, hair, scale=(1.06, 1.02, 0.78), kind='ELLIPSOID')
    if kind == 'hair':
        hair_cap()
        for s in (-1, 0, 1): m.ball((s * 0.2, -0.33, hz + 0.3 - abs(s) * 0.05), 0.15, hair)
    elif kind == 'bald': pass
    elif kind == 'headband':
        hair_cap(); m.solid(tube((0, 0.05, hz + 0.16), (0, 0.05, hz + 0.24), 0.53), TEAM)
    elif kind == 'helmet':  # ancient: steel dome, brim band, crest
        cap_dome(STEEL); m.solid(tube((0, 0.05, hz + 0.13), (0, 0.05, hz + 0.21), 0.535, 28), rgb('#565d6a'))
        m.solid(sph(Vector((0, 0.08, hz + 0.62)), 0.13, (0.55, 2.6, 1.0), 16), TEAM)
        m.solid(cyl((0, -0.5, hz + 0.17), (0, -0.54, hz - 0.03), 0.045, 0.035, 8), rgb('#565d6a'))
    elif kind == 'roman':  # crest across, cheek guards
        cap_dome(STEEL); m.solid(tube((0, 0.05, hz + 0.13), (0, 0.05, hz + 0.21), 0.535, 28), GOLD)
        m.solid(sph(Vector((0, 0.06, hz + 0.62)), 0.14, (2.6, 0.55, 1.0), 16), TEAM)
        for s in (-1, 1): m.solid(rbox(Vector((s * 0.46, -0.12, hz - 0.02)), (0.07, 0.22, 0.3), 0.03), STEEL)
    elif kind == 'morion':  # pikeman: crested steel with a turned-up brim
        cap_dome(STEEL, 0.24, 0.8); m.solid(sph(Vector((0, 0.05, hz + 0.14)), 0.66, (1.0, 0.8, 0.12), 24), STEEL)
        m.solid(sph(Vector((0, 0.05, hz + 0.6)), 0.12, (0.4, 2.2, 1.1), 14), STEEL); m.solid(sph(Vector((0, 0.3, hz + 0.6)), 0.1, (1, 1, 1.4), 10), TEAM)
    elif kind == 'kettle':  # medieval kettle hat (crossbowman) and the WWI soldier's helmet: dome with a wide brim
        cap_dome(STEEL, 0.27, 0.7); m.solid(sph(Vector((0, 0.08, hz + 0.24)), 0.6, (1.0, 1.0, 0.09), 24), STEEL)
    elif kind == 'brodie':
        cap_dome(KHAKI, 0.28, 0.62); m.solid(sph(Vector((0, 0.08, hz + 0.26)), 0.6, (1.0, 1.0, 0.08), 24), KHAKI)
    elif kind == 'army':  # modern helmet, olive, low over the brow
        cap_dome(OLIVE, 0.2, 0.78, 0.53); m.solid(tube((0, 0.05, hz + 0.1), (0, 0.05, hz + 0.16), 0.56, 28), OLIVE2)
    elif kind == 'goggles':  # special forces: army helmet with goggles on the brow
        cap_dome(OLIVE2, 0.2, 0.78, 0.53)
        for s in (-1, 1): m.solid(cyl((s * 0.17, -0.48, hz + 0.3), (s * 0.17, -0.56, hz + 0.32), 0.1, 0.1, 14), rgb('#7fd0e8'))
        m.solid(tube((0, 0.05, hz + 0.27), (0, 0.05, hz + 0.33), 0.55, 24), BLACK)
    elif kind == 'tricorn':
        hair_cap(); m.solid(sph(Vector((0, 0.05, hz + 0.4)), 0.36, (1.1, 1.1, 0.7), 16), BLACK)
        for a in (90, 210, 330):
            r = math.radians(a); m.solid(sph(Vector((math.cos(r) * 0.36, 0.05 + math.sin(r) * 0.36, hz + 0.42)), 0.3, (1.0, 0.45, 0.6), 14, ), BLACK)
        m.solid(sph(Vector((0, -0.38, hz + 0.5)), 0.06, (1, 0.5, 1), 8), GOLD)
    elif kind == 'shako':  # tall cylinder cap with a peak and a plume
        hair_cap(); m.solid(cyl((0, 0.04, hz + 0.25), (0, 0.04, hz + 0.85), 0.36, 0.42, 20), NAVY)
        m.solid(tube((0, 0.04, hz + 0.78), (0, 0.04, hz + 0.86), 0.43, 20), GOLD)
        m.solid(sph(Vector((0, -0.38, hz + 0.28)), 0.26, (1.2, 0.8, 0.18), 14), BLACK)  # peak
        m.solid(sph(Vector((0, -0.36, hz + 0.55)), 0.09, (1, 0.5, 1), 10), GOLD)
        m.solid(sph(Vector((0.2, 0.0, hz + 1.0)), 0.1, (0.7, 0.7, 1.6), 10), TEAM)  # plume
    elif kind == 'bicorne':
        hair_cap(); m.solid(sph(Vector((0, 0.08, hz + 0.45)), 0.62, (1.0, 0.32, 0.55), 20), BLACK)
        m.solid(sph(Vector((0, -0.12, hz + 0.5)), 0.09, (1, 0.5, 1), 10), TEAM); m.solid(tube((-0.6, 0.08, hz + 0.25), (0.6, 0.08, hz + 0.25), 0.03, 6), GOLD)
    elif kind == 'great_helm':  # knight: flat-topped barrel helm, eye slit, plume
        m.solid(cyl((0, 0.0, hz - 0.3), (0, 0.0, hz + 0.55), 0.55, 0.5, 24), STEEL)
        m.solid(rbox(Vector((0, -0.53, hz + 0.05)), (0.6, 0.1, 0.07), 0.02), BLACK)  # eye slit
        m.solid(tube((0, 0.0, hz - 0.12), (0, 0, hz - 0.06), 0.56, 24), GOLD)
        m.solid(sph(Vector((0, 0.05, hz + 0.75)), 0.16, (0.8, 1.4, 1.4), 14), TEAM)
    elif kind == 'cap':  # engineer's cap with a bill
        cap_dome(rgb('#e8a33a'), 0.22, 0.6, 0.5); m.solid(sph(Vector((0, -0.4, hz + 0.24)), 0.32, (1.1, 0.9, 0.12), 16), rgb('#2c5aa0'))
    elif kind == 'beret':
        hair_cap(); m.solid(sph(Vector((0.08, 0.02, hz + 0.42)), 0.5, (1.1, 1.0, 0.3), 18), NAVY); m.solid(sph(Vector((0.1, 0.02, hz + 0.58)), 0.05, (1, 1, 1.5), 6), NAVY)
    elif kind == 'turban':
        m.solid(sph(Vector((0, 0.05, hz + 0.3)), 0.52, (1.1, 1.1, 0.75), 20), TEAM)
        m.solid(tube((0, 0.05, hz + 0.1), (0, 0.05, hz + 0.26), 0.56, 24), GOLD)
        m.solid(sph(Vector((0, -0.52, hz + 0.32)), 0.08, (1, 0.6, 1.2), 10), rgb('#3ab0d8'))
    elif kind == 'wide_hat':  # missionary and scout: crown and a wide brim
        m.solid(cyl((0, 0.05, hz + 0.25), (0, 0.05, hz + 0.6), 0.42, 0.38, 20), rgb('#c98a4a'))
        m.solid(sph(Vector((0, 0.05, hz + 0.25)), 0.8, (1.0, 1.0, 0.09), 24), rgb('#c98a4a'))
        m.solid(tube((0, 0.05, hz + 0.28), (0, 0.05, hz + 0.36), 0.43, 20), TEAM)
    elif kind == 'slouch':  # scout
        m.solid(sph(Vector((0, 0.05, hz + 0.3)), 0.5, (1.05, 1.05, 0.55), 20), rgb('#6e6a3e'))
        m.solid(sph(Vector((0, 0.0, hz + 0.22)), 0.72, (1.0, 1.0, 0.08), 22), rgb('#6e6a3e'))
    elif kind == 'straw':  # scarecrow
        m.solid(cyl((0, 0.05, hz + 0.25), (0, 0.05, hz + 0.65), 0.4, 0.2, 16), STRAW)
        m.solid(sph(Vector((0, 0.05, hz + 0.25)), 0.85, (1.0, 1.0, 0.08), 22), STRAW)
    elif kind == 'hood':
        m.ball((0, 0.12, hz + 0.08), 0.53, rgb('#3e6a3a'), scale=(1.05, 1.0, 0.95), kind='ELLIPSOID')
    elif kind == 'prophet':  # long white hair under a halo
        m.ball((0, 0.1, hz + 0.1), 0.53, rgb('#f2f0ea'), scale=(1.06, 1.04, 0.95), kind='ELLIPSOID')
        m.solid(prim_arc(Vector((0, 0.1, hz + 0.75)), 0.42, 0.04, 0, 2 * math.pi, qx(90), 32), GOLD)
    elif kind == 'feather':  # bandleader: hat with a big feather
        m.solid(cyl((0, 0.05, hz + 0.25), (0, 0.05, hz + 0.55), 0.44, 0.4, 20), TEAM)
        m.solid(sph(Vector((0, 0.05, hz + 0.25)), 0.66, (1.0, 1.0, 0.1), 22), TEAM)
        m.solid(sph(Vector((0.3, 0.2, hz + 0.75)), 0.13, (0.6, 0.6, 2.4), 12, ), WHITE)
    elif kind == 'admiral':
        hair_cap(); m.solid(sph(Vector((0, 0.08, hz + 0.45)), 0.66, (1.0, 0.3, 0.55), 20), BLACK)
        m.solid(tube((-0.62, 0.0, hz + 0.32), (0.62, 0.0, hz + 0.32), 0.035, 6), GOLD)
        m.solid(sph(Vector((0, -0.14, hz + 0.58)), 0.1, (1, 0.5, 1), 10), WHITE)
    elif kind == 'general':  # plumed general's helmet
        cap_dome(GOLD, 0.22, 0.74); m.solid(sph(Vector((0, 0.1, hz + 0.68)), 0.16, (0.6, 2.4, 1.1), 14), RED)

def arm(m, side, hand, z=0.0, sleeve=TEAM, skin=SKIN):
    sh = Vector((side * 0.33, 0, z + 0.95)); hand = Vector(hand)
    m.capsule(sh, sh.lerp(hand, 0.85), 0.1, sleeve); m.ball(hand, 0.11, skin)

def scaled(m, k, off=(0, 0, 0)): return turn(m, Quaternion(), off, k)

def merge(a, b): a.balls += b.balls; a.solids += b.solids; return a

# ---------------------------------------------------------------- weapons and props (in the hand at p; along a direction)
def sword(m, p, d=(0.15, -0.1, 1.0), L=0.75):
    p, d = Vector(p), Vector(d).normalized()
    m.solid(rbox(p + d * (0.12 + L / 2), (0.1, 0.03, L), 0.02, 1, Vector((0, 0, 1)).rotation_difference(d)), rgb('#d8dde6'))
    m.solid(rbox(p + d * 0.1, (0.3, 0.07, 0.06), 0.02, 1, Vector((0, 0, 1)).rotation_difference(d)), GOLD)
    m.solid(tube(p - d * 0.1, p + d * 0.08, 0.04, 6), LEATHER)

def long_gun(m, a, b, stock=WOOD, barrel=IRON, r=0.035):
    a, b = Vector(a), Vector(b); d = (b - a).normalized()
    m.solid(rbox(a + d * 0.3, (0.1, 0.1, 0.62), 0.03, 1, Vector((0, 0, 1)).rotation_difference(d)), stock)
    m.solid(tube(a + d * 0.45, b, r, 8), barrel)

def shield_round(m, c, r=0.4, face=TEAM, rim=METAL):
    c = Vector(c); m.solid(cyl(c, c + Vector((0, -0.12, 0)), r, r, 22), rim); m.solid(cyl(c + Vector((0, -0.03, 0)), c + Vector((0, -0.15, 0)), r * 0.87, r * 0.87, 22), face)
    m.solid(sph(c + Vector((0, -0.17, 0)), r * 0.2, (1, 0.6, 1), 10), rim)

def shield_rect(m, c, w=0.55, h=0.75):
    c = Vector(c); m.solid(rbox(c, (w, 0.1, h), 0.06), TEAM); m.solid(rbox(c + Vector((0, -0.05, 0)), (w * 0.3, 0.06, h * 0.3), 0.04), GOLD)

def banner(m, p, h=1.9, col=TEAM, w=0.55):
    p = Vector(p); m.solid(tube(p, p + Vector((0, 0, h)), 0.035, 8), WOOD)
    m.solid(rbox(p + Vector((w / 2 + 0.04, 0, h - 0.3)), (w, 0.04, 0.42), 0.03), col)
    m.solid(sph(p + Vector((0, 0, h + 0.04)), 0.06, (1, 1, 1), 8), GOLD)

def backpack(m, col=rgb('#7a5a32'), z=0.0, big=1.0):
    m.solid(rbox(Vector((0, 0.36, z + 0.85 * big)), (0.55 * big, 0.32 * big, 0.6 * big), 0.1), col)
    m.solid(rbox(Vector((0, 0.36, z + 1.2 * big)), (0.5 * big, 0.25 * big, 0.14), 0.06), rgb('#5e7a3a'))

# ---------------------------------------------------------------- foot units
def u_settler_person(name='p', hat='wide_hat'):
    m, hz = person(name, hat, rgb('#8a6a4a'), legs=rgb('#5a4a3a')); return m

def scout():
    m, hz = person('scout', 'slouch', rgb('#6e7a3e'), legs=rgb('#6a5a3a'))
    arm(m, 1, (0.4, -0.25, 0.75), sleeve=rgb('#6e7a3e')); arm(m, -1, (-0.2, -0.38, 0.9), sleeve=rgb('#6e7a3e'))
    m.solid(tube((0.42, -0.27, 0.02), (0.46, -0.3, 1.5), 0.035), WOOD)  # staff
    for x in (-0.22, -0.06): m.solid(cyl((x, -0.4, 0.9), (x, -0.56, 0.93), 0.065, 0.075, 10), BLACK)  # binoculars at the chest
    backpack(m); m.solid(rbox(Vector((0, -0.3, 0.75)), (0.5, 0.06, 0.08), 0.02), TEAM)  # sash
    return m

def migrant():
    m, hz = person('migrant', 'hair', rgb('#9a7a5a'), legs=rgb('#6a5a4a'))
    arm(m, 1, (0.5, -0.12, 0.7), sleeve=rgb('#9a7a5a')); arm(m, -1, (-0.4, 0.1, 1.1), sleeve=rgb('#9a7a5a'))
    m.solid(tube((0.52, -0.14, 0.02), (0.56, -0.18, 1.6), 0.035), WOOD)  # walking stick
    m.solid(sph(Vector((0, 0.45, 1.05)), 0.45, (1, 0.85, 1.1), 18), TEAM)  # bundle
    m.solid(tube((-0.35, 0.2, 1.4), (0.35, 0.3, 0.7), 0.05), rgb('#7a5a32'))
    return m

def commander():  # Bandleader: feathered hat, banner and a horn
    m, hz = person('commander', 'feather', TEAM, belt=GOLD)
    arm(m, -1, (-0.45, -0.15, 0.95)); arm(m, 1, (0.4, -0.3, 1.0))
    banner(m, (-0.5, -0.18, 0.1), 2.0)
    m.solid(cyl((0.4, -0.35, 1.0), (0.2, -0.55, 1.3), 0.05, 0.15, 12), GOLD)  # horn
    m.ball((0, 0.2, 0.9), 0.3, rgb('#7a2a2a'), scale=(1.25, 0.45, 1.15), kind='ELLIPSOID')  # cape
    return m

def scarecrow():  # Scarecrow Crew: a straw-stuffed figure on a pole with a pitchfork
    m, hz = person('scarecrow', 'straw', rgb('#7a8a4a'), legs=rgb('#6a5a3a'), skin=rgb('#e2c27a'), belt=rgb('#8a6a3a'))
    m.solid(tube((0, 0.15, 0.0), (0, 0.15, 1.7), 0.05), WOOD)
    for s in (-1, 1): m.ball((s * 0.42, 0, 0.95), 0.1, STRAW); arm(m, s, (s * 0.55, -0.05, 0.85), sleeve=rgb('#7a8a4a'), skin=STRAW)
    m.solid(tube((0.62, -0.08, 0.0), (0.62, -0.1, 1.85), 0.03), WOOD)
    for k in (-1, 0, 1): m.solid(cyl((0.62 + k * 0.07, -0.1, 1.85), (0.62 + k * 0.07, -0.1, 2.15), 0.02, 0.008, 6), METAL)
    m.solid(tube((0.48, -0.1, 1.85), (0.76, -0.1, 1.85), 0.025), METAL)
    m.solid(rbox(Vector((0.12, -0.31, 0.85)), (0.16, 0.04, 0.16), 0.02), rgb('#c87a3a'))  # patch
    return m

def slinger():
    m, hz = person('slinger', 'headband', TEAM, legs=rgb('#7a5a3a'))
    arm(m, 1, (0.45, -0.1, 1.55)); arm(m, -1, (-0.45, -0.2, 0.75))
    m.solid(prim_arc(Vector((0.45, -0.1, 1.85)), 0.28, 0.018, math.radians(-80), math.radians(260), qx(90), 20), rgb('#c9a46a'))  # whirling sling
    m.solid(sph(Vector((0.72, -0.1, 1.85)), 0.07, (1, 1, 1), 8), rgb('#8a8478'))
    m.solid(sph(Vector((-0.3, -0.25, 0.62)), 0.13, (1, 0.8, 1), 10), LEATHER)  # stone pouch
    return m

def swordsman():
    m, hz = person('swordsman', 'roman', TEAM, legs=rgb('#7a5a3a'), belt=GOLD)
    arm(m, 1, (0.5, -0.2, 0.75)); arm(m, -1, (-0.45, -0.3, 0.8))
    sword(m, (0.5, -0.25, 0.75), (0.25, -0.15, 1.0))
    shield_rect(m, (-0.52, -0.42, 0.8))
    return m

def crossbowman():
    m, hz = person('crossbowman', 'kettle', TEAM, legs=NAVY)
    arm(m, 1, (0.2, -0.45, 0.85)); arm(m, -1, (-0.2, -0.5, 1.0))
    m.solid(rbox(Vector((0.0, -0.5, 0.95)), (0.12, 0.75, 0.12), 0.03, 1, qx(-12)), WOOD)  # stock, pointing at the camera
    m.solid(prim_arc(Vector((0, -0.98, 1.03)), 0.42, 0.035, math.radians(20), math.radians(160), qx(-12), 16), IRON)
    m.solid(tube((-0.39, -0.83, 1.06), (0.39, -0.83, 1.06), 0.01, 4), CREAM)
    m.solid(rbox(Vector((0.3, 0.25, 0.7)), (0.16, 0.16, 0.5), 0.05), LEATHER)  # bolt case
    return m

def pikeman():
    m, hz = person('pikeman', 'morion', TEAM, legs=rgb('#8a2a2a'))
    arm(m, 1, (0.45, -0.15, 0.75)); arm(m, -1, (0.1, -0.3, 1.15))
    m.solid(tube((0.48, -0.17, 0.02), (0.1, -0.35, 3.1), 0.035), WOOD)
    m.solid(cyl((0.1, -0.35, 3.1), (0.085, -0.36, 3.4), 0.07, 0.0, 8), METAL)
    m.ball((0, -0.05, 0.85), 0.35, STEEL, scale=(1.05, 0.9, 0.7), kind='ELLIPSOID')  # breastplate
    return m

def musketman():
    m, hz = person('musketman', 'tricorn', TEAM, legs=CREAM, boots=BLACK, belt=WHITE)
    arm(m, 1, (0.4, -0.2, 0.7)); arm(m, -1, (0.25, -0.25, 1.25))
    long_gun(m, (0.45, -0.22, 0.45), (0.15, -0.3, 2.1))
    for s in (-1, 1): m.solid(rbox(Vector((s * 0.18, -0.29, 0.75)), (0.06, 0.03, 0.55), 0.015, 1, qy(s * 25)), WHITE)  # crossbelts
    return m

def rifleman():
    m, hz = person('rifleman', 'shako', TEAM, legs=WHITE, boots=BLACK, belt=WHITE)
    arm(m, 1, (0.42, -0.15, 0.7)); arm(m, -1, (-0.3, -0.25, 0.95))
    long_gun(m, (0.45, -0.17, 0.4), (0.5, -0.2, 2.2))
    m.solid(cyl((0.5, -0.2, 2.2), (0.5, -0.2, 2.45), 0.025, 0.0, 6), METAL)  # bayonet
    return m

def infantry():
    m, hz = person('infantry', 'brodie', KHAKI, legs=KHAKI, boots=rgb('#5a4028'))
    arm(m, 1, (0.4, -0.2, 0.75), sleeve=KHAKI); arm(m, -1, (0.1, -0.35, 1.1), sleeve=KHAKI)
    long_gun(m, (0.42, -0.22, 0.45), (0.0, -0.38, 2.0))
    m.solid(rbox(Vector((0, -0.29, 0.62)), (0.6, 0.06, 0.12), 0.03), rgb('#6a5a32'))
    m.solid(rbox(Vector((0.0, -0.31, 0.95)), (0.18, 0.04, 0.12), 0.02), TEAM)  # armband badge
    return m

def machine_gun():
    m, hz = person('machine_gun', 'army', TEAM, legs=OLIVE, boots=BLACK, kneel=True)
    arm(m, 1, (0.25, -0.55, 0.7)); arm(m, -1, (-0.15, -0.6, 0.75))
    g = Vector((0.05, -0.75, 0.62))
    m.solid(rbox(g, (0.22, 0.5, 0.2), 0.04), DARK); m.solid(tube(g + Vector((0, -0.2, 0.02)), g + Vector((0, -0.95, 0.06)), 0.045), IRON)
    m.solid(tube(g + Vector((0, -0.55, 0.05)), g + Vector((0, -0.85, 0.06)), 0.075, 12), DARK)  # cooling jacket
    m.solid(rbox(g + Vector((0.18, 0.05, -0.02)), (0.14, 0.2, 0.16), 0.03), OLIVE)  # ammo box
    for a in (0, 130, 230):
        r = math.radians(a); m.solid(tube(g, Vector((g.x + math.sin(r) * 0.35, g.y - math.cos(r) * 0.3, 0.0)), 0.025, 6), DARK)
    return m

def special_forces():
    m, hz = person('special_forces', 'goggles', OLIVE2, legs=OLIVE2, boots=BLACK, belt=BLACK)
    m.ball((0, -0.05, 0.85), 0.36, rgb('#3a4228'), scale=(1.05, 0.9, 0.75), kind='ELLIPSOID')  # vest
    arm(m, 1, (0.3, -0.42, 0.85), sleeve=OLIVE2); arm(m, -1, (-0.2, -0.45, 1.0), sleeve=OLIVE2)
    m.solid(rbox(Vector((0.08, -0.55, 1.0)), (0.12, 0.8, 0.18), 0.03, 1, qx(-30)), BLACK)  # assault rifle
    m.solid(rbox(Vector((0.08, -0.5, 0.8)), (0.1, 0.12, 0.28), 0.03, 1, qx(-10)), BLACK)
    m.solid(rbox(Vector((0, -0.33, 0.95)), (0.2, 0.04, 0.12), 0.02), TEAM)  # patch
    return m

def great(name, hat, top, face=None, extra=None, legs=PANTS, belt=LEATHER, skin=SKIN):
    m, hz = person(name, hat, top, legs=legs, belt=belt, skin=skin, face=face)
    if extra: extra(m)
    return m

def beard(col, long=False):
    def f(m, hz):
        m.solid(sph(Vector((0, -0.32, hz - 0.36 - (0.12 if long else 0))), 0.34 if long else 0.24, (1.0, 0.7, 1.4 if long else 0.9), 16), col)
        m.solid(sph(Vector((0, -0.48, hz - 0.17)), 0.1, (1.6, 0.6, 0.5), 10), col)  # moustache
    return f

def glasses(m, hz):
    for s in (-1, 1): m.solid(prim_arc(Vector((s * 0.18, -0.53, hz - 0.03)), 0.12, 0.022, 0, 2 * math.pi, qz(0), 24), BLACK)
    m.solid(tube((-0.06, -0.53, hz - 0.02), (0.06, -0.53, hz - 0.02), 0.018, 4), BLACK)

def great_prophet():
    def ex(m):
        arm(m, -1, (-0.5, -0.15, 1.3), sleeve=rgb('#2a6ab0')); arm(m, 1, (0.45, -0.2, 0.8), sleeve=rgb('#2a6ab0'))
        m.solid(tube((-0.52, -0.16, 0.02), (-0.55, -0.18, 2.1), 0.045), WOOD); m.solid(sph(Vector((-0.55, -0.18, 2.15)), 0.12, (1, 1, 1), 10), WOOD)
        m.ball((0, 0, 0.45), 0.42, rgb('#2a6ab0'), scale=(1.0, 0.9, 0.9), kind='ELLIPSOID')  # robe
        m.solid(rbox(Vector((0, -0.33, 0.7)), (0.12, 0.04, 0.7), 0.02), TEAM)  # stole
    return great('great_prophet', 'prophet', rgb('#2a6ab0'), beard(rgb('#f2f0ea'), True), ex, legs=rgb('#2a6ab0'))

def great_scientist():
    def ex(m):
        arm(m, 1, (0.35, -0.4, 1.15), sleeve=WHITE); arm(m, -1, (-0.4, -0.25, 0.85), sleeve=WHITE)
        m.solid(cyl((0.35, -0.45, 1.15), (0.45, -0.85, 1.4), 0.05, 0.08, 10), GOLD)  # spyglass
        m.solid(cyl((-0.45, -0.3, 0.7), (-0.45, -0.3, 0.98), 0.08, 0.05, 10), rgb('#5ad0a0'))  # flask
        m.solid(rbox(Vector((0, -0.31, 0.95)), (0.14, 0.04, 0.14), 0.02), TEAM)
    def face(m, hz):
        glasses(m, hz)
        for s in (-1, 1): m.solid(sph(Vector((s * 0.43, 0.1, hz + 0.05)), 0.17, (0.8, 1.2, 1.0), 12), rgb('#d8d4cc'))  # grey side hair
    return great('great_scientist', 'bald', WHITE, face, ex, belt=None)

def great_engineer():
    def ex(m):
        arm(m, 1, (0.45, -0.25, 0.85), sleeve=rgb('#3a5a9a')); arm(m, -1, (-0.45, -0.25, 0.85), sleeve=rgb('#3a5a9a'))
        m.solid(tube((0.47, -0.28, 0.7), (0.5, -0.32, 1.25), 0.035, 6), METAL); m.solid(prim_arc(Vector((0.5, -0.32, 1.33)), 0.08, 0.03, math.radians(-60), math.radians(240), qx(90), 10), METAL)
        m.solid(rbox(Vector((-0.5, -0.3, 0.8)), (0.32, 0.06, 0.42), 0.03), rgb('#3a7ac8'))  # blueprint
        m.solid(rbox(Vector((0, -0.3, 0.62)), (0.62, 0.06, 0.14), 0.03), rgb('#8a5a32'))  # tool belt
    return great('great_engineer', 'cap', TEAM, None, ex, legs=rgb('#3a5a9a'))

def great_merchant():
    def ex(m):
        arm(m, 1, (0.42, -0.3, 0.75)); arm(m, -1, (-0.45, -0.2, 0.9))
        m.solid(sph(Vector((0.45, -0.42, 0.6)), 0.22, (1, 1, 1.1), 14), rgb('#c9a05a')); m.solid(tube((0.45, -0.42, 0.78), (0.45, -0.42, 0.86), 0.06, 8), RED)  # coin bag
        m.solid(rbox(Vector((-0.55, -0.15, 0.25)), (0.4, 0.3, 0.3), 0.05), rgb('#8a5a32')); m.solid(rbox(Vector((-0.55, -0.15, 0.42)), (0.36, 0.26, 0.06), 0.03), GOLD)  # chest
        m.ball((0, 0, 0.5), 0.42, TEAM, scale=(1.0, 0.9, 0.8), kind='ELLIPSOID')
    return great('great_merchant', 'turban', TEAM, beard(rgb('#3a2414')), ex, belt=GOLD)

def great_artist():
    def ex(m):
        arm(m, 1, (0.45, -0.3, 1.2), sleeve=rgb('#e8e0d0')); arm(m, -1, (-0.4, -0.3, 0.85), sleeve=rgb('#e8e0d0'))
        m.solid(tube((0.45, -0.32, 1.1), (0.55, -0.4, 1.6), 0.025, 6), WOOD); m.solid(sph(Vector((0.56, -0.41, 1.63)), 0.05, (1, 1, 1.4), 8), RED)
        m.solid(cyl((-0.5, -0.35, 0.85), (-0.5, -0.43, 0.85), 0.3, 0.3, 18), rgb('#c9a46a'))  # palette
        for i, c in enumerate(('#d83a3a', '#3a7ad8', '#f0c83a', '#3ab05a')):
            a = 0.5 + i * 0.8; m.solid(sph(Vector((-0.5 + math.cos(a) * 0.17, -0.45, 0.85 + math.sin(a) * 0.17)), 0.055, (1, 0.5, 1), 8), rgb(c))
        m.solid(rbox(Vector((0, -0.31, 1.05)), (0.3, 0.04, 0.1), 0.02, 1, qy(20)), TEAM)  # scarf
    return great('great_artist', 'beret', rgb('#e8e0d0'), None, ex)

def great_general():
    def ex(m):
        arm(m, -1, (-0.45, -0.2, 0.9)); arm(m, 1, (0.45, -0.25, 0.8))
        banner(m, (-0.5, -0.22, 0.1), 2.2)
        sword(m, (0.47, -0.3, 0.75), (0.1, -0.2, 1.0), 0.6)
        m.ball((0, 0.22, 0.85), 0.32, RED, scale=(1.3, 0.45, 1.2), kind='ELLIPSOID')  # cape
        m.ball((0, -0.05, 0.85), 0.35, GOLD, scale=(1.05, 0.9, 0.7), kind='ELLIPSOID')
    return great('great_general', 'general', TEAM, None, ex, belt=GOLD)

def great_admiral():
    def ex(m):
        arm(m, 1, (0.3, -0.45, 1.25), sleeve=NAVY); arm(m, -1, (-0.45, -0.3, 0.75), sleeve=NAVY)
        m.solid(cyl((0.3, -0.48, 1.25), (0.35, -0.9, 1.4), 0.05, 0.08, 10), GOLD)
        m.solid(prim_arc(Vector((-0.55, -0.35, 0.6)), 0.25, 0.03, 0, 2 * math.pi, qz(0), 24), WOOD)  # ship's wheel
        for k in range(4):
            a = k * math.pi / 4; m.solid(tube(Vector((-0.55 - math.cos(a) * 0.32, -0.35, 0.6 - math.sin(a) * 0.32)), Vector((-0.55 + math.cos(a) * 0.32, -0.35, 0.6 + math.sin(a) * 0.32)), 0.02, 5), WOOD)
        for s in (-1, 1): m.solid(sph(Vector((s * 0.34, -0.05, 1.0)), 0.13, (1, 1, 0.5), 10), GOLD)  # epaulettes
    return great('great_admiral', 'admiral', NAVY, None, ex, legs=WHITE, belt=GOLD)

def missionary():
    def ex(m):
        arm(m, 1, (0.4, -0.35, 0.95), sleeve=rgb('#6a4a3a')); arm(m, -1, (-0.4, -0.3, 0.9), sleeve=rgb('#6a4a3a'))
        m.solid(rbox(Vector((0, -0.48, 0.95)), (0.5, 0.12, 0.38), 0.03), rgb('#7a2a2a')); m.solid(rbox(Vector((0, -0.55, 0.95)), (0.06, 0.02, 0.24), 0.0), GOLD)
        m.solid(rbox(Vector((0, -0.55, 1.0)), (0.16, 0.02, 0.06), 0.0), GOLD)
        m.ball((0, 0, 0.45), 0.42, rgb('#6a4a3a'), scale=(1.0, 0.9, 0.9), kind='ELLIPSOID')
        m.solid(rbox(Vector((0, -0.33, 0.62)), (0.62, 0.05, 0.1), 0.02), TEAM)
    return great('missionary', 'wide_hat', rgb('#6a4a3a'), None, ex, legs=rgb('#6a4a3a'), belt=None)

# ---------------------------------------------------------------- riders and mounts (along +x)
def rider(name, hat, top=TEAM, weapon=None, legs=PANTS):
    r, hz = person(name, hat, top, legs=legs, sitting=True)
    arm(r, 1, (0.45, -0.3, 0.75)); arm(r, -1, (-0.4, -0.3, 0.85))
    if weapon: weapon(r)
    turn(r, qz(90), (0.0, 0, 1.38), 0.72)
    return r

def knight():
    m = horse(rgb('#e8e2d8'), rgb('#bfb4a0'), 'knight')
    m.ball((-0.05, 0, 1.15), 0.62, TEAM, scale=(1.5, 0.9, 0.55), kind='ELLIPSOID')  # caparison
    r = rider('kr', 'great_helm', STEEL, lambda r: r.solid(cyl((0.47, -0.32, 0.6), (0.6, -0.9, 2.3), 0.07, 0.025, 10), WOOD))
    shield_round(r, (-0.5, -0.32, 0.85), 0.36)
    merge(m, r); m.ball((-0.05, 0, 1.6), 0.45, GOLD, scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')
    return m

def cavalry():
    m = horse(rgb('#5a3a22'), rgb('#22160e'), 'cavalry')
    r = rider('cr', 'shako', TEAM, lambda r: sword(r, (0.45, -0.32, 0.75), (0.2, -0.3, 1.0), 0.75), legs=WHITE)
    merge(m, r); m.ball((-0.05, 0, 1.6), 0.45, TEAM, scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')
    return m

def camel(name='camel'):
    m = Model(name); col, dark = rgb('#d0a464'), rgb('#9a7442')
    z = M.quadruped(m, col, dark, col, rgb('#5a4630'), legs=0.95, thick=0.85)
    m.ball((0.0, 0, z + 0.5), 0.42, col)  # hump
    m.capsule((0.75, 0, z + 0.1), (1.15, 0, z + 0.9), 0.2, col)
    hd = Vector((1.35, 0, z + 0.95)); m.ball(hd, 0.26, col, scale=(1.5, 0.85, 0.85), kind='ELLIPSOID')
    M.eyes(m, hd.x + 0.05, 0.17, hd.z + 0.08, 0.055)
    m.capsule((-0.95, 0, z + 0.1), (-1.1, 0, z - 0.4), 0.06, dark)
    return m, z

def caravan():
    m, z = camel('caravan')
    for s in (-1, 1):
        for k, c in enumerate((TEAM, rgb('#e8b84a'), rgb('#3a8ac8'))):
            m.solid(cyl((-0.45 + k * 0.32, s * 0.42, z + 0.25), (-0.45 + k * 0.32, s * 0.62, z + 0.25), 0.15, 0.15, 14), c)  # cloth rolls
    m.solid(rbox(Vector((0.0, 0, z + 0.95)), (0.5, 0.5, 0.25), 0.08), rgb('#8a5a32'))
    p, hz = person('cp', 'turban', rgb('#e8d8b0'), legs=rgb('#8a6a4a'))
    arm(p, 1, (0.45, -0.2, 0.9), sleeve=rgb('#e8d8b0')); arm(p, -1, (-0.4, -0.2, 0.8), sleeve=rgb('#e8d8b0'))
    turn(p, qz(-60), (1.5, -0.9, 0), 0.6); merge(m, p)
    return m

def settler():  # covered wagon pulled by an ox, a settler walking beside it
    m = cow(rgb('#8a5a32'), None, 'settler'); scaled(m, 0.75, (1.0, 0, 0))
    wheel(m, (-0.55, -0.55, 0.38), 0.38, 0.1); wheel(m, (-0.55, 0.55, 0.38), 0.38, 0.1)
    wheel(m, (-1.55, -0.55, 0.38), 0.38, 0.1); wheel(m, (-1.55, 0.55, 0.38), 0.38, 0.1)
    m.solid(rbox(Vector((-1.05, 0, 0.62)), (1.35, 1.0, 0.3), 0.06), WOOD)
    m.solid(cyl((-1.75, 0, 0.95), (-0.35, 0, 0.95), 0.55, 0.55, 20), CREAM)  # canvas
    for x in (-1.6, -1.05, -0.5): m.solid(tube((x - 0.04, 0, 0.95), (x + 0.04, 0, 0.95), 0.57, 20), TEAM)  # hoops
    m.solid(tube((-0.35, 0, 0.6), (0.4, 0, 0.75), 0.04), WOOD)
    p = u_settler_person('sp'); arm(p, 1, (0.45, -0.2, 0.75), sleeve=rgb('#8a6a4a')); arm(p, -1, (-0.45, -0.1, 0.85), sleeve=rgb('#8a6a4a'))
    turn(p, qz(-60), (-0.6, -1.25, 0), 0.62); merge(m, p)
    return m

def crew(m, hat, at, k=0.5, top=TEAM, legs=PANTS, yaw=-60):
    p, hz = person('crew', hat, top, legs=legs)
    arm(p, 1, (0.45, -0.25, 0.85), sleeve=top); arm(p, -1, (-0.45, -0.25, 0.85), sleeve=top)
    turn(p, qz(yaw), at, k); merge(m, p)

# ---------------------------------------------------------------- siege and vehicles (along +x)
def catapult():
    m = Model('catapult')
    for x in (-0.7, 0.7):
        for y in (-0.55, 0.55): wheel(m, (x, y, 0.3), 0.3, 0.12)
    m.solid(rbox(Vector((0, 0, 0.45)), (1.9, 0.9, 0.18), 0.05), WOOD)
    for y in (-0.35, 0.35): m.solid(rbox(Vector((0.1, y, 0.95)), (0.14, 0.14, 0.9), 0.04, 1, qy(-20)), WOOD)
    m.solid(tube((0.25, -0.45, 1.3), (0.25, 0.45, 1.3), 0.08), rgb('#6a4a2a'))
    m.solid(rbox(Vector((-0.35, 0, 1.0)), (1.3, 0.12, 0.12), 0.04, 1, qy(28)), WOOD)  # throwing arm
    m.solid(sph(Vector((-0.95, 0, 0.72)), 0.22, (1, 1, 0.6), 14), LEATHER); m.solid(sph(Vector((-0.95, 0, 0.85)), 0.15, (1, 1, 1), 10), GREY)
    m.solid(cyl((0.5, -0.5, 0.95), (0.5, 0.5, 0.95), 0.12, 0.12, 12), WOOD)
    m.solid(rbox(Vector((0.85, 0, 0.6)), (0.14, 0.8, 0.12), 0.03), TEAM)
    crew(m, 'helmet', (1.25, -0.75, 0), 0.5)
    return m

def cannon_barrel(m, a, b, r0, r1, col=BRONZE):
    a, b = Vector(a), Vector(b); m.solid(cyl(a, b, r0, r1, 18), col); m.solid(sph(a, r0 * 0.95, (1, 1, 1), 14), col)
    d = (b - a).normalized(); m.solid(tube(b - d * 0.08, b + d * 0.04, r1 * 1.18, 18), col)
    m.solid(cyl(b, b + d * 0.01, r1 * 0.65, r1 * 0.65, 14), BLACK)

def bombard():
    m = Model('bombard')
    m.solid(rbox(Vector((0, 0, 0.35)), (1.5, 0.8, 0.3), 0.06), WOOD)
    for x in (-0.5, 0.5):
        for y in (-0.48, 0.48): wheel(m, (x, y, 0.28), 0.26, 0.12)
    cannon_barrel(m, (-0.6, 0, 0.75), (0.9, 0, 0.9), 0.38, 0.32)
    m.solid(tube((-0.2, 0, 0.78), (-0.1, 0, 0.8), 0.42, 18), IRON); m.solid(tube((0.4, 0, 0.84), (0.5, 0, 0.86), 0.36, 18), IRON)
    m.solid(rbox(Vector((-0.2, 0.0, 0.5)), (0.5, 0.86, 0.1), 0.03), TEAM)
    crew(m, 'helmet', (-1.0, -0.7, 0), 0.5)
    return m

def field_cannon():
    m = Model('field_cannon')
    for y in (-0.5, 0.5): wheel(m, (0.1, y, 0.5), 0.5, 0.1, RED, DARK)
    m.solid(rbox(Vector((-0.5, 0, 0.42)), (1.4, 0.3, 0.16), 0.05, 1, qy(15)), RED)  # trail
    m.solid(tube((0.1, -0.45, 0.5), (0.1, 0.45, 0.5), 0.05), DARK)
    cannon_barrel(m, (-0.2, 0, 0.75), (1.0, 0, 0.82), 0.16, 0.12, rgb('#3a3e46'))
    m.solid(rbox(Vector((-0.1, 0, 0.62)), (0.5, 0.26, 0.1), 0.03), TEAM)
    crew(m, 'tricorn', (-1.0, -0.65, 0), 0.5)
    return m

def artillery():
    m = Model('artillery')
    for y in (-0.55, 0.55): wheel(m, (0.0, y, 0.45), 0.45, 0.18, rgb('#2a2a2a'), OLIVE)
    m.solid(rbox(Vector((0.0, 0, 0.7)), (0.5, 1.0, 0.35), 0.06), OLIVE)  # shield
    for s in (-1, 1): m.solid(rbox(Vector((-0.75, s * 0.25, 0.3)), (1.3, 0.12, 0.12), 0.04, 1, qz(s * 12) @ qy(18)), OLIVE2)  # split trails
    m.solid(rbox(Vector((0.1, 0, 0.85)), (0.8, 0.28, 0.28), 0.06), OLIVE)
    m.solid(cyl((0.4, 0, 0.88), (1.45, 0, 1.15), 0.09, 0.07, 14), OLIVE2); m.solid(tube((1.4, 0, 1.14), (1.5, 0, 1.16), 0.1, 12), DARK)
    m.solid(cyl((0.0, -0.51, 0.75), (0.0, -0.53, 0.75), 0.15, 0.15, 16), TEAM)  # roundel on the shield
    crew(m, 'army', (-1.1, -0.75, 0), 0.5, OLIVE, OLIVE)
    return m

def tracks(m, L, y, h=0.38, w=0.32, col=rgb('#3a3a3a')):
    m.solid(rbox(Vector((0, y, h / 2 + 0.02)), (L, w, h), h * 0.45, 3), col)
    for k in range(5): m.solid(cyl((-L * 0.36 + k * L * 0.18, y - w / 2 - 0.02, h / 2 + 0.02), (-L * 0.36 + k * L * 0.18, y - w / 2 + 0.01, h / 2 + 0.02), h * 0.36, h * 0.36, 14), rgb('#6a6a62'))

def tank():
    m = Model('tank'); body = rgb('#6f8a3c')
    for y in (-0.5, 0.5): tracks(m, 1.9, y)
    m.solid(rbox(Vector((0, 0, 0.5)), (1.8, 1.0, 0.36), 0.12, 3), body)
    m.solid(sph(Vector((-0.05, 0, 0.7)), 0.48, (1.15, 1.0, 0.62), 22), body)  # turret
    m.solid(sph(Vector((-0.05, 0, 0.98)), 0.15, (1, 1, 0.5), 12), OLIVE2)  # hatch
    m.solid(tube((0.35, 0, 0.8), (1.35, 0, 0.84), 0.07, 12), OLIVE2); m.solid(tube((1.3, 0, 0.84), (1.4, 0, 0.84), 0.1, 12), OLIVE2)
    m.solid(cyl((-0.05, -0.52, 0.72), (-0.05, -0.56, 0.72), 0.16, 0.16, 18), TEAM); m.solid(cyl((-0.05, -0.55, 0.72), (-0.05, -0.57, 0.72), 0.08, 0.08, 12), GOLD)
    return m

def modern_armor():
    m = Model('modern_armor'); body = rgb('#7a8a52')
    for y in (-0.55, 0.55): tracks(m, 2.1, y, 0.34, 0.34, rgb('#2a2a2a'))
    m.solid(rbox(Vector((0, 0, 0.5)), (2.1, 1.2, 0.3), 0.08, 2), body)
    m.solid(rbox(Vector((1.0, 0, 0.45)), (0.3, 1.1, 0.22), 0.08, 2, qy(-25)), body)  # sloped glacis
    m.solid(rbox(Vector((-0.15, 0, 0.8)), (1.0, 0.9, 0.3), 0.1, 2), rgb('#8a9a62'))  # wedge turret
    m.solid(tube((0.35, 0, 0.82), (1.75, 0, 0.82), 0.065, 12), OLIVE2); m.solid(tube((0.9, 0, 0.82), (1.1, 0, 0.82), 0.09, 12), OLIVE2)
    m.solid(rbox(Vector((-0.4, 0, 1.0)), (0.3, 0.25, 0.12), 0.04), OLIVE2)
    m.solid(rbox(Vector((-0.15, -0.46, 0.8)), (0.5, 0.04, 0.12), 0.02), TEAM)  # stripe
    return m

def mech_infantry():  # an armoured personnel carrier with a soldier up in the hatch
    m = Model('mech_infantry'); body = rgb('#6a7a44')
    for x in (-0.6, 0.0, 0.6):
        for y in (-0.55, 0.55): wheel(m, (x, y, 0.28), 0.28, 0.18, rgb('#2a2a2a'), OLIVE)
    m.solid(rbox(Vector((0, 0, 0.62)), (1.8, 1.0, 0.5), 0.12, 3), body)
    m.solid(rbox(Vector((0.85, 0, 0.6)), (0.3, 0.95, 0.4), 0.1, 2, qy(-30)), body)
    m.solid(rbox(Vector((0.0, -0.51, 0.7)), (1.2, 0.04, 0.12), 0.02), TEAM)
    p, hz = person('mp', 'army', OLIVE, legs=OLIVE); arm(p, 1, (0.45, -0.2, 0.9), sleeve=OLIVE); arm(p, -1, (-0.45, -0.2, 0.9), sleeve=OLIVE)
    p.solid(rbox(Vector((0.3, -0.45, 1.0)), (0.1, 0.6, 0.14), 0.03, 1, qx(-20)), BLACK)
    turn(p, qz(-90), (-0.2, 0, 0.35), 0.55); merge(m, p)
    m.solid(cyl((-0.2, 0, 0.85), (-0.2, 0, 0.9), 0.3, 0.3, 18), OLIVE2)  # hatch ring
    return m

def rocket_artillery():  # a truck with a rocket pod
    m = Model('rocket_artillery'); body = rgb('#6a8a3a')
    for x in (-0.75, -0.25, 0.65):
        for y in (-0.5, 0.5): wheel(m, (x, y, 0.28), 0.28, 0.2, rgb('#2a2a2a'), GREY)
    m.solid(rbox(Vector((0, 0, 0.55)), (2.0, 0.9, 0.18), 0.05), rgb('#3a3a3a'))
    m.solid(rbox(Vector((0.75, 0, 0.85)), (0.55, 0.9, 0.6), 0.12, 3), body)  # cab
    m.solid(rbox(Vector((0.9, 0, 0.98)), (0.3, 0.8, 0.22), 0.05, 1), rgb('#8fd0e8'))  # windscreen
    m.solid(rbox(Vector((-0.4, 0, 1.05)), (1.1, 0.8, 0.5), 0.08, 2, qy(-18)), body)  # pod
    for i in range(3):
        for j in range(2): m.solid(cyl((0.12, -0.25 + i * 0.25, 1.12 + j * 0.2), (0.16, -0.25 + i * 0.25, 1.13 + j * 0.2), 0.08, 0.08, 12), RED)
    m.solid(rbox(Vector((-0.4, -0.41, 1.0)), (0.5, 0.04, 0.12), 0.02, 1, qy(-18)), TEAM)
    return m

# ---------------------------------------------------------------- ships (along +x, the keel at the bottom)
def hull(m, L, W, H, col, rim=None, bow=0.35, stern=0.12, sheer=0.12):
    """a lofted hull: U-shaped sections, pointed bow at +x, a rising sheer at both ends"""
    rings = []; n = 14
    for i in range(n + 1):
        t = i / n; x = -L / 2 + L * t
        w = W / 2 * (1 - max(0, (t - (1 - bow)) / bow) ** 1.6) * (1 - max(0, (stern - t) / stern) ** 2 * 0.5)
        w = max(w, 0.01); top = H + sheer * (abs(t - 0.5) * 2) ** 2; keel = H * 0.15 * (1 - (abs(t - 0.45) * 2) ** 2)
        ring = []
        for k in range(12):
            a = math.pi * k / 11; ring.append(Vector((x, -math.cos(a) * w, top - math.sin(a) * (top - keel) if k not in (0, 11) else top)))
        rings.append(ring)
    m.solid(B.loft(rings, smooth=True), col)
    m.solid(rbox(Vector((-L * 0.06, 0, H - 0.05)), (L * 0.78, W * 0.82, 0.05), 0.02, 1), rgb('#c8a46a'))  # deck
    if rim: m.solid(B.loft([[Vector((r[0].x, r[0].y - 0.02, r[0].z - 0.06)) for r in rings] + [Vector((r[-1].x, r[-1].y + 0.02, r[-1].z - 0.06)) for r in reversed(rings)],
                            [Vector((r[0].x, r[0].y - 0.02, r[0].z + 0.02)) for r in rings] + [Vector((r[-1].x, r[-1].y + 0.02, r[-1].z + 0.02)) for r in reversed(rings)]], False, False), rim)  # gunwale band

def sail(m, x, z, w, h, col, y=0.0, belly=0.12):
    rings = []
    for j in range(5):
        v = j / 4; zz = z + h * v; b = belly * math.sin(math.pi * v)
        rings.append([Vector((x + b, y - w / 2 + w * i / 6, zz)) for i in range(7)])
    bm = bmesh.new(); V = [[bm.verts.new(p) for p in r] for r in rings]
    for a, b2 in zip(V, V[1:]):
        for i in range(6): bm.faces.new((a[i], a[i + 1], b2[i + 1], b2[i]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.03)
    me = bpy.data.meshes.new('sail'); bm.to_mesh(me); bm.free(); m.solid(M.new_obj(me), col)

def mast(m, x, h, z0=0.5): m.solid(tube((x, 0, z0), (x, 0, z0 + h), 0.05, 8), WOOD)

def galley():
    m = Model('galley'); hull(m, 2.6, 0.8, 0.55, rgb('#9a6a3a'), rgb('#6a4422'), sheer=0.25)
    for k in range(6):
        x = -0.85 + k * 0.32
        for s in (-1, 1): m.solid(tube((x, s * 0.36, 0.48), (x - 0.08, s * 0.72, 0.22), 0.025, 5), WOOD)
    mast(m, 0.0, 1.6); sail(m, 0.05, 0.9, 1.1, 1.0, TEAM)
    m.solid(rbox(Vector((0.05, 0, 1.4)), (0.08, 1.15, 0.06), 0.02), CREAM)  # stripe yard
    m.solid(cyl((1.3, 0, 0.18), (1.55, 0, 0.18), 0.08, 0.02, 8), BRONZE)  # ram
    m.solid(sph(Vector((1.05, -0.22, 0.48)), 0.08, (0.4, 1, 1), 10), WHITE); m.solid(sph(Vector((1.06, -0.25, 0.48)), 0.045, (0.4, 1, 1), 8), EYE)  # painted eye
    return m

def caravel():
    m = Model('caravel'); hull(m, 2.6, 1.0, 0.7, rgb('#8a5a32'), GOLD, sheer=0.3)
    m.solid(rbox(Vector((-1.0, 0, 0.95)), (0.7, 0.85, 0.35), 0.05), rgb('#7a4a28'))  # aft castle
    m.solid(rbox(Vector((-1.0, -0.43, 0.95)), (0.7, 0.02, 0.1), 0.0), TEAM)
    for x, h, w in ((-0.55, 1.8, 0.8), (0.15, 2.2, 1.0), (0.85, 1.6, 0.7)):
        mast(m, x, h, 0.6); sail(m, x + 0.04, 1.05, w, h * 0.5, WHITE)
        m.solid(rbox(Vector((x + 0.1, 0, 1.05 + h * 0.25)), (0.03, 0.2, 0.2), 0.0), TEAM)  # cross on the sail
        m.solid(rbox(Vector((x + 0.1, 0, 1.05 + h * 0.25)), (0.03, 0.06, 0.45), 0.0), TEAM)
    m.solid(rbox(Vector((0.15 + 0.18, 0, 2.85)), (0.35, 0.03, 0.2), 0.02), TEAM)  # pennant
    m.solid(tube((1.2, 0, 0.75), (1.8, 0, 1.0), 0.035, 6), WOOD)  # bowsprit
    return m

def ironclad():
    m = Model('ironclad'); hull(m, 2.6, 1.0, 0.45, rgb('#3a4a62'), GOLD, sheer=0.05, bow=0.25)
    m.solid(rbox(Vector((-0.1, 0, 0.6)), (1.2, 0.75, 0.35), 0.08, 2), rgb('#4a5a72'))  # casemate
    for s in (-1, 1):
        for x in (-0.4, 0.2): m.solid(tube((x, s * 0.36, 0.6), (x, s * 0.48, 0.6), 0.06, 10), DARK)
    m.solid(cyl((0.0, 0, 0.75), (0.0, 0, 1.5), 0.16, 0.16, 16), BLACK)  # funnel
    m.solid(tube((0.0, 0, 1.2), (0.0, 0, 1.32), 0.17, 16), TEAM)
    m.solid(tube((-0.8, 0, 0.6), (-0.8, 0, 1.4), 0.03, 6), DARK); m.solid(rbox(Vector((-0.65, 0, 1.3)), (0.3, 0.02, 0.18), 0.02), TEAM)
    return m

def turret(m, x, z, r=0.22, L=0.6, col=GREY, n=2, back=False):
    m.solid(sph(Vector((x, 0, z)), r, (1.2, 1.0, 0.6), 18), col)
    d = -1 if back else 1
    for y in ([0.0] if n == 1 else [-0.06, 0.06]): m.solid(tube((x + d * r * 0.6, y, z + 0.04), (x + d * (r + L), y, z + 0.06), 0.035, 8), DARK)

def battleship():
    m = Model('battleship'); g = rgb('#8a929e'); hull(m, 3.0, 0.9, 0.45, g, TEAM, sheer=0.06, bow=0.3)
    m.solid(rbox(Vector((0, 0, 0.62)), (1.4, 0.6, 0.3), 0.06), rgb('#a2aab4'))
    m.solid(rbox(Vector((0.1, 0, 0.95)), (0.6, 0.45, 0.4), 0.06), rgb('#b2bac4'))  # bridge
    m.solid(rbox(Vector((0.2, -0.23, 1.05)), (0.4, 0.02, 0.06), 0.0), DARK)
    for x in (-0.35, -0.05): m.solid(cyl((x, 0, 0.75), (x, 0, 1.3), 0.13, 0.12, 14), rgb('#6a727e')); m.solid(tube((x, 0, 1.2), (x, 0, 1.3), 0.135, 14), BLACK)
    m.solid(tube((0.15, 0, 1.15), (0.15, 0, 1.8), 0.03, 6), DARK)
    turret(m, 0.95, 0.55); turret(m, 0.6, 0.72, 0.2, 0.5); turret(m, -0.95, 0.55, back=True)
    return m

def destroyer():
    m = Model('destroyer'); g = rgb('#5a7ab0'); hull(m, 2.8, 0.7, 0.4, g, TEAM, sheer=0.08, bow=0.35)
    m.solid(rbox(Vector((0.2, 0, 0.6)), (0.6, 0.45, 0.4), 0.06), rgb('#7a9ac8'))
    m.solid(rbox(Vector((0.3, -0.23, 0.72)), (0.35, 0.02, 0.06), 0.0), DARK)
    m.solid(cyl((-0.35, 0, 0.5), (-0.35, 0, 1.05), 0.12, 0.1, 14), rgb('#4a6aa0')); m.solid(tube((-0.35, 0, 0.98), (-0.35, 0, 1.05), 0.105, 14), BLACK)
    m.solid(tube((0.25, 0, 0.8), (0.25, 0, 1.5), 0.025, 6), DARK); m.solid(rbox(Vector((0.25, 0, 1.35)), (0.04, 0.4, 0.03), 0.0), DARK)
    turret(m, 0.85, 0.48, 0.17, 0.45, rgb('#7a9ac8'), 1); turret(m, -0.9, 0.48, 0.15, 0.4, rgb('#7a9ac8'), 1, True)
    m.solid(rbox(Vector((-0.65, 0, 0.5)), (0.3, 0.2, 0.12), 0.04), DARK)  # torpedo tubes
    return m

def submarine():  # a friendly sub with eyes, surfacing
    m = Model('submarine'); col = rgb('#3a6ab8')
    m.capsule((-0.95, 0, 0.42), (0.85, 0, 0.42), 0.42, col)
    m.solid(rbox(Vector((0.05, 0, 0.95)), (0.55, 0.32, 0.5), 0.12, 3), rgb('#4a7ac8'))  # sail
    m.solid(tube((0.15, 0, 1.15), (0.15, 0, 1.5), 0.03, 6), DARK); m.solid(tube((0.15, 0, 1.48), (0.3, 0, 1.48), 0.035, 6), DARK)  # periscope
    m.solid(rbox(Vector((0.05, -0.17, 0.95)), (0.4, 0.02, 0.12), 0.02), TEAM)
    for s in (-1, 1): m.solid(rbox(Vector((-1.25, s * 0.25, 0.45)), (0.25, 0.3, 0.06), 0.03), TEAM)  # fins
    m.solid(rbox(Vector((-1.25, 0, 0.6)), (0.25, 0.06, 0.4), 0.03), TEAM)
    m.solid(cyl((-1.38, 0, 0.42), (-1.45, 0, 0.42), 0.14, 0.14, 12), GOLD)  # propeller hub
    for s in (-1, 1):  # eyes on the bow
        m.solid(sph(Vector((1.05, s * 0.2, 0.55)), 0.13, (0.5, 1, 1.15), 12), WHITE); m.solid(sph(Vector((1.12, s * 0.2, 0.53)), 0.08, (0.5, 1, 1.1), 10), EYE)
    m.solid(cyl((0.9, -0.43, 0.42), (0.9, -0.45, 0.42), 0.1, 0.1, 12), rgb('#9ad0f0')); m.solid(cyl((0.4, -0.45, 0.42), (0.4, -0.47, 0.42), 0.09, 0.09, 12), rgb('#9ad0f0'))
    return m

# ---------------------------------------------------------------- aircraft (along +x)
def propeller(m, x, z, r=0.42, y=0.0):
    m.solid(sph(Vector((x, y, z)), 0.11, (1.3, 1, 1), 12), GOLD)
    m.solid(rbox(Vector((x + 0.05, y, z)), (0.04, 0.1, r * 2), 0.02, 1, qx(30)), WOOD)  # two blades through the hub

def fighter():  # biplane
    m = Model('fighter')
    m.capsule((-0.9, 0, 0.75), (0.7, 0, 0.75), 0.24, TEAM)
    for z in (0.5, 1.05): m.solid(rbox(Vector((0.15, 0, z)), (0.5, 2.0, 0.07), 0.035, 2), rgb('#c0392b') if z > 1 else TEAM)
    for y in (-0.7, 0.7):
        for x in (0.0, 0.3): m.solid(tube((x, y, 0.5), (x, y, 1.05), 0.02, 5), WOOD)
    m.solid(rbox(Vector((-1.05, 0, 0.82)), (0.3, 0.7, 0.05), 0.025), TEAM); m.solid(rbox(Vector((-1.05, 0, 1.0)), (0.3, 0.05, 0.35), 0.025), RED)
    m.solid(sph(Vector((0.05, 0, 1.0)), 0.16, (1.2, 1, 0.7), 12), rgb('#8fd0e8'))  # cockpit
    propeller(m, 0.95, 0.75)
    for y in (-0.3, 0.3): m.solid(tube((0.3, y, 0.5), (0.3, y, 0.2), 0.02, 5), DARK); wheel(m, (0.3, y, 0.15), 0.12, 0.06, BLACK, GREY)
    m.solid(cyl((0.15, -1.01, 0.5), (0.15, -1.02, 0.5), 0.1, 0.1, 12), CREAM)
    return m

def bomber():
    m = Model('bomber'); body = rgb('#6a7a52')
    m.capsule((-1.3, 0, 0.8), (1.1, 0, 0.8), 0.3, body)
    m.solid(rbox(Vector((0.1, 0, 0.82)), (0.6, 3.0, 0.08), 0.04, 2), body)
    for y in (-0.9, -0.45, 0.45, 0.9):
        m.solid(cyl((0.05, y, 0.75), (0.45, y, 0.75), 0.11, 0.12, 12), DARK); propeller(m, 0.52, 0.75, 0.32, y)
    m.solid(rbox(Vector((-1.4, 0, 0.85)), (0.35, 1.0, 0.05), 0.025), body); m.solid(rbox(Vector((-1.4, 0, 1.1)), (0.35, 0.05, 0.45), 0.025), TEAM)
    m.solid(sph(Vector((1.25, 0, 0.82)), 0.22, (1.2, 1, 1), 14), rgb('#8fd0e8'))
    m.solid(cyl((0.1, -1.1, 0.87), (0.1, -1.1, 0.88), 0.14, 0.14, 14), TEAM)
    return m

def jet_fighter():
    m = Model('jet_fighter'); body = rgb('#5aaee8')
    m.capsule((-1.0, 0, 0.75), (0.8, 0, 0.75), 0.22, body)
    m.solid(cyl((0.8, 0, 0.75), (1.35, 0, 0.75), 0.22, 0.02, 14), body)  # nose
    wing = [Vector((0.35, 0, 0.72)), Vector((-0.5, -1.0, 0.72)), Vector((-0.75, -1.0, 0.72)), Vector((-0.6, 0, 0.72))]
    for s in (-1, 1):
        w0 = [Vector((p.x, p.y * s, p.z)) for p in wing]; m.solid(B.loft([[p - Vector((0, 0, 0.03)) for p in w0], [p + Vector((0, 0, 0.03)) for p in w0]]), body)
        m.solid(rbox(Vector((-0.6, s * 0.95, 0.72)), (0.2, 0.06, 0.06), 0.02), TEAM)
    m.solid(B.loft([[Vector((-0.6, -0.03, 0.85)), Vector((-1.05, -0.03, 0.85)), Vector((-1.15, -0.03, 1.3)), Vector((-0.95, -0.03, 1.3))],
                    [Vector((-0.6, 0.03, 0.85)), Vector((-1.05, 0.03, 0.85)), Vector((-1.15, 0.03, 1.3)), Vector((-0.95, 0.03, 1.3))]]), RED)  # fin
    m.solid(sph(Vector((0.45, 0, 0.92)), 0.2, (1.6, 0.8, 0.7), 14), rgb('#2a3a5a'))  # canopy
    m.solid(cyl((-1.0, 0, 0.75), (-1.12, 0, 0.75), 0.16, 0.18, 14), DARK)
    m.solid(rbox(Vector((0.0, -0.22, 0.75)), (0.6, 0.02, 0.08), 0.0), TEAM)
    return m

# ---------------------------------------------------------------- the list
SIDEWAYS = {'knight', 'cavalry', 'caravan', 'settler', 'catapult', 'bombard', 'field_cannon', 'artillery', 'tank', 'modern_armor',
            'mech_infantry', 'rocket_artillery', 'galley', 'caravel', 'ironclad', 'battleship', 'destroyer', 'submarine', 'fighter',
            'bomber', 'jet_fighter'}
B_ = {'scout': scout, 'migrant': migrant, 'commander': commander, 'scarecrow': scarecrow, 'slinger': slinger, 'swordsman': swordsman,
      'crossbowman': crossbowman, 'pikeman': pikeman, 'musketman': musketman, 'rifleman': rifleman, 'infantry': infantry,
      'machine_gun': machine_gun, 'special_forces': special_forces, 'great_prophet': great_prophet, 'great_scientist': great_scientist,
      'great_engineer': great_engineer, 'great_merchant': great_merchant, 'great_artist': great_artist, 'great_general': great_general,
      'great_admiral': great_admiral, 'missionary': missionary, 'knight': knight, 'cavalry': cavalry, 'caravan': caravan, 'settler': settler,
      'catapult': catapult, 'bombard': bombard, 'field_cannon': field_cannon, 'artillery': artillery, 'tank': tank, 'modern_armor': modern_armor,
      'mech_infantry': mech_infantry, 'rocket_artillery': rocket_artillery, 'galley': galley, 'caravel': caravel, 'ironclad': ironclad,
      'battleship': battleship, 'destroyer': destroyer, 'submarine': submarine, 'fighter': fighter, 'bomber': bomber, 'jet_fighter': jet_fighter}
SIZE = {'knight': 0.72, 'cavalry': 0.7, 'caravan': 0.72, 'settler': 0.8, 'catapult': 0.7, 'bombard': 0.7, 'field_cannon': 0.66, 'artillery': 0.72,
        'tank': 0.72, 'modern_armor': 0.76, 'mech_infantry': 0.72, 'rocket_artillery': 0.74, 'galley': 0.8, 'caravel': 0.85, 'ironclad': 0.8,
        'battleship': 0.9, 'destroyer': 0.85, 'submarine': 0.78, 'fighter': 0.72, 'bomber': 0.85, 'jet_fighter': 0.75, 'pikeman': 0.86}  # (the pike is the tallest part)

def make(kind):
    m = B_[kind]()
    if kind in SIDEWAYS: turn(m, qz(TURN))
    return m

MODELS = {'unit_' + k: (lambda k=k: make(k), SIZE.get(k, 0.62), 0.02 if k not in SIDEWAYS else 0.025, 2500) for k in B_}
CAP = 2000  # polygons (about twice as many triangles): dozens of units can stand in view

if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    out = argv[argv.index('--out') + 1] if '--out' in argv else 'godot/models'
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else list(MODELS)
    prev = argv[argv.index('--preview') + 1] if '--preview' in argv else None
    bpy.ops.wm.read_factory_settings(use_empty=True)
    os.makedirs(out, exist_ok=True); objs = []
    for name in only:
        fn, size, res, tris = MODELS[name]
        o = M.build(fn(), res=res, target_tris=tris, smooth=True, cap=CAP); n = M.export(o, os.path.join(out, name + '.json'), size)
        print('model %-24s %5d triangles' % (name, n)); objs.append(o)
    if prev: M.preview(objs, os.path.abspath(prev))
