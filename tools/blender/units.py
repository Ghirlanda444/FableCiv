# Tiny Empires 3D units, built in Blender from code in a chibi style: big heads, big eyes, the owner's colour on tunics,
# banners, sails and paintwork. Every unit type has a base model (unit_<type>); the types the painted art varies by culture
# also get one per culture (unit_<type>_<culture>, from a culture kit: skin, hair, helmets, hats, shields, swords, cloth),
# and every civilization's unique unit has its own (unit_<unique id>). The game picks them in the painted art's order.
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
TURN = -34  # degrees: sideways models turn three-quarters toward the camera

# culture kits (the cultures AU.cultureOf gives the civilizations). K is the kit of the model being built: person() and the
# culture-varied builders read it.
BASE = dict(skin='#eaa77c', hair='#4e2e18', style='hair', beard=None, ancient='helmet', medieval='kettle', knight='great_helm',
            gunhat='tricorn', riflehat='shako', cavhat='shako', modern='brodie', modern_col='#a8955e', scout='slouch', wanderer='wide_hat',
            archer='hood', warrior='hair', shield='round', sword='straight', club='club', cloth='#8a6a4a', legs='#5a4a3a',
            horse=('#9a5a2e', '#3b2414'), robe='#6a4a3a', canvas='#efe6cf')
KITS = {
    'european': dict(skin='#f2c09c', hair='#a8702a', ancient='nasal', medieval='kettle', knight='great_helm', gunhat='tricorn',
                     riflehat='shako', cavhat='shako', modern='brodie', scout='slouch', archer='hood', shield='kite', legs='#4a5a7a', hair2='#d8b060'),
    'mediterranean': dict(skin='#e0a476', hair='#2e1c10', style='curly', ancient='roman', medieval='morion', knight='plumed',
                          gunhat='morion', riflehat='kepi', cavhat='kepi', modern='adrian', modern_col='#6a7aa0', scout='petasos',
                          archer='petasos', shield='hoplon', legs='#8a3a2a', horse=('#e8e2d8', '#bfb4a0')),
    'east_asian': dict(skin='#f0c494', hair='#2a2020', style='topknot', ancient='kabuto', medieval='kabuto', knight='kabuto',
                       gunhat='jingasa', riflehat='kepi', cavhat='kepi', modern='army', scout='jingasa', wanderer='jingasa',
                       archer='jingasa', shield='rect', sword='dao', cloth='#b23a2c', legs='#2a2a3a', horse=('#6a4a2a', '#1a120a'),
                       robe='#c9a05a', canvas='#e8d8b0'),
    'south_asian': dict(skin='#c6875a', hair='#2c201a', style='short', ancient='turban', medieval='spiked', knight='spiked',
                        gunhat='turban', riflehat='turban', cavhat='turban', modern='turban_k', scout='turban', wanderer='turban',
                        archer='turban', shield='dhal', sword='talwar', cloth='#e8a33a', legs='#f0e8d8', horse=('#e8e2d8', '#8a7a6a'),
                        robe='#e8a33a', canvas='#e8a33a'),
    'middle_eastern': dict(skin='#d49a6a', hair='#241810', beard='#241810', ancient='spangen', medieval='spangen', knight='spangen',
                           gunhat='turban', riflehat='fez', cavhat='fez', modern='army_k', modern_col='#c8a870', scout='keffiyeh',
                           wanderer='keffiyeh', archer='keffiyeh', shield='round', sword='scimitar', cloth='#2f8fb3', legs='#e8dcc0',
                           horse=('#f0ece4', '#a09888'), robe='#e8dcc0', canvas='#e8dcc0'),
    'african': dict(skin='#8c5a3c', hair='#2e221a', style='short', ancient='feather_band', medieval='feather_band', knight='spangen',
                    gunhat='fez', riflehat='kepi', cavhat='fez', modern='army_k', modern_col='#b8a070', scout='headband',
                    wanderer='headband', archer='feather_band', warrior='feather_band', shield='oval_hide', club='knobkerrie',
                    cloth='#c98a4a', legs='#e8d0a0', horse=('#5a3a22', '#22160e'), robe='#c98a4a', canvas='#c98a4a'),
    'mesoamerican': dict(skin='#bf7f55', hair='#2e221a', style='bowl', ancient='feather_crown', medieval='feather_crown',
                         knight='feather_crown', gunhat='wide_hat', riflehat='kepi', cavhat='wide_hat', modern='army', scout='feather_band',
                         archer='feather_band', warrior='feather_band', shield='feather', sword='macuahuitl', club='macuahuitl',
                         cloth='#2f9c8a', legs='#efe6cf', horse=('#8a6a4a', '#3a2a1a'), robe='#f0e8d8', canvas='#2f9c8a'),
}
CULTURES = list(KITS)
K = dict(BASE)
def kit(culture=None):
    global K
    K = dict(BASE, **(KITS.get(culture) or {}))
