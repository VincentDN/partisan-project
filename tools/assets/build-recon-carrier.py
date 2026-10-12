"""Author a closed lightweight plate carrier and removable placard against the Recon clothing fit."""
import bpy,bmesh,math,os,sys,json
import numpy as np
from mathutils.kdtree import KDTree
sys.path.insert(0,os.path.dirname(__file__))
import recon_foundation_geometry as geo

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('build/recon-carrier-body.glb'))
jacket=bpy.data.objects.get('SK_CM_Jacket');tree=KDTree(len(jacket.data.vertices));source_weights=[]
for v in jacket.data.vertices:
    tree.insert(jacket.matrix_world@v.co,v.index)
    source_weights.append({jacket.vertex_groups[g.group].name:g.weight for g in v.groups})
tree.balance()
for obj in list(bpy.context.scene.objects):bpy.data.objects.remove(obj,do_unlink=True)
arm=geo.skeleton();objects=[]
n=256;xx,yy=np.meshgrid(np.arange(n),np.arange(n));rng=np.random.default_rng(51)
grain=.92+.025*np.cos(xx*math.pi)+.02*np.cos(yy*math.pi/2)+rng.uniform(-.015,.015,(n,n))

def material(name,colour):
    m=bpy.data.materials.new(name);m.use_nodes=True
    pixels=np.ones((n,n,4),dtype=np.float32)
    pixels[:,:,:3]=grain[:,:,None]*np.array([int(colour[i:i+2],16)/255 for i in (1,3,5)])
    image=bpy.data.images.new(name+'_weave',width=n,height=n,alpha=False)
    image.pixels.foreach_set(pixels.ravel());image.filepath_raw=os.path.abspath('build/'+name+'.png')
    image.file_format='PNG';image.save();image.pack()
    shader=m.node_tree.nodes['Principled BSDF'];shader.inputs['Roughness'].default_value=.94
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    m.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color']);return m

fabric=material('M_CM_Carrier','#596047');web=material('M_CM_CarrierWebbing','#444b38')
trim=material('M_CM_CarrierHardware','#242923');panelmat=material('M_CM_Placard','#697052')

def solid(name,outline,depth,thickness,mat,side=1):
    # Outline in character X/height, curved across X to follow the chest instead of a flat box.
    verts=[(x,-side*(depth-.9*x*x+t),z) for t in (0,thickness) for x,z in outline]
    count=len(outline);faces=[tuple(reversed(range(count))),tuple(range(count,count*2))]
    faces.extend((i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count))
    obj=geo.mesh(name,verts,faces,mat);objects.append(obj);return obj

def ribbon(name,path,width,thickness,mat):
    # Path centre points in Blender coordinates; width is along X, thickness along local vertical.
    verts=[]
    for x,y,z in path:verts.extend([(x-width/2,y,z-thickness/2),(x+width/2,y,z-thickness/2),
                                  (x+width/2,y,z+thickness/2),(x-width/2,y,z+thickness/2)])
    faces=[(3,2,1,0)]
    for k in range(len(path)-1):
        for j in range(4):faces.append((k*4+j,k*4+(j+1)%4,(k+1)*4+(j+1)%4,(k+1)*4+j))
    faces.append(tuple(range(len(verts)-4,len(verts))))
    obj=geo.mesh(name,verts,faces,mat);objects.append(obj);return obj

outline=[(-.11,1.13),(.11,1.13),(.137,1.16),(.137,1.37),(.092,1.455),(-.092,1.455),(-.137,1.37),(-.137,1.16)]
for label,side in [('Front',1),('Rear',-1)]:
    solid('SK_LC_'+label,outline,.177,.026,fabric,side)
    # Upper hook-loop patch and lower reinforcement, each a complete thin volume.
    for tag,z,w,h in [('Patch',1.366,.076,.037),('Hem',1.144,.106,.009)]:
        solid('SK_LC_'+label+tag,[(-w,z),(w,z),(w,z+h),(-w,z+h)],.206,.0025,web,side)
    for row in range(3):
        z=1.20+row*.039
        for col in range(6):
            x=-.116+col*.039
            solid('SK_LC_'+label+'Web_'+str(row)+'_'+str(col),[(x,z),(x+.034,z),(x+.034,z+.012),(x,z+.012)],.207,.003,web,side)

