"""Build the CM2 clean Recon clothing on the fixed v1 skeleton; head and gloves remain CM3 placeholders."""
import bpy,bmesh,os,sys,json,math
import numpy as np
from mathutils import Matrix
sys.path.insert(0,os.path.dirname(__file__))
import recon_foundation_geometry as geo

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath('build/recon-baseline.glb'))
retained=['Hood','Glove_L','Glove_R','Boot_L','Boot_R','Trousers_L','Trousers_R','Sleeve_L','Sleeve_R','Cuff_R']
objects=[]
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH' or obj.name.removeprefix('SK_GR_') not in retained:continue
    matrix=obj.matrix_world.copy()
    for v in obj.data.vertices:v.co=matrix@v.co
    obj.parent=None;obj.matrix_world=Matrix.Identity(4);obj.modifiers.clear();obj.vertex_groups.clear()
    obj.name=obj.name.replace('SK_GR_','SK_CM_');objects.append(obj)
for obj in list(bpy.context.scene.objects):
    if obj not in objects:bpy.data.objects.remove(obj,do_unlink=True)

# A deterministic, seamless woven albedo. No projection from the equipped source is used for clothing.
n=256;xx,yy=np.meshgrid(np.arange(n),np.arange(n));rng=np.random.default_rng(27)
grain=.84+.012*np.cos(xx*math.pi/2)+.012*np.cos(yy*math.pi/2)+rng.uniform(-.012,.012,(n,n))
pixels=np.ones((n,n,4),dtype=np.float32);pixels[:,:,:3]=grain[:,:,None]
fabric=bpy.data.images.new('CM_CleanFabric',width=n,height=n,alpha=False)
fabric.pixels.foreach_set(pixels.ravel());fabric.filepath_raw=os.path.abspath('build/recon-clean-fabric.png')
fabric.file_format='PNG';fabric.save();fabric.pack()

def material(name,color):
    m=bpy.data.materials.new(name);m.use_nodes=True
    rgb=tuple((int(color[i:i+2],16)/255)**2.2 for i in (1,3,5))+(1,)
    shader=m.node_tree.nodes['Principled BSDF'];shader.inputs['Roughness'].default_value=.94
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=fabric
    # Bake colour into separate image pixels so the exporter can emit standard glTF textures.
    tint=fabric.copy();tint.name=name+'_Albedo'
    data=pixels.copy();data[:,:,:3]*=np.array([int(color[i:i+2],16)/255 for i in (1,3,5)])
    tint.pixels.foreach_set(data.ravel());tint.filepath_raw=os.path.abspath('build/'+name+'.png');tint.file_format='PNG';tint.save();tint.pack()
    tex.image=tint;m.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    m.diffuse_color=rgb;return m

cloth=material('M_CM_Jacket','#7b806b');pants=material('M_CM_Trousers','#646a55')
trim=material('M_CM_Seams','#5b604f');collar=material('M_CM_Neck','#4f5847')
for obj in objects:
    if not any(s in obj.name for s in ['Trousers','Sleeve','Cuff']):continue
    # Positional welding removes texture seam duplicates before the low-poly clothing reduction.
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    boundary=[e for e in bm.edges if e.is_boundary]
    if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    bpy.context.view_layer.objects.active=obj
    if 'Trousers' in obj.name:
        volume=obj.modifiers.new('Complete trouser surface','REMESH');volume.mode='VOXEL';volume.voxel_size=.003
        bpy.ops.object.modifier_apply(modifier=volume.name)
        # Discard disconnected cap debris before decimation; tiny islands otherwise collapse into duplicate faces.
        bm=bmesh.new();bm.from_mesh(obj.data);remaining=set(bm.verts);islands=[]
        while remaining:
            seed=remaining.pop();island={seed};pending=[seed]
            while pending:
                for edge in pending.pop().link_edges:
                    for vertex in edge.verts:
                        if vertex in remaining:remaining.remove(vertex);island.add(vertex);pending.append(vertex)
            islands.append(island)
        keep=max(islands,key=len)
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if v not in keep],context='VERTS')
        bm.to_mesh(obj.data);bm.free()
    obj.data.calc_loop_triangles()
    target=650 if 'Trousers' in obj.name else 310 if 'Sleeve' in obj.name else 90
    dec=obj.modifiers.new('Clothing silhouette budget','DECIMATE');dec.ratio=min(1,target/len(obj.data.loop_triangles))
    bpy.ops.object.modifier_apply(modifier=dec.name)
    obj.data.materials.clear();obj.data.materials.append(pants if 'Trousers' in obj.name else cloth)
    for p in obj.data.polygons:p.material_index=0;p.use_smooth=True