def kc(key): return rgb(K[key]) if isinstance(K[key], str) else K[key]

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
def person(name, hat='hair', top=TEAM, legs=PANTS, boots=BOOTS, belt=LEATHER, skin=None, hair=None, z=0.0, sitting=False,
           face=None, kneel=False, scale_head=1.0, beard=True):
    """a chibi figure facing -y, in the current kit's skin and hair. hat: a headwear kind (see headwear); face(m, hz): extra
    parts on the head (glasses, beards) that tip up with it; beard: the kit's beard, if it has one"""
    skin = skin or kc('skin'); hair = hair or kc('hair')
    m = Model(name); hz = z + 1.42
    nb, ns = len(m.balls), len(m.solids)
    m.ball((0, 0, hz), 0.5 * scale_head, skin)
    headwear(m, hat, hz, hair)
    for s in (-1, 1):  # big chibi eyes: white, a large dark iris low in it, a highlight
        m.solid(sph(Vector((s * 0.185, -0.44, hz - 0.02)), 0.11, (0.85, 0.45, 1.2), 12), WHITE)
        m.solid(sph(Vector((s * 0.18, -0.475, hz - 0.04)), 0.075, (0.85, 0.4, 1.15), 12), EYE)
        m.solid(sph(Vector((s * 0.155, -0.51, hz + 0.0)), 0.026, (1, 0.6, 1), 6), WHITE)
    m.ball((0, -0.5, hz - 0.12), 0.06, (min(1, skin[0] * 1.06), skin[1] * 0.9, skin[2] * 0.88, 1))  # nose
    if beard and K['beard']: short_beard(m, hz, rgb(K['beard']))
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
        hair_cap(); st = K['style']
        if st in ('hair', 'curly', 'bowl', 'topknot'):
            for s in (-1, 0, 1): m.ball((s * 0.2, -0.33, hz + 0.3 - abs(s) * 0.05 - (0.05 if st == 'bowl' else 0)), 0.15, hair)  # fringe
        if st == 'topknot': m.solid(sph(Vector((0, 0.12, hz + 0.6)), 0.15, (1, 1, 1), 12), hair)
        if st == 'curly':
            for a in range(0, 360, 45): m.ball((math.cos(math.radians(a)) * 0.42, 0.08 + math.sin(math.radians(a)) * 0.42, hz + 0.28), 0.13, hair)
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
    # culture helmets and hats
    elif kind == 'nasal':  # conical steel helmet with a nose guard (northern Europe)
        m.solid(cyl((0, 0.04, hz + 0.08), (0, 0.04, hz + 0.78), 0.54, 0.04, 24), STEEL)
        m.solid(tube((0, 0.04, hz + 0.08), (0, 0.04, hz + 0.16), 0.55, 24), rgb('#565d6a'))
        m.solid(cyl((0, -0.5, hz + 0.14), (0, -0.54, hz - 0.08), 0.05, 0.04, 8), rgb('#565d6a'))
    elif kind == 'plumed':
        cap_dome(STEEL, 0.2, 0.8); m.solid(tube((0, 0.05, hz + 0.1), (0, 0.05, hz + 0.18), 0.54, 26), GOLD)
        m.solid(sph(Vector((0.05, 0.15, hz + 0.68)), 0.15, (0.8, 0.8, 1.8), 12), WHITE); m.solid(sph(Vector((-0.1, 0.18, hz + 0.62)), 0.12, (0.8, 0.8, 1.6), 10), TEAM)
    elif kind in ('kabuto', 'kuwagata'):  # lacquered helmet with a flared neck guard
        lac = rgb('#2a2a3a'); cap_dome(lac, 0.22, 0.74)
        m.solid(cyl((0, 0.12, hz + 0.18), (0, 0.16, hz - 0.12), 0.56, 0.74, 24), lac)  # shikoro
        m.solid(tube((0, 0.05, hz + 0.12), (0, 0.05, hz + 0.2), 0.55, 24), TEAM)
        if kind == 'kuwagata':
            for s in (-1, 1): m.solid(cyl((s * 0.08, -0.45, hz + 0.35), (s * 0.42, -0.52, hz + 0.95), 0.05, 0.02, 8), GOLD)
        else: m.solid(sph(Vector((0, -0.48, hz + 0.38)), 0.09, (1.2, 0.4, 1), 10), GOLD)
    elif kind == 'spiked':  # steel dome with a spike, a turban band and a mail curtain
        m.ball((0, 0.18, hz - 0.1), 0.5, rgb('#8a909a'), scale=(1.05, 0.9, 1.0), kind='ELLIPSOID')
        cap_dome(STEEL, 0.24, 0.72); m.solid(cyl((0, 0.05, hz + 0.55), (0, 0.05, hz + 0.85), 0.06, 0.0, 8), GOLD)
        m.solid(tube((0, 0.05, hz + 0.1), (0, 0.05, hz + 0.24), 0.55, 24), TEAM)
    elif kind == 'spangen':  # pointed steel helmet wrapped by a turban, with a mail curtain
        m.ball((0, 0.18, hz - 0.1), 0.5, rgb('#8a909a'), scale=(1.05, 0.9, 1.0), kind='ELLIPSOID')
        m.solid(B.lathe((0, 0.05, hz + 0.1), [(0.52, 0), (0.5, 0.2), (0.36, 0.42), (0.12, 0.62), (0, 0.78)], 20), STEEL)
        m.solid(sph(Vector((0, 0.05, hz + 0.18)), 0.56, (1.0, 1.0, 0.22), 22), TEAM)
    elif kind == 'feather_band':  # headband with upright feathers
        hair_cap(); m.solid(tube((0, 0.05, hz + 0.14), (0, 0.05, hz + 0.24), 0.53, 24), TEAM)
        for x, c in ((-0.12, WHITE), (0.05, rgb('#c0392b')), (0.2, WHITE)):
            m.solid(sph(Vector((x, 0.3, hz + 0.62)), 0.08, (0.6, 0.4, 2.6), 10), c)
    elif kind == 'feather_crown':  # a gold band and a fan of tall feathers
        hair_cap(); m.solid(tube((0, 0.05, hz + 0.14), (0, 0.05, hz + 0.28), 0.54, 24), GOLD)
        for i, c in enumerate((rgb('#2aa04a'), TEAM, rgb('#2aa04a'), TEAM, rgb('#2aa04a'))):
            a = math.radians(-50 + i * 25); m.solid(sph(Vector((math.sin(a) * 0.4, 0.25, hz + 0.6 + math.cos(a) * 0.3)), 0.1, (0.6, 0.35, 2.4), 10, ), c)
    elif kind == 'jingasa':  # flat conical hat
        hair_cap(); m.solid(cyl((0, 0.05, hz + 0.25), (0, 0.05, hz + 0.6), 0.7, 0.06, 26), rgb('#8a3a28'))  # red-brown lacquer: black reads as a hole from above
        m.solid(tube((0, 0.05, hz + 0.36), (0, 0.05, hz + 0.42), 0.52, 22), TEAM)
    elif kind == 'fez':
        hair_cap(); m.solid(cyl((0, 0.05, hz + 0.25), (0, 0.05, hz + 0.72), 0.4, 0.32, 20), rgb('#b02a2a'))
        m.solid(tube((0, 0.05, hz + 0.3), (0, 0.05, hz + 0.38), 0.405, 20), TEAM)
        m.solid(tube((0.0, 0.05, hz + 0.72), (0.25, 0.2, hz + 0.5), 0.03, 6), BLACK)
    elif kind == 'kepi':
        hair_cap(); m.solid(cyl((0, 0.08, hz + 0.25), (0, 0.04, hz + 0.68), 0.42, 0.36, 20), NAVY)
        m.solid(tube((0, 0.08, hz + 0.27), (0, 0.08, hz + 0.37), 0.43, 20), TEAM)
        m.solid(sph(Vector((0, -0.38, hz + 0.28)), 0.25, (1.2, 0.8, 0.15), 14), BLACK)
    elif kind == 'adrian':  # crested steel helmet with brims front and back
        col = rgb(K['modern_col']); cap_dome(col, 0.24, 0.66)
        m.solid(sph(Vector((0, 0.05, hz + 0.2)), 0.6, (0.9, 1.1, 0.08), 22), col)
        m.solid(sph(Vector((0, 0.05, hz + 0.58)), 0.1, (0.4, 2.6, 0.6), 10), col)
    elif kind == 'petasos':  # wide-brimmed traveller's hat
        hair_cap(); m.solid(sph(Vector((0, 0.05, hz + 0.4)), 0.36, (1.0, 1.0, 0.6), 18), rgb('#b8864a'))
        m.solid(sph(Vector((0, 0.05, hz + 0.3)), 0.82, (1.0, 1.0, 0.08), 24), rgb('#b8864a'))
    elif kind == 'keffiyeh':  # cloth headdress held by a cord
        m.ball((0, 0.12, hz + 0.0), 0.56, rgb('#efe9dc'), scale=(1.05, 1.0, 1.08), kind='ELLIPSOID')
        m.solid(sph(Vector((0, 0.05, hz + 0.32)), 0.55, (1.0, 1.0, 0.18), 22), BLACK)
        m.solid(tube((0, 0.05, hz + 0.27), (0, 0.05, hz + 0.33), 0.555, 22), TEAM)
    elif kind == 'turban_k':  # a khaki soldier's turban
        m.solid(sph(Vector((0, 0.05, hz + 0.3)), 0.52, (1.1, 1.1, 0.75), 20), rgb('#b8a070'))
        m.solid(tube((0, 0.05, hz + 0.1), (0, 0.05, hz + 0.26), 0.56, 24), rgb('#9a8458'))
        m.solid(sph(Vector((0, -0.5, hz + 0.32)), 0.08, (1, 0.6, 1.2), 10), TEAM)
    elif kind == 'army_k':  # the modern helmet in the culture's uniform colour
        col = rgb(K['modern_col']); cap_dome(col, 0.2, 0.78, 0.53); m.solid(tube((0, 0.05, hz + 0.1), (0, 0.05, hz + 0.16), 0.56, 28), col)
    # unique units' headgear
    elif kind == 'corinthian':  # bronze helmet with cheek guards and a tall horsehair crest
        cap_dome(BRONZE, 0.22, 0.78)
        for s in (-1, 1): m.solid(rbox(Vector((s * 0.44, -0.18, hz - 0.08)), (0.1, 0.3, 0.42), 0.04), BRONZE)
        m.solid(sph(Vector((0, 0.1, hz + 0.68)), 0.16, (0.5, 2.8, 1.3), 16), TEAM)
    elif kind == 'eagle':  # an eagle's head: feathered dome, a yellow beak over the brow
        m.solid(sph(Vector((0, 0.08, hz + 0.18)), 0.56, (1.06, 1.1, 0.85), 22), rgb('#7a5030'))
        m.solid(cyl((0, -0.45, hz + 0.5), (0, -0.78, hz + 0.32), 0.14, 0.02, 12), rgb('#f0b830'))
        for s in (-1, 1): m.solid(sph(Vector((s * 0.22, -0.42, hz + 0.58)), 0.07, (1, 0.6, 1), 8), BLACK)
        for i in range(5): m.solid(sph(Vector((-0.3 + i * 0.15, 0.4, hz + 0.6 + 0.1 * (2 - abs(i - 2)))), 0.08, (0.6, 0.4, 2.2), 8), TEAM)
    elif kind == 'bear_hood':  # a bear pelt over the head, ears and snout on top
        m.solid(sph(Vector((0, 0.12, hz + 0.12)), 0.58, (1.08, 1.1, 0.95), 22), rgb('#6a4a30'))
        m.solid(sph(Vector((0, -0.3, hz + 0.52)), 0.17, (1.0, 1.3, 0.7), 12), rgb('#6a4a30')); m.solid(sph(Vector((0, -0.48, hz + 0.54)), 0.06, (1, 1, 1), 8), BLACK)
        for s in (-1, 1): m.solid(sph(Vector((s * 0.3, 0.0, hz + 0.62)), 0.1, (1, 0.6, 1), 8), rgb('#6a4a30'))
    elif kind == 'papakha':  # tall fur hat
        hair_cap(); m.solid(cyl((0, 0.05, hz + 0.25), (0, 0.05, hz + 0.75), 0.45, 0.48, 20), BLACK)
        m.solid(sph(Vector((0, 0.05, hz + 0.75)), 0.42, (1, 1, 0.25), 16), TEAM)
    elif kind == 'bork':  # the janissary's tall white felt hat, folded down the back
        m.solid(cyl((0, 0.08, hz + 0.2), (0, 0.18, hz + 1.0), 0.45, 0.32, 20), rgb('#f0ece0'))
        m.solid(rbox(Vector((0, 0.42, hz + 0.6)), (0.4, 0.08, 0.8), 0.04, 1, qx(15)), rgb('#f0ece0'))
        m.solid(tube((0, 0.08, hz + 0.2), (0, 0.08, hz + 0.32), 0.47, 20), GOLD); m.solid(sph(Vector((0, -0.38, hz + 0.45)), 0.08, (1, 0.6, 1.5), 8), TEAM)
    elif kind == 'pickelhaube':
        cap_dome(BLACK, 0.22, 0.8); m.solid(cyl((0, 0.05, hz + 0.58), (0, 0.05, hz + 0.95), 0.07, 0.0, 10), GOLD)
        m.solid(sph(Vector((0, -0.4, hz + 0.18)), 0.25, (1.2, 0.8, 0.15), 14), BLACK); m.solid(sph(Vector((0, -0.47, hz + 0.4)), 0.09, (1, 0.5, 1), 8), GOLD)
    elif kind == 'beret_feather':  # landsknecht: a wide floppy beret and big feathers
        hair_cap(); m.solid(sph(Vector((0.1, 0.0, hz + 0.42)), 0.6, (1.15, 1.05, 0.3), 20), TEAM)
        for i, c in enumerate((WHITE, rgb('#e8c84a'), WHITE)): m.solid(sph(Vector((0.35 + i * 0.1, 0.05, hz + 0.75)), 0.1, (0.6, 0.6, 2.6), 10, ), c)
    elif kind == 'tiara':  # Persian fluted felt hat
        hair_cap(); m.solid(cyl((0, 0.05, hz + 0.2), (0, 0.05, hz + 0.75), 0.45, 0.4, 16), rgb('#e8dcc0'))
        m.solid(tube((0, 0.05, hz + 0.25), (0, 0.05, hz + 0.35), 0.46, 16), TEAM)
    elif kind == 'assyrian':  # tall pointed helmet
        hair_cap(); m.solid(cyl((0, 0.05, hz + 0.15), (0, 0.05, hz + 1.0), 0.52, 0.03, 20), STEEL)
        m.solid(tube((0, 0.05, hz + 0.15), (0, 0.05, hz + 0.24), 0.53, 20), GOLD)
    elif kind == 'mongol':  # pointed steel helmet with a fur brim and a plume
        cap_dome(STEEL, 0.25, 0.9); m.solid(cyl((0, 0.05, hz + 0.6), (0, 0.05, hz + 0.95), 0.08, 0.0, 8), STEEL)
        m.solid(tube((0, 0.05, hz + 0.08), (0, 0.05, hz + 0.24), 0.58, 24), rgb('#7a5a3a')); m.solid(sph(Vector((0, 0.05, hz + 1.0)), 0.08, (0.8, 0.8, 1.6), 8), TEAM)
    elif kind == 'roach':  # Shawnee roach headdress and feathers
        hair_cap(); m.solid(sph(Vector((0, 0.05, hz + 0.55)), 0.14, (0.6, 3.0, 1.2), 12), rgb('#c0392b'))
        for x in (-0.08, 0.08): m.solid(sph(Vector((x, 0.35, hz + 0.75)), 0.07, (0.5, 0.4, 2.5), 8), WHITE)
        m.solid(tube((0, 0.05, hz + 0.14), (0, 0.05, hz + 0.22), 0.53, 22), TEAM)
    elif kind == 'maori':  # topknot with a white feather, carved comb
        hair_cap(); m.solid(sph(Vector((0, 0.12, hz + 0.6)), 0.17, (1, 1, 1), 12), kc('hair'))
        m.solid(sph(Vector((0.05, 0.15, hz + 0.85)), 0.06, (0.5, 0.5, 2.0), 8), WHITE); m.solid(rbox(Vector((0, 0.0, hz + 0.65)), (0.2, 0.05, 0.1), 0.02), TEAM)
    elif kind == 'lime_spikes':  # Gaesatae: lime-washed spiky hair
        hair_cap()
        for i in range(7):
            a = math.radians(-70 + i * 23); m.solid(cyl((math.sin(a) * 0.3, 0.05, hz + 0.35 + math.cos(a) * 0.15), (math.sin(a) * 0.55, 0.1, hz + 0.55 + math.cos(a) * 0.3), 0.09, 0.0, 6), rgb('#e8dcb0'))
    elif kind == 'szyszak':  # Polish lobster-tail pot helmet
        cap_dome(STEEL, 0.24, 0.8); m.solid(cyl((0, 0.2, hz + 0.1), (0, 0.32, hz - 0.2), 0.5, 0.6, 20), STEEL)
        m.solid(cyl((0, -0.5, hz + 0.2), (0, -0.54, hz - 0.06), 0.04, 0.03, 6), GOLD); m.solid(sph(Vector((0, 0.15, hz + 0.68)), 0.08, (0.7, 0.7, 1.8), 8), TEAM)

