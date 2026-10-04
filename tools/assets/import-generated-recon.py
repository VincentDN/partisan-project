"""Import the generated split Recon, fit a deform rig, close hidden cut surfaces and reduce it for the customiser.
Run: blender --background --python tools/assets/import-generated-recon.py -- [source.glb] [output.glb]
Coordinates below are measured in the source's Blender frame (+X forward, +Z up), before conversion to metres.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(__file__))
import generated_recon_textures as textures

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
source = args[0] if args else 'inbound/Models/PARP_Recon_hooded_model_splitparts_v01_05.glb'
out = args[1] if len(args) > 1 else 'build/generated-recon.raw.glb'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
reference=textures.load_reference(os.path.join(os.path.dirname(source),'PARP_Recon_hooded_model_v01_05.glb'))
bpy.ops.import_scene.gltf(filepath=os.path.abspath(source))
# The split source has no materials. Preserve each region as a separate, repaintable material.
NAMES = {0:'Trousers_R',2:'Trousers_L',3:'Sleeve_R',4:'Jacket',5:'Sleeve_L',6:'Harness',7:'Scarf',8:'Hood',9:'BeltPouch',10:'Holster',11:'Boot_L',12:'Glove_L',13:'HipPouch',14:'ShoulderTab',15:'Knee_L',17:'Boot_R',18:'UtilityPouch',19:'MagPouches',20:'BackPouch',21:'Glove_R',22:'Carabiner',23:'Knee_R',24:'Radio',25:'Eyes',26:'RadioBadge'}
ZONES = {'pants':([0,2],'#535846'),'top':([3,4,5],'#697365'),'rig':([6,9,13,18,19,20],'#4e553b'),'scarf':([7],'#a29f8a'),'hood':([8],'#677160'),'boots':([11,17],'#353a30'),'gloves':([12,21],'#414838'),'gear':([10,14,15,22,23,24],'#30382c'),'eyes':([25],'#262d23'),'badge':([26],'#c78039')}
def linear(c):
    return c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4
materials = {}
for zone,(ids,color) in ZONES.items():
    m=bpy.data.materials.new('M_GR_'+zone);m.use_nodes=True
    rgba=tuple(linear(int(color[i:i+2],16)/255) for i in (1,3,5))+(1,)
    m.diffuse_color=rgba;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=rgba
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.92
    for i in ids: materials[i]=m
# Source dimensions are one unit high. The runtime faces +Z (Blender -Y), stands at y=0, and is 1.85 m tall.
def point(x,y,z): return Vector((y*1.85,-x*1.85,(z+.5)*1.85))
meshes={}
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH' or obj==reference: continue
    idx=int(obj.name.rsplit('_',1)[1])
    if idx not in NAMES or idx in [8,25]:  # Generated rifle and its floating detail: runtime weapons replace them.
        bpy.data.objects.remove(obj,do_unlink=True);continue
    transform=obj.matrix_world.copy()
    for v in obj.data.vertices: v.co=point(*(transform@v.co))
    obj.matrix_world=Matrix.Identity(4);obj.name='SK_GR_'+NAMES[idx]
    obj.data.materials.clear();obj.data.materials.append(materials[idx])
    # The segmentation cuts away occluded faces. Cap those cuts so removing equipment never opens the body.
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    boundary=[e for e in bm.edges if e.is_boundary]
    if boundary: bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
    bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    bpy.context.view_layer.objects.active=obj
    dec=obj.modifiers.new('Runtime budget','DECIMATE');dec.ratio=min(1, max(70,len(obj.data.polygons)*.060)/len(obj.data.polygons))
    bpy.ops.object.modifier_apply(modifier=dec.name)
    obj.data.validate();obj.data.update()
    # Smooth normals retain the source's designed facets without exposing every decimation triangle.
    for p in obj.data.polygons: p.use_smooth=True
    meshes[idx]=obj
meshes[8]=textures.complete_head(reference,materials[8])
textures.bake(reference,meshes,os.path.dirname(os.path.abspath(out)))
# The right glove was fused into the generated rifle; part 21 is only its cuff.
# Reuse the complete left glove, mirrored and translated to the measured right wrist.
meshes[21].name='SK_GR_Cuff_R'
glove=meshes[12].copy();glove.data=meshes[12].data.copy();bpy.context.collection.objects.link(glove)
glove.name='SK_GR_Glove_R'
for v in glove.data.vertices: v.co.x=-v.co.x;v.co.z+=.045*1.85
bm=bmesh.new();bm.from_mesh(glove.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(glove.data);bm.free()
glove.data.update();meshes[27]=glove
# The scarf hides an absent neck in the generated source. A small fitted collar bridges
# jacket and masked head, so the removable neck-wrap option leaves a complete body.
verts=[]
for z,rx,ry in [(.29,.060,.050),(.35,.046,.041),(.39,.045,.040)]:
    for i in range(12):
        a=i*math.tau/12;verts.append(point(math.cos(a)*ry,math.sin(a)*rx,z))
faces=[]
for ring in range(2):
    for i in range(12):
        a=ring*12+i;b=ring*12+(i+1)%12
        faces.extend([(a,b,a+12),(b,b+12,a+12)])
neck_data=bpy.data.meshes.new('GeneratedNeckRepair');neck_data.from_pydata(verts,[],faces);neck_data.update()
neck=bpy.data.objects.new('SK_GR_Neck',neck_data);bpy.context.collection.objects.link(neck)
collar=materials[8].copy();collar.name='M_GR_Collar'
for link in list(collar.node_tree.links):collar.node_tree.links.remove(link)
collar.node_tree.links.new(collar.node_tree.nodes['Principled BSDF'].outputs['BSDF'],collar.node_tree.nodes['Material Output'].inputs['Surface'])
neck.data.materials.append(collar);meshes[28]=neck
arm_data=bpy.data.armatures.new('GeneratedRecon');arm=bpy.data.objects.new('Armature',arm_data);bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,a,b,parent=None):
    eb=arm_data.edit_bones.new(name);eb.head=point(*a);eb.tail=point(*b)
    if parent: eb.parent=arm_data.edit_bones[parent]
    return eb
bone('root',(0,0,-.5),(0,0,-.44))
bone('pelvis',(0,0,-.025),(0,0,.045),'root')
for i,(a,b) in enumerate([(.045,.115),(.115,.185),(.185,.255),(.255,.315)],1):
    bone('spine_0'+str(i),(0,0,a),(0,0,b),'pelvis' if i==1 else 'spine_0'+str(i-1))
bone('neck_01',(0,0,.315),(0,0,.34),'spine_04')
bone('neck_02',(0,0,.34),(0,0,.355),'neck_01')
bone('neck_03',(0,0,.355),(0,0,.37),'neck_02')
bone('head',(0,0,.37),(0,0,.49),'neck_03')
for side,s in [('r',-1),('l',1)]:
    wrist=.075 if side=='r' else .03
    bone('clavicle_'+side,(0,0,.285),(0,.12*s,.285),'spine_04')
    bone('upperarm_'+side,(0,.12*s,.285),(-.013,.16*s,.16),'clavicle_'+side)
    bone('lowerarm_'+side,(-.013,.16*s,.16),(.012,.185*s,wrist),'upperarm_'+side)
    hand=bone('hand_'+side,(.012,.185*s,wrist),(.035,.19*s,wrist-.055),'lowerarm_'+side)
    # Match Grip's +Z palm normal: both palms face inward in the hanging-arm rest.
    hand.align_roll(Vector((-s,0,0)))
    bone('thigh_'+side,(0,.073*s,-.02),(0,.095*s,-.235),'pelvis')
    bone('calf_'+side,(0,.095*s,-.235),(-.005,.125*s,-.445),'thigh_'+side)
    bone('foot_'+side,(-.005,.125*s,-.445),(.065,.125*s,-.48),'calf_'+side)
    bone('ball_'+side,(.065,.125*s,-.48),(.081,.125*s,-.48),'foot_'+side)
bpy.ops.object.mode_set(mode='OBJECT')
def smooth(lo,hi,x):
    t=max(0,min(1,(x-lo)/(hi-lo)));return t*t*(3-2*t)
def pair(a,b,t): return {a:1-t,b:t}
def weights(idx,p):
    z=p.z/1.85-.5
    if idx==28:return pair('spine_04','head',smooth(.29,.375,z))
    if idx in [0,2,15,23]:
        side='r' if idx in [0,23] else 'l'
        if z>-.08: return pair('thigh_'+side,'pelvis',smooth(-.08,.025,z))
        if z<-.40: return pair('calf_'+side,'foot_'+side,1-smooth(-.455,-.40,z))
        return pair('calf_'+side,'thigh_'+side,smooth(-.275,-.195,z))
    if idx in [3,5]:
        side='r' if idx==3 else 'l'
        return pair('lowerarm_'+side,'upperarm_'+side,smooth(.115,.20,z))
    rigid={7:'neck_02',8:'head',25:'head',11:'foot_l',17:'foot_r',12:'hand_l',21:'hand_r',27:'hand_r',10:'thigh_r',13:'thigh_l',15:'calf_l',23:'calf_r',9:'pelvis',22:'pelvis',14:'clavicle_l'}
    if idx in rigid: return {rigid[idx]:1}
    if idx==4:
        # Smooth continuous torso weights, shared by nearby soft equipment.
        centers=[(-.02,'pelvis'),(.07,'spine_01'),(.145,'spine_02'),(.22,'spine_03'),(.295,'spine_04')]
        for (lo,a),(hi,b) in zip(centers,centers[1:]):
            if z<=hi:return pair(a,b,smooth(lo,hi,z))
        return {'spine_04':1}
    return {'spine_02' if idx==20 else 'spine_03':1}
for idx,obj in meshes.items():
    for name in arm_data.bones.keys(): obj.vertex_groups.new(name=name)
    for v in obj.data.vertices:
        for name,w in weights(idx,v.co).items():
            if w>1e-5: obj.vertex_groups[name].add([v.index],w,'REPLACE')
    mod=obj.modifiers.new('Deform','ARMATURE');mod.object=arm;obj.parent=arm
# Keep the fitted straight-arm rest pose. Per-base pose offsets are data in operator/poses.json.
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True)
for obj in meshes.values():obj.select_set(True)
bpy.context.view_layer.objects.active=arm
os.makedirs(os.path.dirname(os.path.abspath(out)),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.abspath(out),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_image_format='JPEG')
print('GENERATED_RECON',sum(len(o.data.polygons) for o in meshes.values()),'triangles;',len(arm_data.bones),'bones')