for side in [-1,1]:
    suffix='L' if side>0 else 'R'
    ribbon('SK_LC_Shoulder_'+suffix,[(side*.102,-.173,1.428),(side*.137,-.11,1.497),
           (side*.145,0,1.522),(side*.137,.11,1.497),(side*.102,.173,1.428)],.042,.01,web)
    # Short shoulder pad is independent of the load-bearing strap.
    ribbon('SK_LC_Pad_'+suffix,[(side*.145,-.058,1.517),(side*.145,0,1.53),(side*.145,.058,1.517)],.050,.012,fabric)
    solid('SK_LC_Buckle_'+suffix,[(side*.102-.022,1.397),(side*.102+.022,1.397),
          (side*.102+.022,1.427),(side*.102-.022,1.427)],.193,.014,trim)
    # Closed curved side belt; three height rings follow the lower rib cage.
    verts=[];steps=8
    for extra in [0,.006]:
        for z,rx,ry in [(1.145,.198,.158),(1.171,.202,.163),(1.198,.207,.171)]:
            for k in range(steps+1):
                a=.66+(math.pi-1.32)*k/steps
                verts.append((side*(rx+extra+(.020 if side<0 else 0))*math.sin(a),-(ry+extra)*math.cos(a),1.145+(z-1.145)*(1-.5*math.sin(a)**8)))
    stride=steps+1;layer=stride*3;faces=[]
    for j in range(2):
        for k in range(steps):
            a=j*stride+k;faces.extend([(a,a+1,a+stride+1,a+stride),(a+layer,a+stride+layer,a+stride+1+layer,a+1+layer)])
    for k in range(steps):
        faces.extend([(k,k+layer,k+1+layer,k+1),(2*stride+k,2*stride+k+1,2*stride+k+1+layer,2*stride+k+layer)])
    for j in range(2):
        for k in [0,steps]:
            a=j*stride+k;faces.append((a,a+stride,a+stride+layer,a+layer))
    obj=geo.mesh('SK_LC_Cummerbund_'+suffix,verts,faces,fabric);objects.append(obj)

solid('SK_LC_Placard',[(-.118,1.155),(.118,1.155),(.125,1.168),(.125,1.30),(-.125,1.30),(-.125,1.168)],.219,.009,panelmat)
for row in range(3):
    for col in range(6):
        x=-.116+col*.039;z=1.176+row*.039
        solid('SK_LC_PlacardWeb_'+str(row)+'_'+str(col),[(x,z),(x+.034,z),(x+.034,z+.012),(x,z+.012)],.229,.003,web)

# Merge repeated sewing/webbing pieces into the same selectable module, retaining material groups.
for prefix in ['Front','Rear','Placard']:
    group=[o for o in objects if o.name.startswith('SK_LC_'+prefix)]
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join()
    objects=[o for o in objects if o not in group]+[group[0]]

report={'version':1,'fitProfile':'recon-standard','skeletonId':'recon-v1','meshes':[]}
for obj in objects:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
    for uv in obj.data.uv_layers.active.data:uv.uv*=3
    # Match the fitted jacket's deformation, including its smoothed shoulder/chest blends.
    for name in arm.data.bones.keys():obj.vertex_groups.new(name=name)
    for v in obj.data.vertices:
        weights={}
        nearest=tree.find_n(v.co,4)
        for co,index,distance in nearest:
            factor=1/max(.004,distance)**4
            for name,w in source_weights[index].items():weights[name]=weights.get(name,0)+w*factor
        weights={name:w for name,w in weights.items() if name=='pelvis' or name.startswith('spine_')}
        if 'Cummerbund' in obj.name:weights=geo.weights('carrier',v.co)
        weights=dict(sorted(weights.items(),key=lambda p:p[1],reverse=True)[:4]);total=sum(weights.values())
        for name,w in weights.items():
            if w>1e-6:obj.vertex_groups[name].add([v.index],w/total,'REPLACE')
    mod=obj.modifiers.new('Recon carrier deform','ARMATURE');mod.object=arm;obj.parent=arm
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=list(bm.faces))
    report['meshes'].append({'node':obj.name,'triangles':len(bm.faces),'boundaryEdges':sum(e.is_boundary for e in bm.edges)})
    bm.free()
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True)
for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('build/recon-carrier.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.abspath('build/recon-carrier.raw.glb'),export_format='GLB',use_selection=True,export_animations=False)
with open('build/recon-carrier-report.json','w') as f:json.dump(report,f,indent=1)