def arm(m, side, hand, z=0.0, sleeve=TEAM, skin=None):
    sh = Vector((side * 0.33, 0, z + 0.95)); hand = Vector(hand)
    m.capsule(sh, sh.lerp(hand, 0.85), 0.1, sleeve); m.ball(hand, 0.11, skin or kc('skin'))

def short_beard(m, hz, col):
    m.solid(sph(Vector((0, -0.34, hz - 0.3)), 0.24, (1.15, 0.7, 0.8), 14), col)
    m.solid(sph(Vector((0, -0.49, hz - 0.17)), 0.09, (1.7, 0.6, 0.5), 10), col)

def scaled(m, k, off=(0, 0, 0)): return turn(m, Quaternion(), off, k)

def merge(a, b): a.balls += b.balls; a.solids += b.solids; return a

# ---------------------------------------------------------------- weapons and props (in the hand at p; along a direction)
def sword(m, p, d=(0.15, -0.1, 1.0), L=0.75):
    p, d = Vector(p), Vector(d).normalized()
    m.solid(rbox(p + d * (0.12 + L / 2), (0.1, 0.03, L), 0.02, 1, Vector((0, 0, 1)).rotation_difference(d)), rgb('#d8dde6'))
    m.solid(rbox(p + d * 0.1, (0.3, 0.07, 0.06), 0.02, 1, Vector((0, 0, 1)).rotation_difference(d)), GOLD)
    m.solid(tube(p - d * 0.1, p + d * 0.08, 0.04, 6), LEATHER)

def blade(m, p, d, L, curve=0.0, w=0.1, col=rgb('#d8dde6')):
    """a flat blade from p along d, bending sideways by curve (a sabre, a dao, a talwar) and tapering to the tip"""
    p, d = Vector(p), Vector(d).normalized(); side = d.cross(Vector((0, 1, 0)))
    side = side.normalized() if side.length > 1e-3 else Vector((1, 0, 0)); flat = side.cross(d).normalized()
    rings = []
    for i in range(7):
        t = i / 6; c = p + d * (L * t) + side * (curve * L * t * t); ww = w * (1 - 0.75 * t ** 3) / 2; th = 0.016
        rings.append([c + side * ww + flat * th, c - side * ww * 0.3 + flat * th, c - side * ww * 0.3 - flat * th, c + side * ww - flat * th])
    m.solid(B.loft(rings), col)

def sword_k(m, p, d=(0.15, -0.1, 1.0), L=0.75):
    """the kit's sword in the hand at p"""
    st = K['sword']; p, dd = Vector(p), Vector(d).normalized()
    if st == 'straight': return sword(m, p, d, L)
    if st == 'macuahuitl':  # a wooden paddle edged with obsidian
        q = Vector((0, 0, 1)).rotation_difference(dd)
        m.solid(rbox(p + dd * (0.1 + L / 2), (0.16, 0.05, L), 0.03, 1, q), WOOD)
        for i in range(5):
            for sgn in (-1, 1): m.solid(rbox(p + dd * (0.25 + i * L / 5.5) + (q @ Vector((sgn * 0.1, 0, 0))), (0.05, 0.03, 0.08), 0.01, 1, q), BLACK)
        m.solid(tube(p - dd * 0.1, p + dd * 0.1, 0.04, 6), LEATHER); return
    curve = {'dao': 0.18, 'scimitar': 0.3, 'talwar': 0.25, 'katana': 0.08}.get(st, 0.2)
    blade(m, p + dd * 0.1, dd, L, curve, 0.12 if st == 'dao' else 0.1)
    m.solid(rbox(p + dd * 0.08, (0.24, 0.07, 0.05), 0.02, 1, Vector((0, 0, 1)).rotation_difference(dd)), GOLD)
    m.solid(tube(p - dd * 0.12, p + dd * 0.06, 0.04, 6), BLACK if st == 'katana' else LEATHER)

def shield_k(m, c, k=1.0):
    """the kit's shield, held at c facing the camera"""
    st = K['shield']; c = Vector(c)
    if st == 'round': return shield_round(m, c, 0.4 * k)
    if st == 'hoplon': return shield_round(m, c, 0.46 * k, TEAM, BRONZE)
    if st == 'rect': return shield_rect(m, c, 0.5 * k, 0.72 * k)
    if st == 'kite':  # pointed at the bottom
        pts = [(0, 0.42), (0.3, 0.36), (0.3, 0.05), (0, -0.5), (-0.3, 0.05), (-0.3, 0.36)]
        m.solid(B.loft([[c + Vector((x * k, yy, z * k)) for x, z in pts] for yy in (0.0, -0.1)]), TEAM)
        m.solid(rbox(c + Vector((0, -0.08, 0.1 * k)), (0.08 * k, 0.04, 0.6 * k), 0.02), GOLD); m.solid(rbox(c + Vector((0, -0.08, 0.2 * k)), (0.45 * k, 0.04, 0.08 * k), 0.02), GOLD)
        return
    if st == 'dhal':  # round leather shield with four bosses
        m.solid(cyl(c, c + Vector((0, -0.1, 0)), 0.38 * k, 0.38 * k, 22), TEAM); m.solid(cyl(c + Vector((0, -0.03, 0)), c + Vector((0, -0.12, 0)), 0.3 * k, 0.3 * k, 22), rgb('#4a3020'))
        for a in (45, 135, 225, 315): m.solid(sph(c + Vector((math.cos(math.radians(a)) * 0.13 * k, -0.13, math.sin(math.radians(a)) * 0.13 * k)), 0.05 * k, (1, 0.6, 1), 8), GOLD)
        return
    if st == 'oval_hide':  # tall cowhide shield
        m.solid(sph(c, 0.5 * k, (0.62, 0.12, 1.0), 20), WHITE)
        for x, z, r in ((-0.12, 0.2, 0.12), (0.1, -0.15, 0.14), (0.05, 0.3, 0.07)): m.solid(sph(c + Vector((x * k, -0.05, z * k)), r * k, (1, 0.3, 1.1), 10), BLACK)
        m.solid(tube(c + Vector((0, -0.07, -0.55 * k)), c + Vector((0, -0.07, 0.6 * k)), 0.03, 6), TEAM)
        return
    if st == 'feather':  # round feather-work shield with a fringe
        m.solid(cyl(c, c + Vector((0, -0.1, 0)), 0.38 * k, 0.38 * k, 22), TEAM); m.solid(cyl(c + Vector((0, -0.03, 0)), c + Vector((0, -0.12, 0)), 0.16 * k, 0.16 * k, 16), GOLD)
        for i in range(7): a = math.radians(200 + i * 23); m.solid(sph(c + Vector((math.cos(a) * 0.4 * k, -0.02, math.sin(a) * 0.4 * k)), 0.06 * k, (0.6, 0.4, 1.6), 8), WHITE)
        return
    shield_round(m, c, 0.4 * k)

def club_k(m, p, d=(0.12, -0.16, 0.7)):
    st = K['club']; p, dd = Vector(p), Vector(d).normalized()
    if st == 'macuahuitl': return sword_k(m, p, d, 0.6) if K['sword'] == 'macuahuitl' else None
    if st == 'knobkerrie':
        m.solid(tube(p - dd * 0.1, p + dd * 0.6, 0.035, 6), WOOD); m.solid(sph(p + dd * 0.68, 0.11, (1, 1, 1), 10), WOOD); return
    m.solid(cyl(p - dd * 0.1, p + dd * 0.7, 0.045, 0.12, 10), WOOD)

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
def u_settler_person(name='p', hat=None):
    m, hz = person(name, hat or K['wanderer'], kc('cloth'), legs=kc('legs')); return m


def scout():
    m, hz = person('scout', K['scout'], rgb('#6e7a3e'), legs=rgb('#6a5a3a'))
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

