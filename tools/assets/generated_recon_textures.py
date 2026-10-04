"""Reproject the textured inbound Recon onto the modular low-poly body and preserve its complete face."""
import bpy, bmesh, math, os
from mathutils import Matrix, Vector


def load_reference(path):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(path))
    source=next(o for o in set(bpy.data.objects)-before if o.type=='MESH')
    # Both sources describe the same 1.85 m character, but the textured file has its scale applied on a node.
    matrix=source.matrix_world.copy()
    for v in source.data.vertices:
        p=matrix@v.co;v.co=Vector((p.y,-p.x,p.z+.925))
    source.matrix_world=Matrix.Identity(4);source.name='TextureReference'
    return source


def complete_head(reference, material):
    head=reference.copy();head.data=reference.data.copy();bpy.context.collection.objects.link(head)
    head.name='SK_GR_Hood'
    bm=bmesh.new();bm.from_mesh(head.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.000001,
                          plane_co=(0,0,1.565),plane_no=(0,0,1),clear_inner=True)
    # The original textured face includes eyelids/eye surface: do not cap the eye aperture from the split mesh.
    boundary=[e for e in bm.edges if e.is_boundary and all(abs(v.co.z-1.565)<.00001 for v in e.verts)]
    if boundary:bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
    bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free()
    bpy.context.view_layer.objects.active=head
    dec=head.modifiers.new('Face detail budget','DECIMATE');dec.ratio=min(1,4000/len(head.data.polygons))
    bpy.ops.object.modifier_apply(modifier=dec.name);head.data.validate();head.data.update()
    head.data.materials.clear();head.data.materials.append(material)
    face=material.copy();face.name='M_GR_Face';head.data.materials.append(face)
    for p in head.data.polygons:
        p.use_smooth=True
        center=sum((head.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
        # Keep eyes, skin and mask out of the hood's repaintable material zone.
        if abs(center.x)<.086 and center.y<-.045 and center.z<1.785:p.material_index=1
    return head


def bake(reference, meshes, output_dir):
    """One shared 2K atlas with separate material identities for independent equipment/colour zones."""
    targets=list(meshes.values())
    head=meshes[8]
    # Decimation retains the complete head's authored UVs. Sample those directly, avoiding rays
    # hitting the opposite eyelid or the mask behind a small facial fold.
    head.data.uv_layers.new(name='SourceUV',do_init=True)
    head.data.uv_layers.active_index=0
    source_image=next(n.image for n in reference.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
    for mat in head.data.materials:
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=source_image
        uv=mat.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map='SourceUV'
        mat.node_tree.links.new(uv.outputs['UV'],tex.inputs['Vector'])
        mat.node_tree.links.new(tex.outputs['Color'],mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    bpy.ops.object.select_all(action='DESELECT')
    for obj in targets:obj.select_set(True)
    bpy.context.view_layer.objects.active=targets[0]
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.008)
    bpy.ops.uv.average_islands_scale();bpy.ops.uv.pack_islands(margin=.008)
    bpy.ops.object.mode_set(mode='OBJECT')
    atlas=bpy.data.images.new('GeneratedRecon_Albedo',width=2048,height=2048,alpha=False)
    atlas.generated_color=(.15,.14,.11,1)
    materials={m for obj in targets for m in obj.data.materials}
    for mat in materials:
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas;mat.node_tree.nodes.active=tex
    # Join temporary copies so the entire atlas is baked in one selected-to-active pass.
    bpy.ops.object.select_all(action='DESELECT');copies=[]
    for obj in targets:
        if obj==head:continue
        copy=obj.copy();copy.data=obj.data.copy();bpy.context.collection.objects.link(copy);copy.select_set(True);copies.append(copy)
    bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();target=bpy.context.object
    reference.select_set(True);bpy.context.view_layer.objects.active=target
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1
    scene.render.bake.use_selected_to_active=True;scene.render.bake.use_clear=True
    scene.render.bake.cage_extrusion=.025;scene.render.bake.max_ray_distance=.06;scene.render.bake.margin=12
    scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
    bpy.ops.object.bake(type='DIFFUSE')
    bpy.ops.object.select_all(action='DESELECT');head.select_set(True);bpy.context.view_layer.objects.active=head
    scene.render.bake.use_selected_to_active=False;scene.render.bake.use_clear=False
    bpy.ops.object.bake(type='DIFFUSE')
    os.makedirs(output_dir,exist_ok=True)
    atlas.filepath_raw=os.path.join(output_dir,'generated-recon-albedo.jpg');atlas.file_format='JPEG';atlas.save();atlas.pack()
    for mat in materials:
        tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image==atlas)
        mat.node_tree.links.new(tex.outputs['Color'],mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    bpy.data.objects.remove(target,do_unlink=True)
    bpy.data.objects.remove(reference,do_unlink=True)
    return atlas