shell=geo.jacket(cloth)
# Union the sleeve roots into a continuous jacket, then solve smooth shoulder weights below.
# This removes the source's isolated shoulder caps and internal occlusion surfaces.
join=[shell,*[o for o in objects if 'Sleeve' in o.name]]
objects=[o for o in objects if 'Sleeve' not in o.name]
bpy.ops.object.select_all(action='DESELECT')
for obj in join:obj.select_set(True)
bpy.context.view_layer.objects.active=shell;bpy.ops.object.join()
remesh=shell.modifiers.new('Continuous sewn shoulders','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.004
bpy.ops.object.modifier_apply(modifier=remesh.name)
shell.data.calc_loop_triangles()
dec=shell.modifiers.new('Field jacket topology budget','DECIMATE');dec.ratio=1300/len(shell.data.loop_triangles)
bpy.ops.object.modifier_apply(modifier=dec.name)
objects.extend([shell,geo.waist(pants),geo.neck(collar),*geo.details(cloth,trim)])
# Decimation and the prior quantized source can leave collapsed sliver faces; repair after reduction.
for obj in objects:
    if not any(s in obj.name for s in ['Trousers','Boot','Cuff']):continue
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.003 if 'Boot' in obj.name else .00001)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    # Source hole-filling left tiny triangle fins attached to an otherwise closed surface.
    fins=[f for f in bm.faces if sum(e.is_boundary for e in f.edges)>=2 and any(len(e.link_faces)>2 for e in f.edges)]
    if fins:bmesh.ops.delete(bm,geom=fins,context='FACES')
    bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.00001)
    boundary=[e for e in bm.edges if e.is_boundary]
    if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
# Clean per-piece UVs expose only cloth. Source head, glove and boot UVs remain untouched.
for obj in objects:
    if any(s in obj.name for s in ['Hood','Glove','Boot']):continue
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
    for uv in obj.data.uv_layers.active.data:uv.uv*=4
    for p in obj.data.polygons:p.use_smooth=True

bpy.ops.object.select_all(action='DESELECT');arm=geo.skeleton()
for obj in objects:
    for name in arm.data.bones.keys():obj.vertex_groups.new(name=name)
    for v in obj.data.vertices:
        for name,w in geo.weights(obj.name,v.co).items():
            if w>1e-6:obj.vertex_groups[name].add([v.index],w,'REPLACE')
    mod=obj.modifiers.new('Recon v1 deform','ARMATURE');mod.object=arm;obj.parent=arm

# Heat weights distribute shoulder movement along the continuous garment instead of a coordinate cutoff.
shell.modifiers.clear();shell.vertex_groups.clear()
for bone in arm.data.bones:
    bone.use_deform=bone.name=='pelvis' or bone.name.startswith(('spine_','clavicle_','upperarm_','lowerarm_','hand_'))
bpy.ops.object.select_all(action='DESELECT');shell.select_set(True);arm.select_set(True)
bpy.context.view_layer.objects.active=arm;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
for bone in arm.data.bones:bone.use_deform=True
# Lock the sleeve rims to their wrist frames, blending into the heat-weighted forearms.
# Heat weights alone leave the right cuff behind when the pistol-grip hand rolls.
for vertex in shell.data.vertices:
    if abs(vertex.co.x)<.25:continue
    side='r' if vertex.co.x<0 else 'l'
    rim=1.095 if side=='r' else 1.012
    follow=1-geo.smooth(rim,rim+.11,vertex.co.z)
    if follow<=0:continue
    hand=shell.vertex_groups['hand_'+side]
    weights={group.group:group.weight*(1-follow) for group in vertex.groups}
    weights[hand.index]=weights.get(hand.index,0)+follow
    for index,weight in weights.items():shell.vertex_groups[index].add([vertex.index],weight,'REPLACE')
bpy.context.view_layer.objects.active=shell;arm.select_set(False)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL',limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL',lock_active=False)

# Record position-welded topology and rest-space join spans for automated acceptance.
report={'version':1,'skeleton':'recon-v1','stage':'CM2 clothing foundation','placeholders':['head/hood/mask','fixed-finger gloves'],
        'clothTexture':'Fresh deterministic woven albedo; no equipped-source projection','meshes':[]}
for obj in objects:
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    report['meshes'].append({'name':obj.name,'triangles':len(bm.faces),'boundaryEdges':sum(e.is_boundary for e in bm.edges),
        'bounds':{'min':[min(v.co[i] for v in bm.verts) for i in range(3)],'max':[max(v.co[i] for v in bm.verts) for i in range(3)]}})
    bm.free()
report['triangles']=sum(m['triangles'] for m in report['meshes'])
with open('build/recon-foundation-report.json','w') as f:json.dump(report,f,indent=1)
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True)
for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('build/recon-foundation.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.abspath('build/recon-foundation.raw.glb'),export_format='GLB',use_selection=True,
                          export_animations=False,export_yup=True,export_image_format='AUTO')
print('RECON_FOUNDATION',report['triangles'],'triangles')