def warrior():
    m, hz = person('warrior', K['warrior'], kc('cloth') if K['warrior'] != 'hair' else TEAM, legs=kc('legs'))
    arm(m, 1, (0.5, -0.12, 0.55)); arm(m, -1, (-0.5, -0.05, 0.6))
    if K['club'] == 'macuahuitl': sword_k(m, (0.5, -0.14, 0.5), (0.12, -0.16, 0.7), 0.6)
    else: club_k(m, (0.5, -0.14, 0.5))
    m.ball((0, 0.25, 0.85), 0.3, rgb('#8a6a4a'), scale=(1.2, 0.5, 1.1), kind='ELLIPSOID')  # fur cape
    m.solid(rbox(Vector((0, -0.3, 0.78)), (0.5, 0.05, 0.08), 0.02), TEAM)
    return m

def spearman():
    m, hz = person('spearman', K['ancient'], TEAM, legs=kc('legs'))
    arm(m, 1, (0.5, -0.12, 0.6)); arm(m, -1, (-0.45, -0.25, 0.75))
    m.solid(tube((0.52, -0.14, 0.05), (0.56, -0.16, 2.1), 0.035, 8), WOOD)
    m.solid(cyl((0.56, -0.16, 2.1), (0.57, -0.165, 2.38), 0.07, 0.0, 8), METAL)
    shield_k(m, (-0.5, -0.3, 0.75))
    return m

def archer():
    m, hz = person('archer', K['archer'], TEAM, legs=kc('legs'))
    arm(m, -1, (-0.55, -0.3, 0.85)); arm(m, 1, (0.35, -0.2, 0.85))
    m.solid(prim_arc(Vector((-0.6, -0.32, 0.85)), 0.55, 0.035, math.radians(-70), math.radians(70), qz(90), 16), WOOD)
    m.solid(tube((-0.6 + 0.19, -0.32, 0.85 - 0.52), (-0.6 + 0.19, -0.32, 0.85 + 0.52), 0.008, 4), CREAM)
    m.solid(cyl((0.15, 0.3, 0.55), (0.3, 0.38, 1.25), 0.11, 0.12, 10), LEATHER)  # quiver
    for i in range(3): m.solid(tube((0.2 + i * 0.04, 0.34, 1.2), (0.22 + i * 0.05, 0.36, 1.45), 0.012, 4), CREAM)
    return m

