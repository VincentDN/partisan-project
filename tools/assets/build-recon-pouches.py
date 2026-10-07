"""Author three closed, textured pouch templates in mount-local metres (+Y up, +Z outward in GLTF)."""
import bpy,bmesh,math,os,sys,json
import numpy as np
from mathutils import Vector
sys.path.insert(0,os.path.dirname(__file__))
import recon_foundation_geometry as geo
bpy.ops.wm.read_factory_settings(use_empty=True)
os.makedirs('build',exist_ok=True)
n=128;xx,yy=np.meshgrid(np.arange(n),np.arange(n))
grain=.94+.025*np.cos(xx*math.pi)+.018*np.cos(yy*math.pi/2)
def material(name,colour):
    m=bpy.data.materials.new(name);m.use_nodes=True
    pixels=np.ones((n,n,4),dtype=np.float32);pixels[:,:,:3]=grain[:,:,None]*np.array(colour)
    image=bpy.data.images.new(name+'_weave',width=n,height=n,alpha=False)
    image.pixels.foreach_set(pixels.ravel());image.filepath_raw=os.path.abspath('build/'+name+'.png')
    image.file_format='PNG';image.save();image.pack()
    shader=m.node_tree.nodes['Principled BSDF'];shader.inputs['Roughness'].default_value=.94
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    m.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color']);return m
fabric=material('M_CM_Pouches',[.34,.38,.26]);trim=material('M_CM_PouchTrim',[.23,.27,.19])
hard=material('M_CM_Radio',[.07,.085,.065]);metal=material('M_CM_Magazine',[.16,.18,.14])
objects=[]
def box(name,centre,size,mat,bevel=.003):
    x,y,z=centre;w,h,d=size
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=name
    o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft sewn edges','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(mat);objects.append(o);return o
def tube(name,points,radius,mat):
    verts=[];faces=[];steps=6
    path=[Vector((x,-z,y)) for x,y,z in points]
    for i,p in enumerate(path):
        tangent=(path[min(i+1,len(path)-1)]-path[max(0,i-1)]).normalized()
        side=tangent.cross(Vector((1,0,0))).normalized();up=tangent.cross(side).normalized()
        for k in range(steps):verts.append(p+radius*(math.cos(k*math.tau/steps)*side+math.sin(k*math.tau/steps)*up))
    faces.append(tuple(reversed(range(steps))))
    for i in range(len(path)-1):
        for k in range(steps):faces.append((i*steps+k,i*steps+(k+1)%steps,(i+1)*steps+(k+1)%steps,(i+1)*steps+k))
    faces.append(tuple(range(len(verts)-steps,len(verts))))
    o=geo.mesh(name,verts,faces,mat);objects.append(o)
report=[]
for kind in ['magazine','utility','radio']:
    objects=[];cx=.0195
    if kind=='magazine':
        box('Sleeve',(cx,.051,.020),(.066,.102,.032),fabric)
        box('Magazine',(cx,.107,.018),(.048,.051,.021),metal,.002)
        for x in [cx-.022,cx+.022]:box('Reinforcement',(x,.046,.038),(.007,.086,.003),trim,.001)
        tube('Retention',[(cx-.022,.1,.035),(cx-.015,.135,.027),(cx+.015,.135,.027),(cx+.022,.1,.035)],.002,trim)
        box('Pull tab',(cx,.116,.037),(.016,.028,.004),trim,.001)
    elif kind=='utility':
        box('Bag',(cx,.046,.024),(.070,.092,.040),fabric,.006)
        box('Lid',(cx,.087,.026),(.071,.019,.043),trim,.004)
        box('Zip',(cx,.089,.049),(.057,.003,.002),hard,.0005)
        box('Pull',(cx+.021,.08,.051),(.005,.018,.003),hard,.001)
        box('Patch',(cx,.049,.046),(.045,.024,.003),trim,.001)
    else:
        box('Radio body',(cx,.079,.023),(.049,.139,.031),hard,.004)
        box('Pouch',(cx,.048,.024),(.065,.096,.038),fabric,.003)
        box('Strap',(cx,.067,.045),(.014,.094,.004),trim,.001)
        box('Buckle',(cx,.096,.049),(.023,.015,.005),hard,.001)
        box('Display',(cx,.127,.040),(.030,.016,.002),metal,.001)
        tube('Antenna',[(cx-.018,.145,.02),(cx-.018,.206,.02),(cx-.012,.247,.018)],.0025,hard)
        box('Knob',(cx+.015,.153,.02),(.01,.016,.01),hard,.001)
        tube('Owned cable',[(cx+.022,.141,.02),(cx+.03,.159,.026),(cx+.03,.181,.034),(cx+.016,.195,.04),
                            (cx-.001,.186,.044),(cx-.005,.159,.048),(cx+.009,.126,.05)],.002,hard)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();obj=objects[0];obj.name='Pouch_'+kind
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.triangulate(bm,faces=list(bm.faces))
    report.append({'node':obj.name,'triangles':len(bm.faces),'boundaryEdges':sum(e.is_boundary for e in bm.edges)})
    bm.free()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('build/recon-pouches.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.abspath('build/recon-pouches.raw.glb'),export_format='GLB',use_selection=True,export_animations=False)
with open('build/recon-pouches-report.json','w') as f:json.dump(report,f,indent=1)