def horseman():
    m = horse(*[rgb(c) for c in K['horse']], name='horseman')
    r = rider('hr', K['ancient'], TEAM, lambda r: (r.solid(tube((0.47, -0.32, 0.15), (0.5, -0.36, 2.0), 0.035, 8), WOOD),
                                                  r.solid(cyl((0.5, -0.36, 2.0), (0.5, -0.36, 2.25), 0.07, 0.0, 8), METAL)))
    merge(m, r); m.ball((-0.05, 0, 1.6), 0.45, TEAM, scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')  # saddle cloth in the owner's colour
    return m

def slinger():
    m, hz = person('slinger', 'headband' if K['ancient'] in ('helmet', 'nasal', 'roman') else K['archer'], TEAM, legs=kc('legs'))
    arm(m, 1, (0.45, -0.1, 1.55)); arm(m, -1, (-0.45, -0.2, 0.75))
    m.solid(prim_arc(Vector((0.45, -0.1, 1.85)), 0.28, 0.018, math.radians(-80), math.radians(260), qx(90), 20), rgb('#c9a46a'))  # whirling sling
    m.solid(sph(Vector((0.72, -0.1, 1.85)), 0.07, (1, 1, 1), 8), rgb('#8a8478'))
    m.solid(sph(Vector((-0.3, -0.25, 0.62)), 0.13, (1, 0.8, 1), 10), LEATHER)  # stone pouch
    return m


def swordsman():
    m, hz = person('swordsman', K['ancient'], TEAM, legs=kc('legs'), belt=GOLD)
    arm(m, 1, (0.5, -0.2, 0.75)); arm(m, -1, (-0.45, -0.3, 0.8))
    sword_k(m, (0.5, -0.25, 0.75), (0.25, -0.15, 1.0))
    shield_k(m, (-0.52, -0.42, 0.8))
    return m


def crossbowman():
    m, hz = person('crossbowman', K['medieval'], TEAM, legs=kc('legs'))
    arm(m, 1, (0.2, -0.45, 0.85)); arm(m, -1, (-0.2, -0.5, 1.0))
    m.solid(rbox(Vector((0.0, -0.5, 0.95)), (0.12, 0.75, 0.12), 0.03, 1, qx(-12)), WOOD)  # stock, pointing at the camera
    m.solid(prim_arc(Vector((0, -0.98, 1.03)), 0.42, 0.035, math.radians(20), math.radians(160), qx(-12), 16), IRON)
    m.solid(tube((-0.39, -0.83, 1.06), (0.39, -0.83, 1.06), 0.01, 4), CREAM)
    m.solid(rbox(Vector((0.3, 0.25, 0.7)), (0.16, 0.16, 0.5), 0.05), LEATHER)  # bolt case
    return m


def pikeman():
    m, hz = person('pikeman', K['medieval'] if K['medieval'] != 'kettle' else 'morion', TEAM, legs=kc('legs'))
    arm(m, 1, (0.45, -0.15, 0.75)); arm(m, -1, (0.1, -0.3, 1.15))
    m.solid(tube((0.48, -0.17, 0.02), (0.1, -0.35, 3.1), 0.035), WOOD)
    m.solid(cyl((0.1, -0.35, 3.1), (0.085, -0.36, 3.4), 0.07, 0.0, 8), METAL)
    m.ball((0, -0.05, 0.85), 0.35, STEEL, scale=(1.05, 0.9, 0.7), kind='ELLIPSOID')  # breastplate
    return m


def musketman():
    m, hz = person('musketman', K['gunhat'], TEAM, legs=CREAM if K['gunhat'] == 'tricorn' else kc('legs'), boots=BLACK, belt=WHITE)
    arm(m, 1, (0.4, -0.2, 0.7)); arm(m, -1, (0.25, -0.25, 1.25))
    long_gun(m, (0.45, -0.22, 0.45), (0.15, -0.3, 2.1))
    for s in (-1, 1): m.solid(rbox(Vector((s * 0.18, -0.29, 0.75)), (0.06, 0.03, 0.55), 0.015, 1, qy(s * 25)), WHITE)  # crossbelts
    return m


def rifleman():
    m, hz = person('rifleman', K['riflehat'], TEAM, legs=WHITE if K['riflehat'] == 'shako' else kc('legs'), boots=BLACK, belt=WHITE)
    arm(m, 1, (0.42, -0.15, 0.7)); arm(m, -1, (-0.3, -0.25, 0.95))
    long_gun(m, (0.45, -0.17, 0.4), (0.5, -0.2, 2.2))
    m.solid(cyl((0.5, -0.2, 2.2), (0.5, -0.2, 2.45), 0.025, 0.0, 6), METAL)  # bayonet
    return m


def infantry():
    col = rgb(K['modern_col']) if K['modern'] in ('army_k', 'adrian') else KHAKI
    m, hz = person('infantry', K['modern'], col, legs=col, boots=rgb('#5a4028'))
    arm(m, 1, (0.4, -0.2, 0.75), sleeve=col); arm(m, -1, (0.1, -0.35, 1.1), sleeve=col)
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
    robe = kc('robe')
    def ex(m):
        arm(m, 1, (0.4, -0.35, 0.95), sleeve=robe); arm(m, -1, (-0.4, -0.3, 0.9), sleeve=robe)
        m.solid(rbox(Vector((0, -0.48, 0.95)), (0.5, 0.12, 0.38), 0.03), rgb('#7a2a2a')); m.solid(rbox(Vector((0, -0.55, 0.95)), (0.06, 0.02, 0.24), 0.0), GOLD)
        m.solid(rbox(Vector((0, -0.55, 1.0)), (0.16, 0.02, 0.06), 0.0), GOLD)
        m.ball((0, 0, 0.45), 0.42, robe, scale=(1.0, 0.9, 0.9), kind='ELLIPSOID')
        m.solid(rbox(Vector((0, -0.33, 0.62)), (0.62, 0.05, 0.1), 0.02), TEAM)
    return great('missionary', K['wanderer'], robe, None, ex, legs=robe, belt=None)

# ---------------------------------------------------------------- riders and mounts (along +x)

def rider(name, hat, top=TEAM, weapon=None, legs=PANTS):
    r, hz = person(name, hat, top, legs=legs, sitting=True)
    arm(r, 1, (0.45, -0.3, 0.75)); arm(r, -1, (-0.4, -0.3, 0.85))
    if weapon: weapon(r)
    turn(r, qz(90), (0.0, 0, 1.38), 0.72)
    return r

def knight():
    m = horse(*[rgb(c) for c in K['horse']], name='knight') if K['horse'] != BASE['horse'] else horse(rgb('#e8e2d8'), rgb('#bfb4a0'), 'knight')
    m.ball((-0.05, 0, 1.15), 0.62, TEAM, scale=(1.5, 0.9, 0.55), kind='ELLIPSOID')  # caparison
    r = rider('kr', K['knight'], STEEL, lambda r: r.solid(cyl((0.47, -0.32, 0.6), (0.6, -0.9, 2.3), 0.07, 0.025, 10), WOOD))
    shield_k(r, (-0.5, -0.32, 0.85), 0.9)
    merge(m, r); m.ball((-0.05, 0, 1.6), 0.45, GOLD, scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')
    return m


def cavalry():
    m = horse(rgb('#5a3a22'), rgb('#22160e'), 'cavalry')
    r = rider('cr', K['cavhat'], TEAM, lambda r: sword_k(r, (0.45, -0.32, 0.75), (0.2, -0.3, 1.0), 0.75) if K['sword'] != 'macuahuitl' else sword(r, (0.45, -0.32, 0.75), (0.2, -0.3, 1.0), 0.75), legs=WHITE)
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
    m.solid(cyl((-1.75, 0, 0.95), (-0.35, 0, 0.95), 0.55, 0.55, 20), kc('canvas'))  # canvas
    for x in (-1.6, -1.05, -0.5): m.solid(tube((x - 0.04, 0, 0.95), (x + 0.04, 0, 0.95), 0.57, 20), TEAM)  # hoops
    m.solid(tube((-0.35, 0, 0.6), (0.4, 0, 0.75), 0.04), WOOD)
    p = u_settler_person('sp'); arm(p, 1, (0.45, -0.2, 0.75), sleeve=kc('cloth')); arm(p, -1, (-0.45, -0.1, 0.85), sleeve=kc('cloth'))
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
    p, hz = person('mp', 'army_k' if K['modern'] == 'army_k' else 'army', OLIVE, legs=OLIVE); arm(p, 1, (0.45, -0.2, 0.9), sleeve=OLIVE); arm(p, -1, (-0.45, -0.2, 0.9), sleeve=OLIVE)
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

# ---------------------------------------------------------------- unique units (each civilization's own; built in its culture's kit)
def elephant_rider(m, hat, weapon=None, howdah=None, z=1.72):
    if howdah: m.solid(rbox(Vector((-0.05, 0, 1.95)), (0.9, 0.85, 0.3), 0.06), howdah); m.solid(rbox(Vector((-0.05, 0, 2.12)), (0.95, 0.9, 0.06), 0.03), GOLD)
    m.ball((-0.05, 0, 1.75), 0.6, TEAM, scale=(1.3, 1.25, 0.25), kind='ELLIPSOID')  # caparison
    r = rider('er', hat, TEAM, weapon); turn(r, Quaternion(), (0, 0, z - 1.38 + (0.3 if howdah else 0)))
    return merge(m, r)

def u_legion():
    m, hz = person('legion', 'roman', TEAM, legs=rgb('#8a3a2a'), belt=GOLD)
    m.ball((0, -0.04, 0.84), 0.36, STEEL, scale=(1.05, 0.9, 0.72), kind='ELLIPSOID')  # segmented armour
    for z in (0.72, 0.84, 0.96): m.solid(tube((0, -0.02, z), (0, -0.02, z + 0.025), 0.365, 20), rgb('#565d6a'))
    arm(m, 1, (0.5, -0.2, 0.75)); arm(m, -1, (-0.45, -0.3, 0.8))
    sword(m, (0.5, -0.25, 0.75), (0.25, -0.15, 1.0), 0.55)
    c = Vector((-0.5, -0.45, 0.85)); m.solid(rbox(c, (0.6, 0.12, 0.95), 0.08), TEAM)  # scutum
    m.solid(sph(c + Vector((0, -0.07, 0)), 0.1, (1, 0.6, 1), 10), GOLD)
    for zz in (-0.3, 0.3): m.solid(rbox(c + Vector((0, -0.065, zz)), (0.5, 0.02, 0.05), 0.01), GOLD)
    return m

def u_samurai():
    m, hz = person('samurai', 'kuwagata', TEAM, legs=rgb('#2a2a3a'), belt=rgb('#e8b84a'))
    m.ball((0, -0.04, 0.84), 0.37, rgb('#2a2a3a'), scale=(1.05, 0.9, 0.72), kind='ELLIPSOID')  # lacquered do
    for z in (0.74, 0.86): m.solid(tube((0, -0.02, z), (0, -0.02, z + 0.03), 0.375, 20), TEAM)
    for s in (-1, 1): m.solid(rbox(Vector((s * 0.4, -0.02, 0.98)), (0.18, 0.3, 0.24), 0.04, 1, qy(s * 20)), rgb('#2a2a3a'))  # sode
    arm(m, 1, (0.2, -0.38, 1.0)); arm(m, -1, (0.0, -0.4, 0.9))
    sword_k(m, (0.12, -0.42, 0.95), (0.35, -0.2, 1.0), 1.0)
    m.solid(tube((-0.1, 0.32, 0.6), (-0.1, 0.32, 2.3), 0.025, 6), WOOD); m.solid(rbox(Vector((-0.1 + 0.18, 0.32, 2.05)), (0.32, 0.03, 0.45), 0.02), TEAM)  # sashimono
    return m

def u_crouching_tiger():  # a squat cannon on a two-legged mount, its muzzle painted as a tiger's face
    m = Model('crouching_tiger'); orange = rgb('#e88a2a')
    cannon_barrel(m, (-0.5, 0, 0.55), (0.6, 0, 0.62), 0.26, 0.22, orange)
    for x in (-0.25, 0.1, 0.4): m.solid(tube((x, 0, 0.56), (x + 0.06, 0, 0.58), 0.27, 16), BLACK)  # stripes
    for s in (-1, 1):
        m.solid(tube((0.2, s * 0.15, 0.5), (0.45, s * 0.45, 0.0), 0.04, 6), WOOD); m.solid(tube((-0.4, s * 0.15, 0.45), (-0.6, s * 0.45, 0.0), 0.04, 6), WOOD)
        m.solid(sph(Vector((0.72, s * 0.11, 0.72)), 0.06, (0.5, 1, 1), 8), WHITE); m.solid(sph(Vector((0.74, s * 0.11, 0.71)), 0.035, (0.5, 1, 1), 6), EYE)
    m.solid(rbox(Vector((-0.1, 0, 0.84)), (0.4, 0.3, 0.06), 0.02), TEAM)
    crew(m, 'jingasa', (-0.9, -0.65, 0), 0.5)
    return m

def u_minuteman():
    m, hz = person('minuteman', 'tricorn', rgb('#7a5a3a'), legs=rgb('#c9b48a'), boots=BLACK)
    m.ball((0, -0.08, 0.8), 0.3, TEAM, scale=(0.7, 0.8, 0.95), kind='ELLIPSOID')  # waistcoat
    arm(m, 1, (0.4, -0.2, 0.7), sleeve=rgb('#7a5a3a')); arm(m, -1, (0.25, -0.25, 1.25), sleeve=rgb('#7a5a3a'))
    long_gun(m, (0.45, -0.22, 0.45), (0.15, -0.3, 2.1))
    m.solid(cyl((-0.35, -0.1, 0.62), (-0.2, -0.25, 0.8), 0.07, 0.03, 10), CREAM)  # powder horn
    return m

def spear_up(r):
    r.solid(tube((0.47, -0.32, 0.15), (0.5, -0.36, 2.0), 0.035, 8), WOOD); r.solid(cyl((0.5, -0.36, 2.0), (0.5, -0.36, 2.25), 0.07, 0.0, 8), METAL)

def u_varu():  # war elephant with a howdah
    return elephant_rider(elephant('varu'), 'turban', spear_up, TEAM)

def u_voi_chien():  # Vietnamese war elephant: red and gold trappings, a banner
    m = elephant('voi_chien')
    m.ball((0.95, 0, 1.6), 0.3, RED, scale=(0.5, 1.2, 1.0), kind='ELLIPSOID')  # head cloth
    return elephant_rider(m, 'jingasa', lambda r: banner(r, (0.47, -0.32, 0.15), 2.1), None)

def u_domrey():  # Khmer elephant carrying a ballista
    m = elephant('domrey')
    m.ball((-0.05, 0, 1.75), 0.6, TEAM, scale=(1.3, 1.25, 0.25), kind='ELLIPSOID')
    m.solid(rbox(Vector((-0.1, 0, 1.95)), (0.8, 0.6, 0.15), 0.04), WOOD)
    m.solid(rbox(Vector((0.0, 0, 2.15)), (1.0, 0.1, 0.1), 0.03), WOOD)  # stock
    m.solid(prim_arc(Vector((0.35, 0, 2.15)), 0.45, 0.04, math.radians(110), math.radians(250), qz(90) @ qx(90), 14), WOOD)
    m.solid(tube((0.1, 0, 2.2), (0.75, 0, 2.2), 0.02, 6), CREAM); m.solid(cyl((0.75, 0, 2.2), (0.9, 0, 2.2), 0.04, 0.0, 6), METAL)
    return m

def u_jong():  # Javanese ship: tall hull, slanted tanja sails, stern castle
    m = Model('jong'); hull(m, 2.8, 1.0, 0.7, rgb('#7a4a28'), TEAM, sheer=0.3)
    m.solid(rbox(Vector((-1.0, 0, 0.95)), (0.6, 0.85, 0.4), 0.05), rgb('#6a3a20'))
    for x, h in ((-0.3, 1.8), (0.5, 1.6)):
        mast(m, x, h, 0.6)
        q = qz(40) @ qy(-15)  # trimmed across the wind, so its face shows
        m.solid(rbox(Vector((x + 0.05, 0, 1.25)), (0.9, 0.04, 1.0), 0.03, 1, q), rgb('#c9a46a'))  # tanja sail
        for z in (0.95, 1.25, 1.55): m.solid(rbox(Vector((x + 0.05, 0, 1.25)) + q @ Vector(((z - 1.25) * 0.27, -0.03, z - 1.25)), (0.92, 0.02, 0.04), 0.0, 1, q), TEAM)
    return m

def u_keshig():  # Mongol horse archer
    m = horse(rgb('#7a5a3a'), rgb('#2a1a0e'), 'keshig'); scaled(m, 0.92)
    r = rider('kr', 'mongol', TEAM, lambda r: r.solid(prim_arc(Vector((-0.5, -0.4, 0.95)), 0.5, 0.035, math.radians(-70), math.radians(70), qz(90), 14), WOOD))
    merge(m, r); m.ball((-0.05, 0, 1.55), 0.42, rgb('#7a5a3a'), scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')
    return m

def u_impi():
    m, hz = person('impi', 'feather_band', rgb('#6a4a30'), legs=kc('skin'), belt=rgb('#6a4a30'))
    m.ball((0, 0, 0.55), 0.38, rgb('#5a3a22'), scale=(1.0, 0.9, 0.45), kind='ELLIPSOID')  # fur kilt
    arm(m, 1, (0.5, -0.2, 0.8), sleeve=kc('skin')); arm(m, -1, (-0.45, -0.3, 0.85), sleeve=kc('skin'))
    m.solid(tube((0.5, -0.22, 0.6), (0.55, -0.3, 1.5), 0.03, 6), WOOD); blade(m, (0.55, -0.3, 1.5), (0.04, -0.06, 1.0), 0.35, 0.0, 0.12)  # iklwa
    shield_k(m, (-0.5, -0.4, 0.85), 1.1)
    return m

def u_ngao_mbebe():  # Kongo shield-bearer: a big woven shield and a spear
    m, hz = person('ngao_mbebe', 'feather_band', kc('cloth'), legs=kc('legs'))
    arm(m, 1, (0.5, -0.12, 0.6)); arm(m, -1, (-0.4, -0.35, 0.85))
    m.solid(tube((0.52, -0.14, 0.05), (0.56, -0.16, 2.1), 0.035, 8), WOOD); m.solid(cyl((0.56, -0.16, 2.1), (0.57, -0.165, 2.4), 0.08, 0.0, 8), METAL)
    c = Vector((-0.35, -0.48, 0.8)); m.solid(rbox(c, (0.75, 0.1, 1.15), 0.08), rgb('#c9a46a'))
    for i in range(4): m.solid(rbox(c + Vector((0, -0.055, -0.4 + i * 0.27)), (0.65, 0.02, 0.06), 0.01), TEAM)
    return m

def u_immortal():
    m, hz = person('immortal', 'tiara', TEAM, legs=TEAM, belt=GOLD)
    m.ball((0, 0, 0.45), 0.42, TEAM, scale=(1.0, 0.9, 0.9), kind='ELLIPSOID')  # long robe
    for z in (0.35, 0.6): m.solid(tube((0, 0, z), (0, 0, z + 0.03), 0.43, 20), GOLD)
    arm(m, 1, (0.5, -0.12, 0.7)); arm(m, -1, (-0.45, -0.3, 0.85))
    m.solid(tube((0.52, -0.14, 0.15), (0.56, -0.16, 2.1), 0.035, 8), WOOD); m.solid(cyl((0.56, -0.16, 2.1), (0.57, -0.165, 2.35), 0.07, 0.0, 8), METAL)
    m.solid(sph(Vector((0.52, -0.14, 0.12)), 0.08, (1, 1, 1), 10), GOLD)  # golden apple counterweight
    c = Vector((-0.5, -0.4, 0.85)); m.solid(rbox(c, (0.5, 0.08, 0.8), 0.06), rgb('#c9a46a'))  # wicker shield
    for zz in (-0.25, 0.0, 0.25): m.solid(rbox(c + Vector((0, -0.045, zz)), (0.45, 0.02, 0.04), 0.0), rgb('#8a6a3a'))
    return m

def u_maryannu():  # Egyptian chariot with an archer
    m = horse(rgb('#e8e2d8'), rgb('#3a2a1a'), 'maryannu'); scaled(m, 0.85, (0.55, 0, 0))
    for y in (-0.5, 0.5): wheel(m, (-0.85, y, 0.42), 0.42, 0.08, WOOD, GOLD)
    m.solid(rbox(Vector((-0.85, 0, 0.75)), (0.6, 0.85, 0.35), 0.05), TEAM); m.solid(tube((-0.55, 0, 0.62), (0.4, 0, 0.9), 0.03, 6), WOOD)
    p, hz = person('ma', 'keffiyeh', WHITE, legs=WHITE, beard=False)
    arm(p, -1, (-0.55, -0.3, 0.95), sleeve=WHITE); arm(p, 1, (0.35, -0.2, 0.95), sleeve=WHITE)
    p.solid(prim_arc(Vector((-0.6, -0.32, 0.95)), 0.55, 0.035, math.radians(-70), math.radians(70), qz(90), 14), WOOD)
    turn(p, qz(60), (-0.85, 0.0, 0.55), 0.62); merge(m, p)
    return m

def u_gaesatae():
    woad = rgb('#5a7ac8')
    m, hz = person('gaesatae', 'lime_spikes', kc('skin'), legs=rgb('#3a7a3a'), belt=GOLD)
    for x, z in ((-0.15, 0.85), (0.12, 0.72), (0.0, 1.0)): m.solid(sph(Vector((x, -0.3, z)), 0.07, (1, 0.3, 1.6), 8), woad)  # woad marks
    m.solid(prim_arc(Vector((0, -0.05, 1.08)), 0.2, 0.035, math.radians(200), math.radians(340), Quaternion(), 10), GOLD)  # torc
    arm(m, 1, (0.5, -0.12, 0.6), sleeve=kc('skin')); arm(m, -1, (-0.45, -0.25, 0.75), sleeve=kc('skin'))
    m.solid(tube((0.52, -0.14, 0.05), (0.56, -0.16, 2.1), 0.035, 8), WOOD); m.solid(cyl((0.56, -0.16, 2.1), (0.57, -0.165, 2.4), 0.08, 0.0, 8), METAL)
    c = Vector((-0.5, -0.38, 0.8)); m.solid(sph(c, 0.55, (0.55, 0.12, 1.0), 18), TEAM); m.solid(rbox(c + Vector((0, -0.07, 0)), (0.05, 0.03, 0.8), 0.01), GOLD)
    return m

def u_mamluk():
    m = horse(rgb('#f0ece4'), rgb('#a09888'), 'mamluk')
    m.ball((-0.05, 0, 1.15), 0.62, TEAM, scale=(1.5, 0.9, 0.55), kind='ELLIPSOID')
    r = rider('mr', 'spangen', TEAM, lambda r: sword_k(r, (0.45, -0.32, 0.75), (0.2, -0.3, 1.0), 0.75))
    shield_round(r, (-0.5, -0.32, 0.85), 0.34)
    merge(m, r); m.ball((-0.05, 0, 1.6), 0.45, GOLD, scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')
    return m

def u_redcoat():
    red = rgb('#c0302a')
    m, hz = person('redcoat', 'shako', red, legs=WHITE, boots=BLACK, belt=WHITE)
    for s in (-1, 1): m.solid(rbox(Vector((s * 0.18, -0.29, 0.75)), (0.06, 0.03, 0.55), 0.015, 1, qy(s * 25)), WHITE)
    m.solid(rbox(Vector((0, -0.3, 1.0)), (0.3, 0.04, 0.08), 0.02), TEAM)  # facings in the owner's colour
    arm(m, 1, (0.42, -0.15, 0.7), sleeve=red); arm(m, -1, (-0.3, -0.25, 0.95), sleeve=red)
    long_gun(m, (0.45, -0.17, 0.4), (0.5, -0.2, 2.2)); m.solid(cyl((0.5, -0.2, 2.2), (0.5, -0.2, 2.45), 0.025, 0.0, 6), METAL)
    return m

def u_eagle_warrior():
    m, hz = person('eagle_warrior', 'eagle', rgb('#7a5030'), legs=rgb('#7a5030'))
    for z in (0.65, 0.8, 0.95): m.solid(tube((0, 0, z), (0, 0, z + 0.04), 0.37, 18), rgb('#f0e0b0'))  # feather rows
    arm(m, 1, (0.5, -0.2, 0.7), sleeve=rgb('#7a5030')); arm(m, -1, (-0.45, -0.3, 0.85), sleeve=rgb('#7a5030'))
    sword_k(m, (0.5, -0.25, 0.65), (0.2, -0.15, 1.0), 0.7)
    shield_k(m, (-0.5, -0.4, 0.85))
    return m

def u_kispoko():  # Shawnee warrior on a painted horse
    m = horse(rgb('#f0ece4'), rgb('#2a1a0e'), 'kispoko')
    for p, r in (((0.3, -0.42, 1.25), 0.2), ((-0.5, -0.42, 1.1), 0.24), ((-0.1, 0.42, 1.2), 0.22)): m.solid(sph(Vector(p), r, (1, 0.25, 1), 12), rgb('#7a4a2a'))  # pinto patches
    def tomahawk(r):
        r.solid(tube((0.45, -0.32, 0.6), (0.55, -0.45, 1.4), 0.03, 6), WOOD); r.solid(rbox(Vector((0.62, -0.47, 1.35)), (0.2, 0.05, 0.12), 0.02), METAL)
    r = rider('kr', 'roach', rgb('#c9a46a'), tomahawk, legs=rgb('#8a6a4a'))
    merge(m, r); m.ball((-0.05, 0, 1.6), 0.45, TEAM, scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')
    return m

def u_hoplite():
    m, hz = person('hoplite', 'corinthian', TEAM, legs=rgb('#8a3a2a'), belt=None)
    m.ball((0, -0.04, 0.84), 0.37, BRONZE, scale=(1.05, 0.9, 0.72), kind='ELLIPSOID')  # bronze cuirass
    arm(m, 1, (0.45, -0.15, 1.35)); arm(m, -1, (-0.45, -0.3, 0.85))
    m.solid(tube((0.1, -0.1, 1.45), (0.95, -0.55, 1.15), 0.035, 8), WOOD); m.solid(cyl((0.95, -0.55, 1.15), (1.15, -0.65, 1.08), 0.07, 0.0, 8), METAL)  # spear overhand
    c = Vector((-0.45, -0.45, 0.85)); m.solid(cyl(c, c + Vector((0, -0.14, 0)), 0.55, 0.55, 26), BRONZE); m.solid(cyl(c + Vector((0, -0.04, 0)), c + Vector((0, -0.16, 0)), 0.47, 0.47, 26), TEAM)
    m.solid(rbox(c + Vector((0, -0.17, 0)), (0.06, 0.03, 0.5), 0.01, 1, qy(30)), BRONZE); m.solid(rbox(c + Vector((0.08, -0.17, -0.05)), (0.06, 0.03, 0.4), 0.01, 1, qy(-30)), BRONZE)  # lambda
    return m

def u_landsknecht():
    m, hz = person('landsknecht', 'beret_feather', TEAM, legs=rgb('#e8c84a'))
    for s in (-1, 1): m.solid(sph(Vector((s * 0.36, 0, 0.92)), 0.2, (1, 1, 1.15), 12), rgb('#e8c84a') if s > 0 else TEAM)  # puffed, slashed sleeves
    for s in (-1, 1): m.solid(sph(Vector((s * 0.17, 0, 0.42)), 0.17, (1, 1, 1.1), 12), TEAM if s > 0 else rgb('#e8c84a'))
    arm(m, 1, (0.3, -0.3, 0.95)); arm(m, -1, (0.1, -0.35, 0.95))
    sword(m, (0.2, -0.35, 0.95), (0.25, 0.2, 1.0), 1.25)  # two-handed sword on the shoulder
    return m

def u_cossack():
    m = horse(rgb('#5a3a22'), rgb('#22160e'), 'cossack')
    r = rider('cr', 'papakha', TEAM, lambda r: (blade(r, (0.45, -0.32, 0.8), (0.2, -0.3, 1.0), 0.8, 0.12, 0.09), r.solid(tube((0.4, -0.27, 0.72), (0.48, -0.35, 0.86), 0.04, 6), BLACK)), legs=NAVY)
    merge(m, r); m.ball((-0.05, 0, 1.6), 0.45, TEAM, scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')
    return m

def u_tercio():
    m, hz = person('tercio', 'morion', rgb('#3a3a3a'), legs=rgb('#8a2a2a'), boots=BLACK, belt=GOLD)
    m.ball((0, -0.04, 0.84), 0.36, STEEL, scale=(1.05, 0.9, 0.72), kind='ELLIPSOID')
    m.solid(rbox(Vector((0, -0.3, 0.8)), (0.12, 0.04, 0.55), 0.02, 1, qy(30)), TEAM)  # sash
    arm(m, 1, (0.4, -0.2, 0.7)); arm(m, -1, (0.25, -0.25, 1.25))
    long_gun(m, (0.45, -0.22, 0.45), (0.15, -0.3, 2.1))
    m.solid(tube((-0.45, -0.1, 0.0), (-0.45, -0.1, 1.15), 0.025, 6), WOOD); m.solid(prim_arc(Vector((-0.45, -0.1, 1.22)), 0.08, 0.02, math.radians(180), math.radians(360), qx(90), 8), METAL)  # musket rest
    return m

def u_janissary():
    m, hz = person('janissary', 'bork', TEAM, legs=rgb('#2a4a8a'), belt=GOLD)
    m.ball((0, 0, 0.5), 0.4, TEAM, scale=(1.0, 0.9, 0.8), kind='ELLIPSOID')  # long kaftan
    arm(m, 1, (0.4, -0.2, 0.7)); arm(m, -1, (0.25, -0.25, 1.25))
    long_gun(m, (0.45, -0.22, 0.45), (0.15, -0.3, 2.1))
    blade(m, (-0.3, -0.3, 0.62), (-0.3, -0.1, -1.0), 0.45, 0.15, 0.08)  # yatagan at the belt
    return m

def u_hwacha():  # Korean cart firing a rack of rocket arrows
    m = Model('hwacha')
    for y in (-0.45, 0.45): wheel(m, (0.0, y, 0.38), 0.38, 0.08)
    m.solid(rbox(Vector((-0.2, 0, 0.5)), (1.4, 0.7, 0.12), 0.04), WOOD); m.solid(tube((-0.85, 0, 0.5), (-1.3, 0, 0.3), 0.03, 6), WOOD)
    c = Vector((0.1, 0, 0.95)); m.solid(rbox(c, (0.35, 0.8, 0.6), 0.04, 1, qy(-30)), rgb('#8a5a32'))
    for i in range(4):
        for j in range(3):
            q = c + (qy(-30) @ Vector((0.18, -0.3 + i * 0.2, -0.18 + j * 0.18))); m.solid(cyl(q, q + (qy(-30) @ Vector((0.12, 0, 0))), 0.035, 0.0, 6), RED)
    m.solid(rbox(Vector((-0.2, -0.36, 0.55)), (0.6, 0.02, 0.08), 0.0), TEAM)
    crew(m, 'jingasa', (-0.9, -0.65, 0), 0.5)
    return m

def u_berserker():
    m, hz = person('berserker', 'bear_hood', rgb('#6a4a30'), legs=rgb('#5a4a3a'))
    arm(m, 1, (0.5, -0.2, 1.3), sleeve=kc('skin')); arm(m, -1, (-0.45, -0.3, 0.8), sleeve=kc('skin'))
    m.solid(tube((0.5, -0.22, 1.1), (0.55, -0.3, 2.0), 0.035, 6), WOOD)
    m.solid(sph(Vector((0.66, -0.32, 1.9)), 0.2, (1.2, 0.25, 1.0), 14), METAL)  # axe head
    shield_round(m, (-0.5, -0.36, 0.8), 0.42, TEAM, WOOD)
    return m

def u_maori_warrior():  # Toa: a taiaha staff, flax skirt and a cloak
    m, hz = person('maori_warrior', 'maori', rgb('#3a2a1a'), legs=kc('skin'), belt=None)
    m.ball((0, 0, 0.55), 0.38, rgb('#d8b45a'), scale=(1.0, 0.9, 0.55), kind='ELLIPSOID')  # flax skirt
    m.ball((0, 0.18, 0.95), 0.34, TEAM, scale=(1.3, 0.5, 1.0), kind='ELLIPSOID')  # cloak
    arm(m, 1, (0.4, -0.3, 0.9), sleeve=kc('skin')); arm(m, -1, (-0.4, -0.3, 1.1), sleeve=kc('skin'))
    m.solid(tube((-0.7, -0.35, 1.35), (0.8, -0.3, 0.6), 0.035, 6), WOOD); m.solid(rbox(Vector((0.85, -0.3, 0.55)), (0.14, 0.06, 0.22), 0.03, 1, qy(-60)), WOOD)
    m.solid(sph(Vector((-0.72, -0.35, 1.37)), 0.06, (1, 1, 1), 8), WHITE)  # feather tuft
    return m

def u_kuk_field_gun():  # Austro-Hungarian field gun with a shield
    m = Model('kuk_field_gun'); g = rgb('#7a8a9a')
    for y in (-0.55, 0.55): wheel(m, (0.0, y, 0.45), 0.45, 0.12, rgb('#4a3a2a'), g)
    m.solid(rbox(Vector((0.05, 0, 0.75)), (0.15, 1.05, 0.5), 0.04), g)  # shield
    m.solid(rbox(Vector((-0.75, 0, 0.3)), (1.3, 0.2, 0.14), 0.04, 1, qy(18)), g)
    m.solid(cyl((-0.1, 0, 0.8), (1.25, 0, 0.88), 0.08, 0.06, 14), rgb('#5a6a7a'))
    m.solid(rbox(Vector((0.13, 0, 0.88)), (0.02, 0.4, 0.12), 0.0), TEAM)
    crew(m, 'kepi', (-1.1, -0.7, 0), 0.5, rgb('#7a8a9a'), rgb('#5a6a7a'))
    return m

def u_quinquereme():  # Carthaginian galley: two banks of oars, a tower, a sail
    m = Model('quinquereme'); hull(m, 3.0, 0.9, 0.62, rgb('#8a5a32'), GOLD, sheer=0.3)
    for row, zz in enumerate((0.5, 0.36)):
        for k in range(7):
            x = -1.0 + k * 0.32 + row * 0.14
            for s in (-1, 1): m.solid(tube((x, s * 0.42, zz), (x - 0.08, s * 0.8, zz - 0.28), 0.022, 5), WOOD)
    m.solid(rbox(Vector((0.7, 0, 0.85)), (0.4, 0.45, 0.45), 0.04), rgb('#7a4a28'))  # fighting tower
    m.solid(rbox(Vector((0.7, -0.23, 0.95)), (0.36, 0.02, 0.1), 0.0), TEAM)
    mast(m, -0.2, 1.7); sail(m, -0.15, 0.95, 1.15, 1.0, TEAM)
    m.solid(cyl((1.45, 0, 0.18), (1.75, 0, 0.18), 0.09, 0.02, 8), BRONZE)
    return m

def u_dromon():  # Byzantine galley: lateen sails and a Greek-fire siphon at the bow
    m = Model('dromon'); hull(m, 2.8, 0.85, 0.55, rgb('#6a3a28'), GOLD, sheer=0.25)
    for k in range(6):
        x = -0.85 + k * 0.32
        for s in (-1, 1): m.solid(tube((x, s * 0.4, 0.48), (x - 0.08, s * 0.76, 0.22), 0.022, 5), WOOD)
    for x, h in ((-0.4, 1.4), (0.45, 1.6)):
        mast(m, x, h, 0.5)
        m.solid(B.loft([[Vector((x - 0.5, -0.01, 0.75)), Vector((x + 0.45, -0.01, 0.8)), Vector((x + 0.1, -0.01, 0.5 + h))],
                        [Vector((x - 0.5, 0.01, 0.75)), Vector((x + 0.45, 0.01, 0.8)), Vector((x + 0.1, 0.01, 0.5 + h))]]), TEAM)  # lateen sail
    m.solid(cyl((1.15, 0, 0.62), (1.6, 0, 0.7), 0.05, 0.08, 10), BRONZE)  # siphon
    m.solid(sph(Vector((1.7, 0, 0.72)), 0.1, (1.6, 1, 1), 10), rgb('#f08a2a'))
    return m

def u_winged_hussar():
    m = horse(rgb('#5a3a22'), rgb('#22160e'), 'winged_hussar')
    m.ball((-0.2, 0, 1.3), 0.4, rgb('#d8a050'), scale=(1.2, 1.15, 0.4), kind='ELLIPSOID')  # leopard pelt
    for x, y in ((-0.35, 0.3), (0.0, -0.4), (-0.5, -0.35)): m.solid(sph(Vector((x, y, 1.42)), 0.06, (1, 1, 0.4), 6), BLACK)
    def arms_(r):
        r.solid(cyl((0.47, -0.32, 0.6), (0.6, -0.9, 2.5), 0.06, 0.02, 10), WOOD); r.solid(rbox(Vector((0.62, -1.0, 2.3)), (0.04, 0.3, 0.2), 0.02, 1, qx(-15)), TEAM)
        for s in (-1, 1):  # the wings: a curved frame with feathers, rising from the back
            r.solid(prim_arc(Vector((s * 0.1, 0.5, 1.4)), 0.65, 0.035, math.radians(-20), math.radians(110), qz(90), 14), WOOD)
            for i in range(6):
                a = math.radians(-10 + i * 20); r.solid(sph(Vector((s * 0.1, 0.5 - math.cos(a) * 0.62 + 0.07, 1.4 + math.sin(a) * 0.62)), 0.08, (0.5, 0.6, 1.6), 8), WHITE)
    r = rider('wr', 'szyszak', TEAM, arms_)
    merge(m, r); m.ball((-0.05, 0, 1.6), 0.45, TEAM, scale=(1.25, 1.2, 0.2), kind='ELLIPSOID')
    return m

def assyrian_beard(m, hz):
    m.solid(sph(Vector((0, -0.33, hz - 0.42)), 0.3, (1.0, 0.7, 1.4), 14), kc('hair'))
    for x in (-0.15, 0.0, 0.15): m.solid(sph(Vector((x, -0.42, hz - 0.5 - abs(x))), 0.07, (1, 1, 1), 8), kc('hair'))  # curls

def u_assyrian_slinger():
    m, hz = person('assyrian_slinger', 'assyrian', TEAM, legs=kc('legs'), face=assyrian_beard, beard=False)
    arm(m, 1, (0.45, -0.1, 1.55)); arm(m, -1, (-0.45, -0.2, 0.75))
    m.solid(prim_arc(Vector((0.45, -0.1, 1.85)), 0.28, 0.018, math.radians(-80), math.radians(260), qx(90), 20), rgb('#c9a46a'))
    m.solid(sph(Vector((0.72, -0.1, 1.85)), 0.07, (1, 1, 1), 8), rgb('#8a8478'))
    return m

def u_nau():  # Portuguese carrack: high castles, square sails with crosses, crow's nests
    m = Model('nau'); hull(m, 2.8, 1.1, 0.8, rgb('#7a4a28'), GOLD, sheer=0.35)
    m.solid(rbox(Vector((-1.05, 0, 1.1)), (0.7, 0.95, 0.4), 0.05), rgb('#6a3a20')); m.solid(rbox(Vector((1.0, 0, 1.05)), (0.5, 0.8, 0.3), 0.05), rgb('#6a3a20'))
    for x, h, w in ((-0.5, 1.9, 0.85), (0.2, 2.4, 1.05), (0.85, 1.7, 0.75)):
        mast(m, x, h, 0.7); sail(m, x + 0.04, 1.2, w, h * 0.45, WHITE)
        m.solid(rbox(Vector((x + 0.1, 0, 1.2 + h * 0.22)), (0.03, 0.22, 0.22), 0.0), TEAM); m.solid(rbox(Vector((x + 0.1, 0, 1.2 + h * 0.22)), (0.03, 0.07, 0.5), 0.0), TEAM)
        m.solid(cyl((x, 0, 0.7 + h - 0.15), (x, 0, 0.7 + h - 0.05), 0.1, 0.12, 10), WOOD)  # crow's nest
    return m

def u_sea_beggar():  # Dutch privateer: a sleek fluyt with gun ports and pennants
    m = Model('sea_beggar'); hull(m, 2.6, 0.85, 0.6, rgb('#2a2a2a'), rgb('#e8862a'), sheer=0.25)
    for x in (-0.6, -0.2, 0.2, 0.6):
        for s in (-1, 1): m.solid(rbox(Vector((x, s * 0.42, 0.45)), (0.12, 0.04, 0.1), 0.02), rgb('#e8862a'))
    for x, h in ((-0.4, 1.7), (0.4, 2.0)):
        mast(m, x, h, 0.55); sail(m, x + 0.04, 1.0, 0.8, h * 0.45, CREAM)
        m.solid(rbox(Vector((x + 0.2, 0, 0.55 + h - 0.05)), (0.4, 0.03, 0.1), 0.02), TEAM)  # pennant
    return m

# each civilization's unique unit: (culture kit, builder, sideways, size)
UNIQUE = {
    'legion': ('mediterranean', u_legion, False, 0.62), 'samurai': ('east_asian', u_samurai, False, 0.7), 'crouching_tiger': ('east_asian', u_crouching_tiger, True, 0.62),
    'minuteman': ('european', u_minuteman, False, 0.62), 'varu': ('south_asian', u_varu, True, 0.82), 'jong': ('south_asian', u_jong, True, 0.85),
    'keshig': ('east_asian', u_keshig, True, 0.7), 'impi': ('african', u_impi, False, 0.62), 'immortal': ('middle_eastern', u_immortal, False, 0.64),
    'maryannu': ('middle_eastern', u_maryannu, True, 0.78), 'gaesatae': ('european', u_gaesatae, False, 0.66), 'mamluk': ('middle_eastern', u_mamluk, True, 0.72),
    'redcoat': ('european', u_redcoat, False, 0.64), 'eagle_warrior': ('mesoamerican', u_eagle_warrior, False, 0.62), 'kispoko': ('mesoamerican', u_kispoko, True, 0.72),
    'hoplite': ('mediterranean', u_hoplite, False, 0.66), 'landsknecht': ('european', u_landsknecht, False, 0.62), 'cossack': ('european', u_cossack, True, 0.72),
    'tercio': ('mediterranean', u_tercio, False, 0.62), 'janissary': ('middle_eastern', u_janissary, False, 0.66), 'hwacha': ('east_asian', u_hwacha, True, 0.66),
    'voi_chien': ('south_asian', u_voi_chien, True, 0.82), 'berserker': ('european', u_berserker, False, 0.62), 'maori_warrior': ('south_asian', u_maori_warrior, False, 0.62),
    'kuk_field_gun': ('european', u_kuk_field_gun, True, 0.7), 'quinquereme': ('mediterranean', u_quinquereme, True, 0.88), 'dromon': ('mediterranean', u_dromon, True, 0.85),
    'winged_hussar': ('european', u_winged_hussar, True, 0.76), 'assyrian_slinger': ('middle_eastern', u_assyrian_slinger, False, 0.62), 'nau': ('mediterranean', u_nau, True, 0.9),
    'sea_beggar': ('european', u_sea_beggar, True, 0.82), 'domrey': ('south_asian', u_domrey, True, 0.82), 'ngao_mbebe': ('african', u_ngao_mbebe, False, 0.64),
}
# unit types the painted art varies by culture (godot/art/units/<culture>/): one model per culture each
VARIED = ['warrior', 'slinger', 'archer', 'spearman', 'swordsman', 'horseman', 'crossbowman', 'pikeman', 'knight', 'musketman', 'cavalry',
          'rifleman', 'infantry', 'mech_infantry', 'special_forces', 'scout', 'settler', 'missionary']

# ---------------------------------------------------------------- the list
SIDEWAYS = {'horseman', 'knight', 'cavalry', 'caravan', 'settler', 'catapult', 'bombard', 'field_cannon', 'artillery', 'tank', 'modern_armor',
            'mech_infantry', 'rocket_artillery', 'galley', 'caravel', 'ironclad', 'battleship', 'destroyer', 'submarine', 'fighter',
            'bomber', 'jet_fighter'}
B_ = {'warrior': warrior, 'spearman': spearman, 'archer': archer, 'horseman': horseman,
      'scout': scout, 'migrant': migrant, 'commander': commander, 'scarecrow': scarecrow, 'slinger': slinger, 'swordsman': swordsman,
      'crossbowman': crossbowman, 'pikeman': pikeman, 'musketman': musketman, 'rifleman': rifleman, 'infantry': infantry,
      'machine_gun': machine_gun, 'special_forces': special_forces, 'great_prophet': great_prophet, 'great_scientist': great_scientist,
      'great_engineer': great_engineer, 'great_merchant': great_merchant, 'great_artist': great_artist, 'great_general': great_general,
      'great_admiral': great_admiral, 'missionary': missionary, 'knight': knight, 'cavalry': cavalry, 'caravan': caravan, 'settler': settler,
      'catapult': catapult, 'bombard': bombard, 'field_cannon': field_cannon, 'artillery': artillery, 'tank': tank, 'modern_armor': modern_armor,
      'mech_infantry': mech_infantry, 'rocket_artillery': rocket_artillery, 'galley': galley, 'caravel': caravel, 'ironclad': ironclad,
      'battleship': battleship, 'destroyer': destroyer, 'submarine': submarine, 'fighter': fighter, 'bomber': bomber, 'jet_fighter': jet_fighter}
SIZE = {'horseman': 0.7, 'knight': 0.72, 'cavalry': 0.7, 'caravan': 0.72, 'settler': 0.8, 'catapult': 0.7, 'bombard': 0.7, 'field_cannon': 0.66, 'artillery': 0.72,
        'tank': 0.72, 'modern_armor': 0.76, 'mech_infantry': 0.72, 'rocket_artillery': 0.74, 'galley': 0.8, 'caravel': 0.85, 'ironclad': 0.8,
        'battleship': 0.9, 'destroyer': 0.85, 'submarine': 0.78, 'fighter': 0.72, 'bomber': 0.85, 'jet_fighter': 0.75, 'pikeman': 0.86}  # (the pike is the tallest part)

def make(fn, culture, sideways):
    kit(culture); m = fn()
    if sideways: turn(m, qz(TURN))
    return m

# name: (builder, size (largest dimension), metaball resolution, triangle budget)
MODELS = {}
for k, fn in B_.items():
    MODELS['unit_' + k] = (lambda fn=fn, sw=k in SIDEWAYS: make(fn, None, sw), SIZE.get(k, 0.62), 0.025 if k in SIDEWAYS else 0.02, 2500)
for k in VARIED:
    for c in CULTURES:
        MODELS['unit_%s_%s' % (k, c)] = (lambda fn=B_[k], c=c, sw=k in SIDEWAYS: make(fn, c, sw), SIZE.get(k, 0.62), 0.025 if k in SIDEWAYS else 0.02, 2500)
for k, (c, fn, sw, size) in UNIQUE.items():
    MODELS['unit_' + k] = (lambda fn=fn, c=c, sw=sw: make(fn, c, sw), size, 0.025 if sw else 0.02, 2500)
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
